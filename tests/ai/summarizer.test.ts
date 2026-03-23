import { describe, it, expect, vi, beforeEach } from 'vitest';

// Gemini クライアントをモック
vi.mock('../../src/ai/client.js', () => ({
  generateText: vi.fn(),
  PRIMARY_MODEL: 'gemini-2.5-flash',
  FALLBACK_MODEL: 'gemini-2.5-flash-lite',
}));

// p-limit をモック（テストでは並行制限を無効化）
vi.mock('p-limit', () => ({
  default: () => (fn: () => Promise<unknown>) => fn(),
}));

import { generateText } from '../../src/ai/client.js';
import { batchSummarize } from '../../src/ai/summarizer.js';
import type { Article } from '../../src/feeds/types.js';

const mockArticles: Article[] = [
  {
    id: 'abc123def456789a',
    title: 'GPT-5 Released',
    url: 'https://example.com/gpt-5',
    publishedAt: new Date(),
    sourceName: 'OpenAI Blog',
    sourceUrl: 'https://openai.com',
    content: 'GPT-5 is released with major improvements.',
    language: 'en',
    category: 'AI/LLM',
    summary: null,
  },
];

describe('batchSummarize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('要約を記事に設定する', async () => {
    vi.mocked(generateText).mockResolvedValue(
      `[{"id": "abc123def456789a", "summary": "GPT-5がリリースされました。大幅な性能向上が特徴です。"}]`
    );

    const result = await batchSummarize('test-key', mockArticles);
    expect(result[0]?.summary).toBe('GPT-5がリリースされました。大幅な性能向上が特徴です。');
  });

  it('パース失敗時は summary を null のまま保持する', async () => {
    vi.mocked(generateText).mockResolvedValue('Invalid JSON response');

    const result = await batchSummarize('test-key', mockArticles);
    expect(result[0]?.summary).toBeNull();
  });

  it('generateText が失敗した場合はエラーをスローする', async () => {
    vi.mocked(generateText).mockRejectedValue(new Error('API Error'));

    await expect(batchSummarize('test-key', mockArticles)).rejects.toThrow('API Error');
  });
});
