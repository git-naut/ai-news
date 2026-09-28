import { describe, it, expect } from 'vitest';
import { LOOKBACK_HOURS, isWithinLookback } from '../../src/config/lookback.js';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-09-28T23:45:00Z');

describe('取得窓', () => {
  it('36 時間（週明け月曜に土日の記事を取りこぼさない長さ）', () => {
    expect(LOOKBACK_HOURS).toBe(36);
  });

  it('境界ちょうどは内側、1 ミリ秒でも古ければ外側', () => {
    expect(isWithinLookback(new Date(now.getTime() - 36 * HOUR), now)).toBe(true);
    expect(isWithinLookback(new Date(now.getTime() - 36 * HOUR - 1), now)).toBe(false);
  });
});
