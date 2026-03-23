import { describe, it, expect } from 'vitest';
import { generateFallbackSummary, applyFallbackSummaries } from '../../src/ai/fallback.js';
import type { RawArticle } from '../../src/feeds/types.js';

const mockArticle: RawArticle = {
  title: 'Test Article',
  url: 'https://example.com/test',
  publishedAt: new Date(),
  sourceName: 'Test Source',
  sourceUrl: 'https://example.com',
  content: 'This is the article content.',
  language: 'en',
};

describe('generateFallbackSummary', () => {
  it('150文字以内のコンテンツはそのまま返す', () => {
    const result = generateFallbackSummary(mockArticle);
    expect(result).toBe('This is the article content.');
  });

  it('150文字超のコンテンツは切り詰めて "…" を付ける', () => {
    const longContent = 'a'.repeat(200);
    const result = generateFallbackSummary({ ...mockArticle, content: longContent });
    expect(result).toHaveLength(151); // 150文字 + "…"
    expect(result?.endsWith('…')).toBe(true);
  });

  it('content が null の場合は null を返す', () => {
    const result = generateFallbackSummary({ ...mockArticle, content: null });
    expect(result).toBeNull();
  });
});

describe('applyFallbackSummaries', () => {
  it('全記事にフォールバック要約を設定する', () => {
    const articles = [
      {
        ...mockArticle,
        id: 'test123',
        category: 'AI/LLM' as const,
      },
    ];
    const result = applyFallbackSummaries(articles);
    expect(result[0]?.summary).toBe('This is the article content.');
  });
});
