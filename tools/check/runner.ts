/**
 * 検査の実行と gate.json の書き出し。
 *
 * 系統は互いに独立なので同時に走らせる。直列だと系統が増えるほど遅くなり、
 * やがて誰も走らせなくなる。そこが検査の死ぬ場所なので最初から並列で組む。
 *
 * 系統が例外を投げたら `<接頭辞>-X` の不合格にする。移植元の gas.py は未束縛の変数で
 * 検査ごと落ち、逆テストはそれを「どの検査も反応せず」と読んで、すり抜けと誤診した。
 * 落ちた検査は歯が無いのではなく動いていない。その2つを取り違えない。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Context } from './context.js';
import { computeDigest } from './digest.js';
import type { FamilyEntry, FamilyModule } from './families/index.js';
import { vacuous, type Failure, type Result } from './result.js';

export const SCHEMA = 1;
export const GATE_PATH = '.state/gate.json';

/** 系統1本ぶんの報告。 */
export interface FamilyReport {
  title: string;
  status: 'green' | 'red';
  failures: Failure[];
  warnings: string[];
  notes: string[];
  /** 結果名ごとの surveyed */
  surveyed: Record<string, Record<string, number>>;
  /** 素通りになった結果名 */
  vacuous: string[];
  /** 所要ミリ秒 */
  ms: number;
}

/** 1回の実行の報告。`--json` で出し、gate.json に書く。 */
export interface Report {
  schema: number;
  generatedAt: string;
  root: string;
  mode: string;
  status: 'green' | 'red';
  families: Record<string, FamilyReport>;
  digest: string;
  files: number;
}

/**
 * 例外を1行の説明にする。
 * @param e 投げられた値
 * @returns 例外の名前と本文、分かれば投げた場所
 */
export function describeError(e: unknown): string {
  if (e instanceof Error) {
    const at = e.stack?.split('\n').find((l) => l.trim().startsWith('at '))?.trim();
    return `${e.name}: ${e.message}${at !== undefined ? `（${at}）` : ''}`;
  }
  return String(e);
}

/**
 * 系統1本を読み込んで走らせる。読み込みでも実行でも、落ちたら `<接頭辞>-X` にする。
 * @param entry 一覧の行
 * @param ctx 文脈
 * @param mod 読み込み済みならそのモジュール
 * @returns 系統の報告
 */
async function runOne(entry: FamilyEntry, ctx: Context, mod: FamilyModule | Error): Promise<FamilyReport> {
  const started = Date.now();
  let title = entry.id;
  let results: Result[];
  try {
    if (mod instanceof Error) throw mod;
    title = mod.TITLE;
    results = await mod.run(ctx);
  } catch (e) {
    results = [
      {
        check: entry.prefix,
        failures: [
          {
            check: `${entry.prefix}-X`,
            message: '検査自体が落ちました。歯が無いのではなく、動いていません',
            where: `tools/check/families/${entry.id}.ts`,
            remedy: describeError(e),
          },
        ],
        surveyed: {},
        warnings: [],
        notes: [],
      },
    ];
  }

  const failures = results.flatMap((r) => r.failures);
  const vac = results.filter(vacuous).map((r) => r.check);
  // 対象が0件のまま緑になっている結果は、検査が働いた結果ではない
  for (const c of vac) {
    const r = results.find((x) => x.check === c);
    failures.push({
      check: 'LOOP-3',
      message: `${c} は対象0件（${r?.primary ?? '?'}）のまま合格しています。素通りです`,
      where: `tools/check/families/${entry.id}.ts`,
      remedy: '検査対象の指定が間違っているか、対象がまだ存在しません。',
    });
  }
  return {
    title,
    status: failures.length > 0 ? 'red' : 'green',
    failures,
    warnings: results.flatMap((r) => r.warnings),
    notes: results.flatMap((r) => r.notes),
    surveyed: Object.fromEntries(results.map((r) => [r.check, r.surveyed])),
    vacuous: vac,
    ms: Date.now() - started,
  };
}

/**
 * 系統を読み込む。失敗は例外として返し、ここでは投げない。
 * @param entry 一覧の行
 * @returns モジュールか、読み込みの失敗
 */
export async function loadFamily(entry: FamilyEntry): Promise<FamilyModule | Error> {
  try {
    return await entry.load();
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e));
  }
}

/**
 * 選んだ系統を並列に走らせて報告を作る。
 * @param ctx 文脈
 * @param entries 走らせる系統
 * @param mode 報告に残す実行の種類（`fast` `all` `only:sec` など）
 * @param loaded 読み込み済みのモジュール（省略時はここで読む）
 * @returns 実行の報告
 */
export async function runFamilies(
  ctx: Context,
  entries: readonly FamilyEntry[],
  mode: string,
  loaded?: ReadonlyMap<string, FamilyModule | Error>,
): Promise<Report> {
  const reports = await Promise.all(
    entries.map(async (e) => [e.id, await runOne(e, ctx, loaded?.get(e.id) ?? (await loadFamily(e)))] as const),
  );
  const families = Object.fromEntries(reports);
  const { digest, files } = await computeDigest(ctx.root);
  return {
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    root: ctx.root,
    mode,
    status: reports.some(([, r]) => r.status === 'red') ? 'red' : 'green',
    families,
    digest,
    files,
  };
}

/**
 * 部分実行でも過去の系統の結果を消さずに gate.json を更新する。
 * ダイジェストは今回の値で上書きするので、古い系統の結果は古いと読める。
 * @param ctx 文脈
 * @param report 今回の報告
 */
export async function writeGate(ctx: Context, report: Report): Promise<void> {
  const p = ctx.path(GATE_PATH);
  let prev: Record<string, FamilyReport> = {};
  try {
    const raw: unknown = JSON.parse(await readFile(p, 'utf8'));
    if (typeof raw === 'object' && raw !== null && 'families' in raw) {
      prev = (raw as { families: Record<string, FamilyReport> }).families;
    }
  } catch {
    prev = {};
  }
  const families = { ...prev, ...report.families };
  const merged: Report = {
    ...report,
    families,
    status: Object.values(families).some((f) => f.status === 'red') ? 'red' : 'green',
  };
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
}

/**
 * 人が読む表にする。
 * @param report 実行の報告
 * @returns 端末に出す文字列
 */
export function renderHuman(report: Report): string {
  const lines: string[] = [];
  lines.push(`検査 ${report.mode}  ${report.digest.slice(0, 19)}  ファイル ${report.files}`);
  lines.push('-'.repeat(74));
  for (const [id, f] of Object.entries(report.families)) {
    const mark = f.status === 'green' ? '○' : '×';
    const seen = Object.entries(f.surveyed)
      .map(([k, v]) => `${k}: ${Object.entries(v).map(([a, b]) => `${a} ${b}`).join(' / ')}`)
      .join('  ');
    lines.push(`${mark} ${id.padEnd(8)} ${f.title}  不合格 ${f.failures.length}  ${f.ms}ms`);
    if (seen !== '') lines.push(`    ${seen}`);
    for (const x of f.failures) {
      lines.push(`    ${x.check}  ${x.message}${x.where !== undefined ? `  (${x.where})` : ''}`);
      if (x.remedy !== undefined) lines.push(`      → ${x.remedy}`);
    }
    for (const w of f.warnings) lines.push(`    注意  ${w}`);
    for (const n of f.notes) lines.push(`    注記  ${n}`);
  }
  lines.push('-'.repeat(74));
  lines.push(report.status === 'green' ? '緑です。' : '赤です。→ の直し方を見てください。');
  return lines.join('\n');
}
