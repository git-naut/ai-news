/**
 * 検査の入口。`pnpm check` から呼ぶ。
 *
 *   pnpm check                 fast の系統だけ
 *   pnpm check --all           全系統
 *   pnpm check --only sec,loop 指定した系統だけ
 *   pnpm check --mutate -j 8   逆テスト
 *
 * 付けられるもの: --json（報告を JSON で標準出力へ）、--no-write（.state/gate.json を書かない）。
 * 終了コードは 0 が緑、1 が赤、2 が使い方の誤り。
 *
 * --mutate と検査は同時に走らせない。1回の呼び出しで両方を指定したら 2 で止め、
 * 別プロセスで逆テストが走っているあいだの書き込みつき検査も 2 で止める。
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeContext } from './context.js';
import { FAMILIES, findFamily, type FamilyEntry, type FamilyModule } from './families/index.js';
import { renderMutate, runMutate, runningMutate } from './mutate.js';
import { loadFamily, renderHuman, runFamilies, writeGate } from './runner.js';

/** 解釈した引数。 */
interface Args {
  all: boolean;
  only: string[] | null;
  json: boolean;
  write: boolean;
  mutate: boolean;
  jobs: number;
}

/** 使い方の誤り。終了コード 2 にする。 */
class UsageError extends Error {}

const USAGE = 'usage: pnpm check [--all | --only a,b] [--json] [--no-write] | pnpm check --mutate [-j N] [--json]';

/**
 * 引数を解釈する。
 * @param argv process.argv.slice(2)
 * @returns 解釈した引数
 */
function parseArgs(argv: readonly string[]): Args {
  const a: Args = { all: false, only: null, json: false, write: true, mutate: false, jobs: 0 };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    switch (v) {
      case '--all':
        a.all = true;
        break;
      case '--json':
        a.json = true;
        break;
      case '--no-write':
        a.write = false;
        break;
      case '--mutate':
        a.mutate = true;
        break;
      case '--only': {
        const next = argv[++i];
        if (next === undefined || next.startsWith('-')) throw new UsageError('--only には系統 ID を渡します');
        a.only = next.split(',').filter((s) => s !== '');
        break;
      }
      case '-j':
      case '--jobs': {
        const n = Number(argv[++i]);
        if (!Number.isInteger(n) || n < 1) throw new UsageError('-j には 1 以上の整数を渡します');
        a.jobs = n;
        break;
      }
      case '--':
        break;
      default:
        throw new UsageError(`知らない引数です: ${String(v)}`);
    }
  }
  if (a.mutate && (a.all || a.only !== null)) {
    throw new UsageError('--mutate と --all / --only は同時に指定しません。検査と逆テストは別々に回します');
  }
  if (a.all && a.only !== null) throw new UsageError('--all と --only は同時に指定しません');
  return a;
}

/**
 * 入口の本体。
 * @returns 終了コード
 */
async function main(): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    if (e instanceof UsageError) {
      console.error(e.message);
      console.error(USAGE);
      return 2;
    }
    throw e;
  }

  // root はこのファイルの位置から決める。サンドボックスでは複製された側が root になる
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const ctx = makeContext(root);

  if (args.mutate) {
    const report = await runMutate(ctx, args.jobs, (s) => {
      if (!args.json) console.log(s);
    });
    console.log(args.json ? JSON.stringify(report, null, 2) : renderMutate(report));
    return report.status === 'green' ? 0 : 1;
  }

  if (args.write) {
    const pid = await runningMutate(root);
    if (pid !== null) {
      console.error(`逆テスト（pid ${pid}）が走っています。終わってから回すか、--no-write を付けてください。`);
      return 2;
    }
  }

  let entries: FamilyEntry[];
  const loaded = new Map<string, FamilyModule | Error>();
  let mode: string;
  if (args.only !== null) {
    const missing = args.only.filter((id) => findFamily(id) === undefined);
    if (missing.length > 0) {
      console.error(`知らない系統です: ${missing.join(', ')}（あるのは ${FAMILIES.map((f) => f.id).join(', ')}）`);
      return 2;
    }
    entries = FAMILIES.filter((f) => args.only?.includes(f.id) === true);
    mode = `only:${args.only.join(',')}`;
  } else {
    await Promise.all(FAMILIES.map(async (f) => loaded.set(f.id, await loadFamily(f))));
    // 読み込めなかった系統は速さが分からないので、既定の実行にも入れて -X を出させる
    entries = args.all ? [...FAMILIES] : FAMILIES.filter((f) => {
      const m = loaded.get(f.id);
      return m instanceof Error || m?.speed === 'fast';
    });
    mode = args.all ? 'all' : 'fast';
  }

  const report = await runFamilies(ctx, entries, mode, loaded);
  if (args.write) await writeGate(ctx, report);
  console.log(args.json ? JSON.stringify(report, null, 2) : renderHuman(report));
  return report.status === 'green' ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e: unknown) => {
    console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
    // 2 は使い方の誤りに取ってある。検査そのものが落ちたら 3 にし、逆テストは error と読む
    process.exitCode = 3;
  },
);
