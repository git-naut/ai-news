/**
 * wf 系統 — GitHub Actions のワークフローの配線。
 *
 * 2026-06-23 から 3 か月、backup が一度も送れていなかった。原因はコードではなく
 * ワークフローの配線（schedule 起動で SEND_AT_UTC=00:00 が入り、20 分の timeout より長く待つ）で、
 * vitest はワークフローを読まないため誰も気づかなかった。ここではその配線を不変条件として見る。
 */

import { parse } from 'yaml';
import type { Context } from '../context.js';
import { isRecord } from '../context.js';
import { makeResult, type Failure, type Result } from '../result.js';

export const ID = 'wf';
export const TITLE = 'ワークフローの配線';
export const speed = 'fast' as const;

const DAILY = '.github/workflows/daily-news.yml';
const DECIDE = '.github/scripts/decide-delivery.sh';
/** 待機の上限に足す、取得・要約・送信の時間の余裕（分）。9/29 の実測は 97.8 秒 */
const PROCESSING_MARGIN_MIN = 10;

/**
 * node24 で動く最小のメジャー版。2026-09-29 に各 action の action.yml の runs.using を
 * gh api で確かめた値。pnpm/action-setup は浮動タグ v4 が node20 のままだった。
 */
const MIN_MAJOR: Record<string, number> = {
  'actions/checkout': 5,
  'actions/setup-node': 5,
  'pnpm/action-setup': 6,
};

/** ワークフローの1ステップ。 */
interface Step {
  name?: string;
  id?: string;
  run?: string;
  uses?: string;
  env?: Record<string, unknown>;
}

/**
 * 値をステップの配列として取り出す。
 * @param v jobs.<id>.steps の値
 * @returns ステップの配列。形が違えば空
 */
function stepsOf(v: unknown): Step[] {
  return Array.isArray(v) ? v.filter(isRecord).map((s) => s as Step) : [];
}

/**
 * ワークフローを読む。壊れていたら例外を投げる（系統ごと `WF-X` になる）。
 * @param ctx 文脈
 * @param rel ワークフローの相対パス
 * @returns 最上位のオブジェクト
 */
async function load(ctx: Context, rel: string): Promise<Record<string, unknown>> {
  const doc: unknown = parse(await ctx.read(rel));
  if (!isRecord(doc)) throw new Error(`${rel} の最上位がオブジェクトではありません`);
  return doc;
}

/**
 * ワークフローの配線を調べる。
 * @param ctx 作業ツリーを読むための文脈
 * @returns WF-1〜WF-9 の結果
 */
export async function run(ctx: Context): Promise<Result[]> {
  const files = await ctx.files();
  const workflows = files.filter((f) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f));

  // WF-1: pnpm install は lockfile を固定し、依存のスクリプトを走らせない（axios の乗っ取り対策）
  const installFails: Failure[] = [];
  let installs = 0;
  for (const rel of workflows) {
    const doc = await load(ctx, rel);
    const jobs = isRecord(doc['jobs']) ? doc['jobs'] : {};
    for (const [jobId, job] of Object.entries(jobs)) {
      if (!isRecord(job)) continue;
      for (const step of stepsOf(job['steps'])) {
        if (typeof step.run !== 'string' || !/\bpnpm\s+(install|i)\b/.test(step.run)) continue;
        installs++;
        for (const flag of ['--frozen-lockfile', '--ignore-scripts']) {
          if (!step.run.includes(flag)) {
            installFails.push({
              check: 'WF-1',
              message: `pnpm install に ${flag} がありません`,
              where: `${rel} jobs.${jobId}`,
              remedy: `${flag} を付けてください。`,
            });
          }
        }
      }
    }
  }

  const daily = await load(ctx, DAILY);
  const jobs = isRecord(daily['jobs']) ? daily['jobs'] : {};
  const check = isRecord(jobs['check']) ? jobs['check'] : {};
  const send = isRecord(jobs['send-digest']) ? jobs['send-digest'] : {};
  const decideText = ctx.exists(DECIDE) ? await ctx.read(DECIDE) : '';

  // WF-2: 送信ジョブの名前に種類が載り、backup の重複判定が同じ名前を探している
  const nameFails: Failure[] = [];
  const jobName = typeof send['name'] === 'string' ? send['name'] : '';
  if (!/^send-digest \(\$\{\{\s*needs\.check\.outputs\.kind\s*\}\}\)$/.test(jobName)) {
    nameFails.push({
      check: 'WF-2',
      message: `send-digest の name が "send-digest (\${{ needs.check.outputs.kind }})" ではありません: ${jobName || '（なし）'}`,
      where: `${DAILY} jobs.send-digest.name`,
      remedy: 'backup の重複判定はジョブ名 "send-digest (primary)" で primary の送信を探します。名前を揃えてください。',
    });
  }
  const lookups = decideText.match(/"send-digest \(primary\)"/g)?.length ?? 0;
  if (lookups !== 1) {
    nameFails.push({
      check: 'WF-2',
      message: `${DECIDE} が "send-digest (primary)" を探す箇所が ${lookups} か所です（1 か所のはず）`,
      where: DECIDE,
      remedy: 'ジョブ名と同じ文字列で、送信ジョブの success を探してください。',
    });
  }

  // WF-3: 送信ジョブへの受け渡しと、待機の上限＋余裕 ≤ timeout
  const passFails: Failure[] = [];
  const sendSteps = stepsOf(send['steps']);
  const start = sendSteps.find((s) => typeof s.run === 'string' && /\bpnpm\s+start\b/.test(s.run));
  const env = start?.env ?? {};
  const want: Record<string, RegExp> = {
    SEND_AT_UTC: /^\$\{\{\s*needs\.check\.outputs\.send_at_utc\s*\}\}$/,
    DELIVERY_KIND: /^\$\{\{\s*needs\.check\.outputs\.kind\s*\}\}$/,
    SEND_MAX_WAIT_MINUTES: /^\d+$/,
  };
  for (const [key, re] of Object.entries(want)) {
    const v = env[key];
    if (typeof v !== 'string' || !re.test(v)) {
      passFails.push({
        check: 'WF-3',
        message: `pnpm start の env.${key} が想定の形ではありません: ${v === undefined ? '（なし）' : String(v)}`,
        where: `${DAILY} jobs.send-digest`,
        remedy: `${key} は ${re.source} の形で渡してください。`,
      });
    }
  }
  const maxWait = Number(env['SEND_MAX_WAIT_MINUTES']);
  const timeout = typeof send['timeout-minutes'] === 'number' ? send['timeout-minutes'] : NaN;
  if (!Number.isFinite(timeout) || !Number.isFinite(maxWait) || timeout < maxWait + PROCESSING_MARGIN_MIN) {
    passFails.push({
      check: 'WF-3',
      message: `timeout-minutes（${String(timeout)}）が待機の上限 ${String(maxWait)} 分＋余裕 ${PROCESSING_MARGIN_MIN} 分より短いです`,
      where: `${DAILY} jobs.send-digest.timeout-minutes`,
      remedy: '待っている途中で打ち切られると、何も送らずに cancelled になります（9/17〜9/28 の実例）。',
    });
  }

  // WF-4: 空文字が falsy になる式の罠（`cond && '' || 'x'` は常に 'x'）を使っていない
  const trapFails: Failure[] = [];
  let expressions = 0;
  for (const rel of workflows) {
    const text = await ctx.read(rel);
    for (const m of text.matchAll(/\$\{\{([^}]*)\}\}/g)) {
      expressions++;
      if (/&&\s*''\s*\|\|/.test(m[1] ?? '')) {
        trapFails.push({
          check: 'WF-4',
          message: `空文字を && で返す式があります: \${{${m[1]}}}`,
          where: rel,
          remedy: "GitHub Actions の式では '' が falsy なので、|| の右が必ず選ばれます。シェルか出力で分岐してください。",
        });
      }
    }
  }

  // WF-5: check ジョブの出力が decide ステップにつながり、そのステップがスクリプトを実行する
  const wireFails: Failure[] = [];
  const outputs = isRecord(check['outputs']) ? check['outputs'] : {};
  const outputNames = ['kind', 'should_send', 'send_at_utc'];
  for (const name of outputNames) {
    const v = outputs[name];
    const re = new RegExp(`^\\$\\{\\{\\s*steps\\.decide\\.outputs\\.${name}\\s*\\}\\}$`);
    if (typeof v !== 'string' || !re.test(v)) {
      wireFails.push({
        check: 'WF-5',
        message: `check.outputs.${name} が steps.decide.outputs.${name} を指していません`,
        where: `${DAILY} jobs.check.outputs`,
      });
    }
  }
  const decideStep = stepsOf(check['steps']).find((s) => s.id === 'decide');
  if (!decideStep || typeof decideStep.run !== 'string' || !decideStep.run.includes(DECIDE)) {
    wireFails.push({ check: 'WF-5', message: `id: decide のステップが ${DECIDE} を実行していません`, where: DAILY });
  }
  if (!ctx.exists(DECIDE)) {
    wireFails.push({ check: 'WF-5', message: `${DECIDE} がありません`, where: DECIDE });
  }
  if (send['if'] !== "needs.check.outputs.should_send == 'true'") {
    wireFails.push({
      check: 'WF-5',
      message: `send-digest の if が should_send を見ていません: ${String(send['if'])}`,
      where: `${DAILY} jobs.send-digest.if`,
    });
  }

  // WF-6: 起動条件（backup の schedule と、dispatch の 2 入力）
  const trigFails: Failure[] = [];
  const on = isRecord(daily['on']) ? daily['on'] : {};
  const schedule = Array.isArray(on['schedule']) ? on['schedule'] : [];
  if (schedule.length === 0) {
    trigFails.push({ check: 'WF-6', message: 'schedule（backup）がありません', where: `${DAILY} on.schedule` });
  }
  const dispatch = isRecord(on['workflow_dispatch']) ? on['workflow_dispatch'] : {};
  const inputs = isRecord(dispatch['inputs']) ? dispatch['inputs'] : {};
  for (const name of ['immediate', 'simulate_schedule']) {
    const input = inputs[name];
    if (!isRecord(input) || input['type'] !== 'boolean') {
      trigFails.push({
        check: 'WF-6',
        message: `workflow_dispatch の入力 ${name}（boolean）がありません`,
        where: `${DAILY} on.workflow_dispatch.inputs`,
      });
    }
  }

  // WF-7〜9: 全ワークフローの actions の版、runs-on、pnpm の版の指定
  const pkg: unknown = JSON.parse(await ctx.read('package.json'));
  const packageManager = isRecord(pkg) && typeof pkg['packageManager'] === 'string' ? pkg['packageManager'] : '';
  const versionFails: Failure[] = [];
  const runnerFails: Failure[] = [];
  const pnpmFails: Failure[] = [];
  let usesCount = 0;
  let jobCount = 0;
  for (const rel of workflows) {
    const doc = await load(ctx, rel);
    const wfJobs = isRecord(doc['jobs']) ? doc['jobs'] : {};
    for (const [jobId, job] of Object.entries(wfJobs)) {
      if (!isRecord(job)) continue;
      jobCount++;
      const runsOn = job['runs-on'];
      if (typeof runsOn !== 'string' || !/^ubuntu-\d{2}\.\d{2}$/.test(runsOn)) {
        runnerFails.push({
          check: 'WF-8',
          message: `runs-on が版を固定していません: ${String(runsOn)}`,
          where: `${rel} jobs.${jobId}`,
          remedy: 'ubuntu-latest は 2026-10-19 から Ubuntu 26 へ移る。移行は自分で決めるため ubuntu-24.04 のように固定します。',
        });
      }
      for (const step of stepsOf(job['steps'])) {
        if (typeof step.uses !== 'string') continue;
        usesCount++;
        const m = /^([^@]+)@v(\d+)/.exec(step.uses);
        const min = m ? MIN_MAJOR[m[1] ?? ''] : undefined;
        if (m && min !== undefined && Number(m[2]) < min) {
          versionFails.push({
            check: 'WF-7',
            message: `${step.uses} は Node 20 で動く版です（v${min} 以上が node24）`,
            where: `${rel} jobs.${jobId}`,
            remedy: `${m[1] ?? ''}@v${min} 以上に上げてください。`,
          });
        }
        if (m?.[1] === 'pnpm/action-setup') {
          const withInputs = (step as Step & { with?: unknown }).with;
          if (packageManager && isRecord(withInputs) && 'version' in withInputs) {
            pnpmFails.push({
              check: 'WF-9',
              message: `pnpm/action-setup の with.version と package.json の packageManager（${packageManager}）が二重に指定されています`,
              where: `${rel} jobs.${jobId}`,
              remedy: 'v6 は2つが文字列で一致しないと失敗します。with.version を外し、packageManager に一本化してください。',
            });
          }
          if (!packageManager && !(isRecord(withInputs) && 'version' in withInputs)) {
            pnpmFails.push({ check: 'WF-9', message: 'pnpm の版がどこにも指定されていません', where: `${rel} jobs.${jobId}` });
          }
        }
      }
    }
  }

  return [
    makeResult({ check: 'WF-7', failures: versionFails, surveyed: { uses: usesCount }, primary: 'uses' }),
    makeResult({ check: 'WF-8', failures: runnerFails, surveyed: { ジョブ: jobCount }, primary: 'ジョブ' }),
    makeResult({ check: 'WF-9', failures: pnpmFails, surveyed: { ジョブ: jobCount }, primary: 'ジョブ' }),
    makeResult({ check: 'WF-1', failures: installFails, surveyed: { install: installs, ワークフロー: workflows.length }, primary: 'install' }),
    makeResult({ check: 'WF-2', failures: nameFails, surveyed: { 送信ジョブ: Object.keys(send).length > 0 ? 1 : 0 }, primary: '送信ジョブ' }),
    makeResult({ check: 'WF-3', failures: passFails, surveyed: { 受け渡し: Object.keys(want).length, 送信ステップ: start ? 1 : 0 }, primary: '送信ステップ' }),
    makeResult({ check: 'WF-4', failures: trapFails, surveyed: { 式: expressions }, primary: '式' }),
    makeResult({ check: 'WF-5', failures: wireFails, surveyed: { 出力: outputNames.length }, primary: '出力' }),
    makeResult({ check: 'WF-6', failures: trigFails, surveyed: { 入力: Object.keys(inputs).length }, primary: '入力' }),
  ];
}
