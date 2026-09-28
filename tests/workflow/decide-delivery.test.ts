import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, chmodSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve('.github/scripts/decide-delivery.sh');

interface FakeRun {
  id: number;
  created_at: string;
  /** send-digest ジョブの名前と結論 */
  jobs: { name: string; conclusion: string | null }[];
}

interface Outcome {
  outputs: Record<string, string>;
  ghCalls: string[];
}

let binDir: string;

beforeAll(() => {
  // 偽の gh。FAKE_RUNS（JSON）を読み、runs 一覧と jobs 一覧を返す。呼ばれた引数は GH_LOG に追記する
  binDir = mkdtempSync(join(tmpdir(), 'fake-gh-'));
  const gh = `#!/usr/bin/env node
const fs = require('fs');
fs.appendFileSync(process.env.GH_LOG, process.argv.slice(2).join(' ') + '\\n');
if (process.env.FAKE_GH_FAIL === '1') { process.stderr.write('HTTP 502'); process.exit(1); }
const runs = JSON.parse(process.env.FAKE_RUNS || '[]');
const path = process.argv[3] || '';
const jobsMatch = path.match(/actions\\/runs\\/(\\d+)\\/jobs/);
if (jobsMatch) {
  const run = runs.find((r) => String(r.id) === jobsMatch[1]);
  process.stdout.write(JSON.stringify({ jobs: run ? run.jobs : [] }));
} else {
  const m = decodeURIComponent(path).match(/created=>=([^&]+)/);
  const since = m ? Date.parse(m[1]) : 0;
  const hit = runs.filter((r) => Date.parse(r.created_at) >= since);
  process.stdout.write(JSON.stringify({ workflow_runs: hit.map((r) => ({ id: r.id, created_at: r.created_at })) }));
}
`;
  const ghPath = join(binDir, 'gh');
  writeFileSync(ghPath, gh);
  chmodSync(ghPath, 0o755);
});

function decide(env: Record<string, string>, runs: FakeRun[] = [], ghFail = false): Outcome {
  const work = mkdtempSync(join(tmpdir(), 'decide-'));
  mkdirSync(work, { recursive: true });
  const out = join(work, 'out');
  const log = join(work, 'gh.log');
  writeFileSync(out, '');
  writeFileSync(log, '');
  execFileSync('bash', [SCRIPT], {
    env: {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      GITHUB_OUTPUT: out,
      GITHUB_REPOSITORY: 'git-naut/ai-news',
      GH_LOG: log,
      FAKE_RUNS: JSON.stringify(runs),
      FAKE_GH_FAIL: ghFail ? '1' : '0',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const outputs: Record<string, string> = {};
  for (const line of readFileSync(out, 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) outputs[line.slice(0, i)] = line.slice(i + 1);
  }
  return { outputs, ghCalls: readFileSync(log, 'utf8').split('\n').filter(Boolean) };
}

const epoch = (iso: string): string => String(Math.floor(Date.parse(iso) / 1000));
const primarySent = (id: number, created: string): FakeRun => ({
  id,
  created_at: created,
  jobs: [{ name: 'send-digest (primary)', conclusion: 'success' }],
});

describe('decide-delivery.sh', () => {
  it('dispatch（immediate=false）は primary で 00:00 まで待つ。重複判定はしない', () => {
    const r = decide({ EVENT_NAME: 'workflow_dispatch', INPUT_IMMEDIATE: 'false', INPUT_SIMULATE_SCHEDULE: 'false' });
    expect(r.outputs).toEqual({ kind: 'primary', should_send: 'true', send_at_utc: '00:00' });
    expect(r.ghCalls).toHaveLength(0);
  });

  it('dispatch（immediate=true）は manual で即時', () => {
    const r = decide({ EVENT_NAME: 'workflow_dispatch', INPUT_IMMEDIATE: 'true', INPUT_SIMULATE_SCHEDULE: 'false' });
    expect(r.outputs).toEqual({ kind: 'manual', should_send: 'true', send_at_utc: '' });
  });

  it('schedule は backup。primary が届いていなければ即時に送る（2026-09-28 の再現）', () => {
    const r = decide({ EVENT_NAME: 'schedule', NOW_EPOCH: epoch('2026-09-28T10:16:05Z') });
    expect(r.outputs).toEqual({ kind: 'backup', should_send: 'true', send_at_utc: '' });
  });

  it('schedule は、直近の primary 枠以降に primary の送信が success ならスキップする', () => {
    const r = decide({ EVENT_NAME: 'schedule', NOW_EPOCH: epoch('2026-09-29T06:10:00Z') }, [
      primarySent(1, '2026-09-28T23:45:15Z'),
    ]);
    expect(r.outputs.should_send).toBe('false');
    expect(r.outputs.kind).toBe('backup');
  });

  it('schedule が 12 時間遅れて UTC 16 時台に動いても、前夜 23:45 の primary を見つける', () => {
    const r = decide({ EVENT_NAME: 'schedule', NOW_EPOCH: epoch('2026-09-29T16:10:00Z') }, [
      primarySent(1, '2026-09-28T23:45:15Z'),
    ]);
    expect(r.outputs.should_send).toBe('false');
  });

  it('前日より前の primary は数えない', () => {
    const r = decide({ EVENT_NAME: 'schedule', NOW_EPOCH: epoch('2026-09-29T06:10:00Z') }, [
      primarySent(1, '2026-09-27T23:45:15Z'),
    ]);
    expect(r.outputs.should_send).toBe('true');
  });

  it('manual の送信や、send-digest が失敗・スキップした primary は送信済みに数えない', () => {
    const r = decide({ EVENT_NAME: 'schedule', NOW_EPOCH: epoch('2026-09-29T06:10:00Z') }, [
      { id: 1, created_at: '2026-09-29T01:00:00Z', jobs: [{ name: 'send-digest (manual)', conclusion: 'success' }] },
      { id: 2, created_at: '2026-09-28T23:45:15Z', jobs: [{ name: 'send-digest (primary)', conclusion: 'cancelled' }] },
      { id: 3, created_at: '2026-09-28T23:50:00Z', jobs: [{ name: 'send-digest (primary)', conclusion: 'skipped' }] },
      { id: 4, created_at: '2026-09-29T04:00:00Z', jobs: [{ name: 'check', conclusion: 'success' }] },
    ]);
    expect(r.outputs.should_send).toBe('true');
  });

  it('simulate_schedule=true の dispatch は schedule と同じ分岐を通る', () => {
    const r = decide({
      EVENT_NAME: 'workflow_dispatch',
      INPUT_IMMEDIATE: 'true',
      INPUT_SIMULATE_SCHEDULE: 'true',
      NOW_EPOCH: epoch('2026-09-29T06:10:00Z'),
    });
    expect(r.outputs).toEqual({ kind: 'backup', should_send: 'true', send_at_utc: '' });
  });

  it('gh が失敗したら送る側に倒す（重複より欠配のほうが悪い）', () => {
    const r = decide({ EVENT_NAME: 'schedule', NOW_EPOCH: epoch('2026-09-29T06:10:00Z') }, [], true);
    expect(r.outputs.should_send).toBe('true');
    expect(r.outputs.kind).toBe('backup');
  });

  it('枠の起点は UTC 23:35 で、created の下限として URL に載る', () => {
    const r = decide({ EVENT_NAME: 'schedule', NOW_EPOCH: epoch('2026-09-29T06:10:00Z') });
    expect(r.ghCalls[0]).toContain(encodeURIComponent('>=') + '2026-09-28T23:35:00Z');
  });
});
