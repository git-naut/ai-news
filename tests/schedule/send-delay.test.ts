import { describe, it, expect } from 'vitest';
import { computeSendDelay, sendAtUtcSchema, sendMaxWaitMinutesSchema } from '../../src/schedule/send-delay.js';

const MIN = 60 * 1000;
const at = (iso: string): Date => new Date(iso);

describe('computeSendDelay', () => {
  it('未指定・空文字なら待たない', () => {
    expect(computeSendDelay(at('2026-09-29T23:45:00Z'), undefined, 20 * MIN)).toBe(0);
    expect(computeSendDelay(at('2026-09-29T23:45:00Z'), '', 20 * MIN)).toBe(0);
  });

  it('primary（UTC 23:45 起動）は日付をまたいだ 00:00 まで 15 分待つ', () => {
    expect(computeSendDelay(at('2026-09-29T23:45:00Z'), '00:00', 20 * MIN)).toBe(15 * MIN);
  });

  it('目標の直前なら残りだけ待つ', () => {
    expect(computeSendDelay(at('2026-09-29T23:59:30Z'), '00:00', 20 * MIN)).toBe(30 * 1000);
  });

  it('目標を過ぎていたら翌日へ繰り越さず即時に送る', () => {
    expect(computeSendDelay(at('2026-09-30T00:05:00Z'), '00:00', 20 * MIN)).toBe(0);
  });

  it('目標ちょうどなら即時に送る', () => {
    expect(computeSendDelay(at('2026-09-30T00:00:00Z'), '00:00', 20 * MIN)).toBe(0);
  });

  it('backup（UTC 04:00 以降の起動）に 00:00 が渡っても待たない', () => {
    // 2026-09-28 の実行では 49302 秒の待機に入り 20 分で打ち切られた
    expect(computeSendDelay(at('2026-09-28T10:18:18Z'), '00:00', 20 * MIN)).toBe(0);
  });

  it('待ちが上限と等しければ待ち、上限を 1ms でも超えれば即時に送る', () => {
    expect(computeSendDelay(at('2026-09-29T23:40:00Z'), '00:00', 20 * MIN)).toBe(20 * MIN);
    expect(computeSendDelay(at('2026-09-29T23:39:59.999Z'), '00:00', 20 * MIN)).toBe(0);
  });

  it('同じ日の中の目標（UTC 04:30 に 04:40）も扱える', () => {
    expect(computeSendDelay(at('2026-09-29T04:30:00Z'), '04:40', 20 * MIN)).toBe(10 * MIN);
  });

  it('形式が不正な値は例外にする', () => {
    expect(() => computeSendDelay(at('2026-09-29T23:45:00Z'), 'abc', 20 * MIN)).toThrow();
    expect(() => computeSendDelay(at('2026-09-29T23:45:00Z'), '24:00', 20 * MIN)).toThrow();
    expect(() => computeSendDelay(at('2026-09-29T23:45:00Z'), '0:00', 20 * MIN)).toThrow();
  });
});

describe('sendAtUtcSchema', () => {
  it('HH:MM を通し、空文字は undefined にする', () => {
    expect(sendAtUtcSchema.parse('00:00')).toBe('00:00');
    expect(sendAtUtcSchema.parse('23:59')).toBe('23:59');
    expect(sendAtUtcSchema.parse('')).toBeUndefined();
    expect(sendAtUtcSchema.parse(undefined)).toBeUndefined();
  });

  it('不正な値を弾く', () => {
    expect(sendAtUtcSchema.safeParse('abc').success).toBe(false);
    expect(sendAtUtcSchema.safeParse('24:00').success).toBe(false);
    expect(sendAtUtcSchema.safeParse('00:60').success).toBe(false);
  });
});

describe('sendMaxWaitMinutesSchema', () => {
  it('未指定なら 20 分', () => {
    expect(sendMaxWaitMinutesSchema.parse(undefined)).toBe(20);
  });

  it('文字列の数値を受け、範囲外を弾く', () => {
    expect(sendMaxWaitMinutesSchema.parse('15')).toBe(15);
    expect(sendMaxWaitMinutesSchema.safeParse('61').success).toBe(false);
    expect(sendMaxWaitMinutesSchema.safeParse('-1').success).toBe(false);
    expect(sendMaxWaitMinutesSchema.safeParse('1.5').success).toBe(false);
  });
});
