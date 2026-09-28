import { describe, it, expect, vi, beforeEach } from 'vitest';

// Gemini クライアントをモック
vi.mock('../../src/ai/client.js', () => ({
  generateJson: vi.fn(),
}));

import { generateJson } from '../../src/ai/client.js';
import { batchSummarize } from '../../src/ai/summarizer.js';
import type { Article } from '../../src/feeds/types.js';

/**
 * テスト用の記事を作る。
 * @param id 記事 ID
 */
function article(id: string): Article {
  return {
    id,
    title: `Title ${id}`,
    url: `https://example.com/${id}`,
    publishedAt: new Date(),
    sourceName: 'OpenAI Blog',
    sourceUrl: 'https://openai.com',
    content: 'GPT-5 is released.',
    language: 'en',
    category: 'AI/LLM',
    summary: null,
  };
}

const noSleep = async (): Promise<void> => {};
const llm = { apiKey: 'ark-test', baseUrl: 'https://ark.example/api/v3' };

describe('batchSummarize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('要約を記事に設定する', async () => {
    vi.mocked(generateJson).mockResolvedValue({ items: [{ id: 'a1', summary: 'GPT-5 が公開された。' }] });
    const result = await batchSummarize(llm, [article('a1')], { sleep: noSleep });
    expect(result[0]?.summary).toBe('GPT-5 が公開された。');
  });

  it('1 バッチが失敗しても、他のバッチの要約は残る', async () => {
    const articles = Array.from({ length: 10 }, (_, i) => article(`id${i}`));
    vi.mocked(generateJson)
      .mockResolvedValueOnce({ items: articles.slice(0, 5).map((a) => ({ id: a.id, summary: `要約 ${a.id}` })) })
      .mockRejectedValueOnce(new Error('API Error'));

    const result = await batchSummarize(llm, articles, { sleep: noSleep });
    expect(result.slice(0, 5).every((a) => a.summary?.startsWith('要約 '))).toBe(true);
    expect(result.slice(5).every((a) => a.summary === null)).toBe(true);
  });

  it('全バッチが失敗しても例外を投げず、summary は null のまま返す', async () => {
    vi.mocked(generateJson).mockRejectedValue(new Error('API Error'));
    const result = await batchSummarize(llm, [article('a1')], { sleep: noSleep });
    expect(result[0]?.summary).toBeNull();
  });

  it('バッチは直列に送り、2 本目以降の前に間隔を空ける', async () => {
    const articles = Array.from({ length: 11 }, (_, i) => article(`id${i}`));
    let inFlight = 0;
    let maxInFlight = 0;
    vi.mocked(generateJson).mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight--;
      return { items: [] };
    });
    const sleeps: number[] = [];
    await batchSummarize(llm, articles, { sleep: async (ms) => void sleeps.push(ms) });
    expect(vi.mocked(generateJson)).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBe(1);
    expect(sleeps).toHaveLength(2);
    expect(sleeps.every((ms) => ms >= 6000)).toBe(true);
  });

  it('応答に無い ID の要約は捨てる', async () => {
    vi.mocked(generateJson).mockResolvedValue({ items: [{ id: 'other', summary: '別の記事' }] });
    const result = await batchSummarize(llm, [article('a1')], { sleep: noSleep });
    expect(result[0]?.summary).toBeNull();
  });
});
