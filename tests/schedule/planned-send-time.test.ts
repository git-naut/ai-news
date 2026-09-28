import { describe, it, expect } from 'vitest';
import { computeSendDelay, plannedSendTime } from '../../src/schedule/send-delay.js';
import { formatJstDate } from '../../src/mail/template-engine.js';

const MIN = 60 * 1000;
const at = (iso: string): Date => new Date(iso);

describe('plannedSendTime', () => {
  it('UTC 23:45:10 起動で 14 分 50 秒待つなら、配信時刻は 09:00 JST になる', () => {
    const now = at('2026-09-29T23:45:10Z');
    const sent = plannedSendTime(now, 14 * MIN + 50 * 1000);
    expect(sent.toISOString()).toBe('2026-09-30T00:00:00.000Z');
    expect(formatJstDate(sent)).toBe('2026年09月30日 09:00 JST');
  });

  it('computeSendDelay の待ちと組み合わせると、起動時刻ではなく送信時刻を表示する', () => {
    const now = at('2026-09-29T23:45:10Z');
    const delay = computeSendDelay(now, '00:00', 20 * MIN);
    expect(formatJstDate(plannedSendTime(now, delay))).toBe('2026年09月30日 09:00 JST');
    expect(formatJstDate(plannedSendTime(now, delay))).not.toBe(formatJstDate(now));
  });

  it('待たない（0 ミリ秒）なら現在時刻をそのまま返す', () => {
    const now = at('2026-09-30T01:10:00Z');
    expect(plannedSendTime(now, 0).getTime()).toBe(now.getTime());
  });

  it('引数の Date を書き換えない', () => {
    const now = at('2026-09-29T23:45:10Z');
    plannedSendTime(now, 14 * MIN + 50 * 1000);
    expect(now.toISOString()).toBe('2026-09-29T23:45:10.000Z');
  });
});
