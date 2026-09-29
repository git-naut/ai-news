import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/ai/client.js', () => ({
  generateJson: vi.fn(),
}));

import { generateJson } from '../../src/ai/client.js';
import { analyzeTrends } from '../../src/ai/trend-analyzer.js';
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
