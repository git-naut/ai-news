import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeContext } from '../../tools/check/context.js';
import type { FamilyEntry } from '../../tools/check/families/index.js';
import { parseMarkers } from '../../tools/check/families/lessons.js';
import { judge } from '../../tools/check/mutate.js';
import { makeResult, vacuous } from '../../tools/check/result.js';
import { runFamilies } from '../../tools/check/runner.js';
import { NotApplicable, Workspace, replaceOnce } from '../../tools/check/workspace.js';

describe('vacuous', () => {
  it('primary が 0 件の緑だけを素通りとみなす', () => {
    expect(vacuous(makeResult({ check: 'A', surveyed: { n: 0 }, primary: 'n' }))).toBe(true);
    expect(vacuous(makeResult({ check: 'A', surveyed: { n: 1 }, primary: 'n' }))).toBe(false);
    // primary を宣言していなければ判定しない
    expect(vacuous(makeResult({ check: 'A', surveyed: { n: 0 } }))).toBe(false);
    // 赤ならそもそも素通りではない
    expect(
      vacuous(makeResult({ check: 'A', surveyed: { n: 0 }, primary: 'n', failures: [{ check: 'A-1', message: 'x' }] })),
    ).toBe(false);
  });
});

describe('judge', () => {
  it('期待した検査が増えたら caught', () => {
    expect(judge('SEC-2', {}, { 'SEC-2': 1 }).outcome).toBe('caught');
  });
  it('別の検査だけが増えたら escaped', () => {
    expect(judge('SEC-2', {}, { 'SEC-1': 1 }).outcome).toBe('escaped');
  });
  it('基準で既に赤くて増えなければ escaped で、基準を疑えと書く', () => {
    const v = judge('SEC-2', { 'SEC-2': 1 }, { 'SEC-2': 1 });
    expect(v.outcome).toBe('escaped');
    expect(v.reason).toContain('基準');
  });
  it('NONE で何も増えなければ caught、増えたら false_positive', () => {
    expect(judge('NONE', { 'SEC-2': 1 }, { 'SEC-2': 1 }).outcome).toBe('caught');
    expect(judge('NONE', {}, { 'LES-3': 1 }).outcome).toBe('false_positive');
  });
});

describe('runner', () => {
  it('系統が例外を投げたら <接頭辞>-X にし、素通りは LOOP-3 にする', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'check-core-'));
    try {
      const entries: FamilyEntry[] = [
        {
          id: 'boom',
          prefix: 'BOOM',
          load: async () => ({
            ID: 'boom',
            TITLE: '落ちる',
            speed: 'fast',
            run: async () => {
              throw new Error('わざと');
            },
          }),
        },
        {
          id: 'empty',
          prefix: 'EMP',
          load: async () => ({
            ID: 'empty',
            TITLE: '空',
            speed: 'fast',
            run: async () => [makeResult({ check: 'EMP', surveyed: { 対象: 0 }, primary: '対象' })],
          }),
        },
        { id: 'noload', prefix: 'NL', load: async () => Promise.reject(new SyntaxError('読めない')) },
      ];
      const report = await runFamilies(makeContext(dir), entries, 'test');
      expect(report.families['boom']?.failures.map((f) => f.check)).toEqual(['BOOM-X']);
      expect(report.families['empty']?.failures.map((f) => f.check)).toEqual(['LOOP-3']);
      expect(report.families['noload']?.failures.map((f) => f.check)).toEqual(['NL-X']);
      expect(report.status).toBe('red');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('parseMarkers', () => {
  it('属性と行番号を拾う', () => {
    const ms = parseMarkers('# t\n\n<!-- L:SEC-001 family=sec check=SEC-2 mutation=m_sec_001 -->\n');
    expect(ms).toEqual([{ id: 'SEC-001', line: 3, attrs: { family: 'sec', check: 'SEC-2', mutation: 'm_sec_001' } }]);
  });
});

describe('replaceOnce', () => {
  it('0 か所でも 2 か所でも NotApplicable', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'check-core-'));
    try {
      writeFileSync(join(dir, 'a.txt'), 'x x y');
      const ws = new Workspace(dir);
      await expect(replaceOnce(ws, 'a.txt', 'x', 'z')).rejects.toBeInstanceOf(NotApplicable);
      await expect(replaceOnce(ws, 'a.txt', 'q', 'z')).rejects.toBeInstanceOf(NotApplicable);
      await replaceOnce(ws, 'a.txt', 'y', '$&');
      expect(await ws.read('a.txt')).toBe('x x $&');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
