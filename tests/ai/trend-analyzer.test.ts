import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/ai/client.js', () => ({
  generateJson: vi.fn(),
}));

import { generateJson } from '../../src/ai/client.js';
import { analyzeTrends, TREND_LIMITS, TREND_MAX } from '../../src/ai/trend-analyzer.js';
import type { Article } from '../../src/feeds/types.js';

const a: Article = {
  id: 'x',
  title: 'Seed 2.0 Lite',
  url: 'https://example.com/x',
  publishedAt: new Date(),
  sourceName: 'Google',
  sourceUrl: 'https://blog.google',
  content: null,
  language: 'en',
  category: 'AI/LLM',
  summary: { what: '新しい軽量モデルが出た。', change: '入力 0.25 ドル／100 万トークン。', tryIt: null },
};

const llm = { apiKey: 'ark-test', baseUrl: 'https://ark.example/api/v3' };

describe('analyzeTrends', () => {
  beforeEach(() => vi.clearAllMocks());

  it('記事が 0 件なら API を呼ばずに空を返す', async () => {
    expect(await analyzeTrends(llm, [])).toEqual([]);
    expect(vi.mocked(generateJson)).not.toHaveBeenCalled();
  });

  it('検証済みのトレンドを返す', async () => {
    vi.mocked(generateJson).mockResolvedValue({ trends: [{ trend: '軽量モデル', description: '説明', action: 'seed-2-0-lite を試す' }] });
    expect(await analyzeTrends(llm, [a])).toEqual([{ trend: '軽量モデル', description: '説明', action: 'seed-2-0-lite を試す' }]);
  });

  it('失敗したら空を返し、パイプラインを止めない', async () => {
    vi.mocked(generateJson).mockRejectedValue(new Error('API Error'));
    expect(await analyzeTrends(llm, [a])).toEqual([]);
  });
});

describe('トレンドの上限', () => {
  beforeEach(() => vi.clearAllMocks());
  const long = (n: number): string => 'あ'.repeat(n);

  it('上限は 見出し 20・説明 80・試す 50 文字、件数 4 件', () => {
    expect(TREND_LIMITS).toEqual({ trend: 20, description: 80, action: 50 });
    expect(TREND_MAX).toBe(4);
  });

  it('上限を超えた欄は「…」を付けて上限の長さに切る', async () => {
    vi.mocked(generateJson).mockResolvedValue({ trends: [{ trend: long(25), description: long(120), action: long(70) }] });
    const [t] = await analyzeTrends(llm, [a]);
    expect([...(t?.trend ?? '')]).toHaveLength(20);
    expect([...(t?.description ?? '')]).toHaveLength(80);
    expect([...(t?.action ?? '')]).toHaveLength(50);
    expect(t?.description.endsWith('…')).toBe(true);
  });

  it('上限ちょうどの欄は切らない', async () => {
    vi.mocked(generateJson).mockResolvedValue({ trends: [{ trend: long(20), description: long(80), action: long(50) }] });
    const [t] = await analyzeTrends(llm, [a]);
    expect(t?.description).toBe(long(80));
  });

  it('5 件以上返っても先頭の 4 件だけにする', async () => {
    vi.mocked(generateJson).mockResolvedValue({ trends: Array.from({ length: 6 }, (_, i) => ({ trend: `t${i}`, description: 'd' })) });
    const out = await analyzeTrends(llm, [a]);
    expect(out.map((t) => t.trend)).toEqual(['t0', 't1', 't2', 't3']);
  });

  it('プロンプトで件数と各欄の上限を指示する', async () => {
    vi.mocked(generateJson).mockResolvedValue({ trends: [] });
    await analyzeTrends(llm, [a]);
    const prompt = vi.mocked(generateJson).mock.calls[0]?.[1].prompt ?? '';
    for (const s of ['3〜4', '20 文字', '80 文字', '50 文字']) expect(prompt).toContain(s);
  });
});
