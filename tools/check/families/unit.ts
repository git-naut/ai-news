/**
 * unit 系統 — vitest と tsc。
 *
 * ソースのバグ修正は vitest のテストで守る。逆テストでソースに変異を入れたとき、
 * そのテストが本当に落ちるかをここで数える。vitest の終了コードではなく、落ちたテストの
 * 件数を不合格として返すので、増分判定がそのまま使える。
 * 遅い（1 回 10 秒前後）ので slow 系統にする。`pnpm check --all` で回る。
 */

import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Context } from '../context.js';
import { isRecord } from '../context.js';
import { makeResult, type Failure, type Result } from '../result.js';

export const ID = 'unit';
export const TITLE = 'テストと型';
export const speed = 'slow' as const;

/** tsc をかけるプロジェクト。package.json の typecheck と同じ範囲に tests を足したもの。 */
const TS_PROJECTS = ['tsconfig.json', 'tools/check/tsconfig.json', 'tests/tsconfig.json'];

/**
 * node でスクリプトを起動し、終了コードと出力を返す。
 * @param cwd 作業ディレクトリ
 * @param args node に渡す引数
 * @returns 終了コードと標準出力・標準エラー
 */
function node(cwd: string, args: string[]): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.setEncoding('utf8').on('data', (d: string) => (out += d));
    child.stderr.setEncoding('utf8').on('data', (d: string) => (out += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), 240_000);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, out });
    });
  });
}

/**
 * vitest を JSON で走らせ、落ちたテストを不合格にする。
 * @param root 作業ツリー
 * @returns 不合格と、見たテストの件数
 */
async function vitest(root: string): Promise<{ failures: Failure[]; total: number; files: number }> {
  const outFile = join(await mkdtemp(join(tmpdir(), 'unit-')), 'vitest.json');
  const { code, out } = await node(root, [
    'node_modules/vitest/vitest.mjs',
    'run',
    '--reporter=json',
    `--outputFile=${outFile}`,
  ]);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(outFile, 'utf8'));
  } catch {
    // JSON が出ないのは vitest 自体が起動していない。0 件の緑に見せず系統ごと落とす
    throw new Error(`vitest の結果を読めません（exit ${String(code)}）: ${out.trim().slice(-300)}`);
  }
  if (!isRecord(raw)) throw new Error('vitest の結果の形が違います');
  const failures: Failure[] = [];
  const results = Array.isArray(raw['testResults']) ? raw['testResults'].filter(isRecord) : [];
  for (const file of results) {
    const name = String(file['name'] ?? '').replace(`${root}/`, '');
    const asserts = Array.isArray(file['assertionResults']) ? file['assertionResults'].filter(isRecord) : [];
    const failed = asserts.filter((a) => a['status'] === 'failed');
    for (const a of failed) {
      const msgs = Array.isArray(a['failureMessages']) ? a['failureMessages'] : [];
      failures.push({
        check: 'UNIT-1',
        message: `${String(a['fullName'] ?? a['title'] ?? '')}: ${String(msgs[0] ?? '').split('\n')[0]}`,
        where: name,
      });
    }
    // 読み込みで落ちたファイルは assertion が 0 件のまま failed になる
    if (file['status'] === 'failed' && failed.length === 0) {
      failures.push({
        check: 'UNIT-1',
        message: `テストファイルが読み込めません: ${String(file['message'] ?? '').split('\n')[0]}`,
        where: name,
      });
    }
  }
  const total = typeof raw['numTotalTests'] === 'number' ? raw['numTotalTests'] : 0;
  return { failures, total, files: results.length };
}

/**
 * tsc をプロジェクトごとに走らせ、エラー1件を不合格1件にする。
 * @param ctx 文脈
 * @returns 不合格と、かけたプロジェクトの数
 */
async function tsc(ctx: Context): Promise<{ failures: Failure[]; projects: number }> {
  const failures: Failure[] = [];
  let projects = 0;
  for (const p of TS_PROJECTS) {
    if (!ctx.exists(p)) {
      failures.push({ check: 'UNIT-2', message: `${p} がありません`, where: p });
      continue;
    }
    projects++;
    const { code, out } = await node(ctx.root, ['node_modules/typescript/bin/tsc', '--noEmit', '-p', p]);
    const errors = out.split('\n').filter((l) => /error TS\d+:/.test(l));
    for (const line of errors) failures.push({ check: 'UNIT-2', message: line.trim(), where: p });
    if (code !== 0 && errors.length === 0) {
      failures.push({ check: 'UNIT-2', message: `tsc が exit ${String(code)} で終わりました: ${out.trim().slice(-200)}`, where: p });
    }
  }
  return { failures, projects };
}

/**
 * テストと型を調べる。
 * @param ctx 作業ツリーを読むための文脈
 * @returns UNIT-1 と UNIT-2 の結果
 */
export async function run(ctx: Context): Promise<Result[]> {
  const [v, t] = await Promise.all([vitest(ctx.root), tsc(ctx)]);
  return [
    makeResult({ check: 'UNIT-1', failures: v.failures, surveyed: { テスト: v.total, ファイル: v.files }, primary: 'テスト' }),
    makeResult({ check: 'UNIT-2', failures: t.failures, surveyed: { プロジェクト: t.projects }, primary: 'プロジェクト' }),
  ];
}
