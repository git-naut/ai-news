/**
 * 逆テスト — 検査に歯があるかを、わざと壊して確かめる。
 *
 * 判定は合否ではなく「基準実行からの不合格件数の増分」で見る。土台にもともと
 * 不合格があっても判定が狂わない。ただし、狙いの検査が基準で既に赤いと増分 0 に
 * 見えることがある（同じ場所を指す不合格は1件にまとまる検査がある）。すり抜けが
 * 出たら、まず基準を疑う。報告の reason に基準の件数を添えるのはそのため。
 *
 * 判定は5つ。
 *   caught          期待した検査が増えた。NONE の変異なら、どの検査も増えなかった
 *   escaped         期待した検査が増えなかった
 *   false_positive  NONE の変異で、どれかの検査が増えた（検査が過敏）
 *   na              変異を当てる対象が無かった。捕捉にもすり抜けにも数えない
 *   error           変異の適用か検査の実行が落ちた。すり抜けと混ぜない
 *
 * サンドボックスは os.tmpdir() の下に作る。/mnt/c の下に作ると複製が遅く、
 * 変異ごとの作り直しが所要の大半になる。作業ツリー本体は書き換えない。
 *
 * `pnpm check --all` と同時に走らせない。どちらも .state/ に書き、loop 系統は
 * 書きかけの gaps.json を読むことになる。.state/mutate.lock で相互に拒否する。
 */

import { spawn } from 'node:child_process';
import { cpus, tmpdir } from 'node:os';
import { copyFile, cp, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Context } from './context.js';
import { isRecord } from './context.js';
import { computeDigest } from './digest.js';
import { listFiles } from './files.js';
import type { Report } from './runner.js';
import { NotApplicable, Workspace, type Mutation } from './workspace.js';

export const MUTATIONS_DIR = 'tools/check/mutations';
export const GAPS_PATH = '.state/gaps.json';
export const LOCK_PATH = '.state/mutate.lock';

/** 判定。 */
export type Outcome = 'caught' | 'escaped' | 'false_positive' | 'na' | 'error';

/** 変異1本の記録。 */
export interface MutationRecord {
  id: string;
  family: string;
  expect: string;
  title: string;
  outcome: Outcome;
  reason: string;
  detail?: string;
  ms: number;
}

/** 逆テスト1回の報告。 */
export interface MutateReport {
  generatedAt: string;
  digest: string;
  status: 'green' | 'red';
  records: MutationRecord[];
  counts: Record<Outcome, number>;
  /** 未解決（policy で取り下げていない escaped / false_positive / error） */
  gaps: MutationRecord[];
  baseFailures: Record<string, Record<string, number>>;
  ms: number;
}

/**
 * 値が Mutation の形をしているか。
 * @param v 調べる値
 * @returns 形が合っていれば true
 */
function isMutation(v: unknown): v is Mutation {
  return (
    isRecord(v) &&
    typeof v['id'] === 'string' &&
    typeof v['family'] === 'string' &&
    typeof v['expect'] === 'string' &&
    typeof v['title'] === 'string' &&
    Array.isArray(v['touches']) &&
    typeof v['apply'] === 'function'
  );
}

/**
 * 変異を集める。tools/check/mutations/m_*.ts の default export。
 * 形が合わないファイルは例外にする。黙って飛ばすと、その変異は一度も走らない。
 * @param root 作業ツリーの絶対パス
 * @returns ID 順の変異とファイル名
 */
export async function discoverMutations(root: string): Promise<Array<{ file: string; mutation: Mutation }>> {
  const dir = join(root, MUTATIONS_DIR);
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter((n) => n.startsWith('m_') && n.endsWith('.ts')).sort();
  const out: Array<{ file: string; mutation: Mutation }> = [];
  for (const name of names) {
    const mod: unknown = await import(pathToFileURL(join(dir, name)).href);
    const m = isRecord(mod) ? mod['default'] : undefined;
    if (!isMutation(m)) throw new Error(`${MUTATIONS_DIR}/${name} の default export が Mutation の形ではありません`);
    out.push({ file: `${MUTATIONS_DIR}/${name}`, mutation: m });
  }
  return out.sort((a, b) => a.mutation.id.localeCompare(b.mutation.id));
}

/**
 * 作業ツリーのファイル一覧をサンドボックスへ複製し、node_modules を symlink で借りる。
 * 生成物と .state は持ち込まない（files.ts の一覧に入らない）。
 * @param root 元の作業ツリー
 * @param dst サンドボックスの絶対パス
 * @returns 複製したファイル数
 */
async function seed(root: string, dst: string): Promise<number> {
  const files = await listFiles(root);
  await Promise.all(
    files.map(async (rel) => {
      const t = join(dst, rel);
      await mkdir(dirname(t), { recursive: true });
      await copyFile(join(root, rel), t);
    }),
  );
  if (existsSync(join(root, 'node_modules'))) {
    await symlink(join(root, 'node_modules'), join(dst, 'node_modules'), 'dir');
  }
  return files.length;
}

/**
 * 検査の子プロセスの上限（ミリ秒）。unit 系統は中で vitest と tsc を起こすので、その上限
 * （UNIT_CHILD_TIMEOUT_MS）より長くする。短いと unit 系統が自分で止まる前に外側が殺し、結果が残らない。
 */
export const CHECK_CHILD_TIMEOUT_MS = 900_000;

/** サブプロセスで検査を走らせた結果。 */
type CheckRun = { ok: true; report: Report } | { ok: false; error: string };

/**
 * サンドボックスで系統1本を走らせる。プロセスを分けて隔離する。
 * @param wsRoot サンドボックスの絶対パス
 * @param family 系統 ID
 * @returns 報告か、実行の失敗
 */
function runCheck(wsRoot: string, family: string): Promise<CheckRun> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'tools/check/main.ts', '--only', family, '--json', '--no-write'],
      { cwd: wsRoot, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    child.stdout.setEncoding('utf8').on('data', (d: string) => (out += d));
    child.stderr.setEncoding('utf8').on('data', (d: string) => (err += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), CHECK_CHILD_TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      // 0 は緑、1 は赤。どちらも JSON を出す。それ以外は検査が動いていない
      if (code !== 0 && code !== 1) {
        resolve({ ok: false, error: `exit ${String(code)}: ${(err || out).trim().slice(-400)}` });
        return;
      }
      try {
        const report = JSON.parse(out) as Report;
        if (!isRecord(report.families) || !(family in report.families)) {
          resolve({ ok: false, error: `報告に系統 ${family} がありません` });
          return;
        }
        resolve({ ok: true, report });
      } catch {
        resolve({ ok: false, error: `JSON を読めません: ${(err || out).trim().slice(-400)}` });
      }
    });
  });
}

/**
 * 報告から検査 ID ごとの不合格件数を数える。
 * @param report 検査の報告
 * @returns 検査 ID から件数への対応
 */
export function countFailures(report: Report): Record<string, number> {
  const out: Record<string, number> = {};
  for (const fam of Object.values(report.families)) {
    for (const f of fam.failures) out[f.check] = (out[f.check] ?? 0) + 1;
  }
  return out;
}

/**
 * 増分から判定を下す。
 * @param expect 期待する検査 ID か NONE
 * @param base 基準の件数
 * @param now 変異後の件数
 * @returns 判定と理由
 */
export function judge(
  expect: string,
  base: Record<string, number>,
  now: Record<string, number>,
): { outcome: Outcome; reason: string } {
  const grew: Record<string, number> = {};
  for (const k of new Set([...Object.keys(base), ...Object.keys(now)])) {
    const d = (now[k] ?? 0) - (base[k] ?? 0);
    if (d > 0) grew[k] = d;
  }
  const list = (o: Record<string, number>): string =>
    Object.entries(o)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k} +${v}`)
      .join(' / ');

  // 系統そのものが落ちた（<接頭辞>-X）だけの反応は、歯の有無を判定できない。escaped と数えると
  // 「検査が転んだ」のを「歯が無い」と誤診する（2026-09-29、負荷で vitest が時間切れになった 2 本で踏んだ）。
  // 期待そのものが -X の変異（系統が落ちることを確かめる変異）はこの扱いから外す
  const crashed = Object.keys(grew).filter((k) => k.endsWith('-X') && k !== expect);
  const meaningful = Object.keys(grew).filter((k) => !crashed.includes(k));
  if (crashed.length > 0 && meaningful.length === 0) {
    return {
      outcome: 'error',
      reason: `${list(grew)} だけが反応（検査そのものが落ちた。時間切れや例外を疑い、負荷の無い状態で回し直す）`,
    };
  }

  if (expect === 'NONE') {
    // 捕まえてはいけない変異。意味を変えていない書き換えで検査が反応したら、
    // その検査は過敏で、無害な編集のたびに赤を出す。やがて誰も走らせない。
    if (Object.keys(grew).length === 0) return { outcome: 'caught', reason: 'どの検査も反応せず（誤検知なし）' };
    return { outcome: 'false_positive', reason: `${list(grew)} が反応（意味を変えていない変異）` };
  }
  const baseNote = (base[expect] ?? 0) > 0 ? `。基準で既に ${expect} が ${base[expect] ?? 0} 件赤いので、まず基準を疑う` : '';
  const hit = grew[expect];
  if (hit !== undefined) {
    const others = Object.fromEntries(Object.entries(grew).filter(([k]) => k !== expect));
    const extra = Object.keys(others).length > 0 ? `（${list(others)} も反応）` : '';
    return { outcome: 'caught', reason: `${expect} が +${hit} 件で反応${extra}` };
  }
  if (Object.keys(grew).length > 0) {
    return { outcome: 'escaped', reason: `${list(grew)} が反応（期待は ${expect}）${baseNote}` };
  }
  return { outcome: 'escaped', reason: `どの検査も反応せず${baseNote}` };
}

/**
 * 並列数を上限に、仕事を順に配る。
 * @param items 仕事
 * @param jobs 同時に走らせる数
 * @param fn 1件ぶんの処理
 * @returns items と同じ順の結果
 */
async function pool<T, R>(items: readonly T[], jobs: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array<R>(items.length);
  let next = 0;
  const lane = async (): Promise<void> => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i] as T, i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, items.length)) }, lane));
  return out;
}

/**
 * pid のプロセスが生きているか。
 * @param pid プロセス ID
 * @returns 生きていれば true
 */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * 逆テストが走っているかを調べる。検査の側からも呼ぶ。
 * @param root 作業ツリーの絶対パス
 * @returns 走っていればその pid
 */
export async function runningMutate(root: string): Promise<number | null> {
  try {
    const pid = Number((await readFile(join(root, LOCK_PATH), 'utf8')).trim());
    return Number.isInteger(pid) && pid > 0 && pid !== process.pid && alive(pid) ? pid : null;
  } catch {
    return null;
  }
}

/**
 * 逆テストを走らせる。
 * @param ctx 元の作業ツリーの文脈
 * @param jobs 並列数（0 なら CPU 数）
 * @param log 進み具合を出す先
 * @returns 報告
 */
export async function runMutate(ctx: Context, jobs: number, log: (s: string) => void): Promise<MutateReport> {
  const started = Date.now();
  const found = await discoverMutations(ctx.root);
  if (found.length === 0) throw new Error('変異が1本も定義されていません');
  const n = jobs > 0 ? jobs : cpus().length;

  const other = await runningMutate(ctx.root);
  if (other !== null) throw new Error(`別の逆テスト（pid ${other}）が走っています`);
  await mkdir(ctx.path('.state'), { recursive: true });
  await writeFile(ctx.path(LOCK_PATH), `${process.pid}\n`, 'utf8');

  const tmp = await mkdtemp(join(tmpdir(), 'ai-news-mutate-'));
  try {
    const base = join(tmp, 'base');
    const copied = await seed(ctx.root, base);
    log(`サンドボックス ${tmp}（${copied} ファイル）`);

    // 基準実行。系統ごとに1回ずつ。土台の不合格を差し引くため
    const families = [...new Set(found.map((f) => f.mutation.family))].sort();
    const baseRuns = new Map<string, CheckRun>();
    await pool(families, n, async (fam) => {
      baseRuns.set(fam, await runCheck(base, fam));
    });
    const baseFailures: Record<string, Record<string, number>> = {};
    for (const [fam, r] of baseRuns) baseFailures[fam] = r.ok ? countFailures(r.report) : {};
    log(`基準 ${families.map((f) => `${f}=${baseRuns.get(f)?.ok === true ? JSON.stringify(baseFailures[f]) : '失敗'}`).join(' ')}`);

    const records = await pool(found, n, async ({ mutation: m }, i): Promise<MutationRecord> => {
      const t0 = Date.now();
      const rec = (outcome: Outcome, reason: string, detail?: string): MutationRecord => ({
        id: m.id,
        family: m.family,
        expect: m.expect,
        title: m.title,
        outcome,
        reason,
        ...(detail !== undefined ? { detail } : {}),
        ms: Date.now() - t0,
      });
      const b = baseRuns.get(m.family);
      if (b === undefined || !b.ok) return rec('error', `基準実行が落ちました: ${b !== undefined && !b.ok ? b.error : '?'}`);

      const dir = join(tmp, `w${i}`);
      await cp(base, dir, { recursive: true, verbatimSymlinks: true });
      try {
        let detail: string | undefined;
        try {
          detail = (await m.apply(new Workspace(dir))) ?? undefined;
        } catch (e) {
          if (e instanceof NotApplicable) return rec('na', e.message);
          return rec('error', `変異の適用が落ちました: ${e instanceof Error ? e.message : String(e)}`);
        }
        const r = await runCheck(dir, m.family);
        if (!r.ok) return rec('error', `検査の実行が落ちました: ${r.error}`, detail);
        const v = judge(m.expect, baseFailures[m.family] ?? {}, countFailures(r.report));
        return rec(v.outcome, v.reason, detail);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    const accepted = (await ctx.policy()).mutations.accepted;
    const gaps = records.filter(
      (r) => (r.outcome === 'escaped' || r.outcome === 'false_positive' || r.outcome === 'error') && !Object.hasOwn(accepted, r.id),
    );
    const counts: Record<Outcome, number> = { caught: 0, escaped: 0, false_positive: 0, na: 0, error: 0 };
    for (const r of records) counts[r.outcome]++;
    const report: MutateReport = {
      generatedAt: new Date().toISOString(),
      digest: (await computeDigest(ctx.root)).digest,
      status: gaps.length === 0 ? 'green' : 'red',
      records,
      counts,
      gaps,
      baseFailures,
      ms: Date.now() - started,
    };
    await writeFile(
      ctx.path(GAPS_PATH),
      `${JSON.stringify({ generatedAt: report.generatedAt, digest: report.digest, entries: gaps }, null, 2)}\n`,
      'utf8',
    );
    return report;
  } finally {
    await rm(tmp, { recursive: true, force: true });
    await rm(ctx.path(LOCK_PATH), { force: true });
  }
}

/**
 * 人が読む表にする。
 * @param report 逆テストの報告
 * @returns 端末に出す文字列
 */
export function renderMutate(report: MutateReport): string {
  const mark: Record<Outcome, string> = { caught: '○', escaped: '×', false_positive: '!', na: '−', error: 'E' };
  const lines = ['逆テスト — わざと壊して、検査が落とせるかを見る', '-'.repeat(74)];
  for (const r of report.records) {
    lines.push(`${mark[r.outcome]} ${r.id.padEnd(12)} ${r.outcome.padEnd(14)} [${r.family} → ${r.expect}] ${r.title}`);
    lines.push(`    ${r.reason}  ${r.ms}ms`);
  }
  const c = report.counts;
  lines.push('-'.repeat(74));
  lines.push(
    `変異 ${report.records.length} 本 / caught ${c.caught} / escaped ${c.escaped} / false_positive ${c.false_positive} / na ${c.na} / error ${c.error} / ${(report.ms / 1000).toFixed(1)} 秒`,
  );
  lines.push(
    report.status === 'green'
      ? '未解決なし。.state/gaps.json は空です。'
      : `未解決 ${report.gaps.length} 本を .state/gaps.json に書きました。検査を直すか、tools/check/policy.json の mutations.accepted に理由つきで登録してください。`,
  );
  return lines.join('\n');
}
