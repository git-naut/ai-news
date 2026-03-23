import { describe, it, expect } from 'vitest';
import { normalizeUrl, jaccardSimilarity, deduplicate } from '../../src/categorizer/deduplicator.js';
import type { RawArticle } from '../../src/feeds/types.js';

function makeArticle(override: Partial<RawArticle> = {}): RawArticle {
  return {
    title: 'Test Article',
    url: 'https://example.com/article',
    publishedAt: new Date(),
    sourceName: 'Test Source',
    sourceUrl: 'https://example.com',
    content: 'Test content',
    language: 'en',
    ...override,
  };
}

describe('normalizeUrl', () => {
  it('クエリパラメータを除去する', () => {
    expect(normalizeUrl('https://example.com/article?utm_source=twitter')).toBe(
      'https://example.com/article'
    );
  });

  it('フラグメントを除去する', () => {
    expect(normalizeUrl('https://example.com/article#section')).toBe(
      'https://example.com/article'
    );
  });

  it('末尾スラッシュを除去する', () => {
    expect(normalizeUrl('https://example.com/article/')).toBe(
      'https://example.com/article'
    );
  });
});

describe('jaccardSimilarity', () => {
  it('同じテキストは 1.0 を返す', () => {
    expect(jaccardSimilarity('hello world', 'hello world')).toBe(1.0);
  });

  it('全く異なるテキストは 0.0 を返す', () => {
    expect(jaccardSimilarity('hello world', 'foo bar baz')).toBe(0.0);
  });

  it('部分的に一致するテキストは 0〜1 の値を返す', () => {
    const similarity = jaccardSimilarity('GPT-5 Released by OpenAI', 'OpenAI Releases GPT-5');
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });
});

describe('deduplicate', () => {
  it('同じ URL の記事は1件に絞る', () => {
    const articles = [
      makeArticle({ url: 'https://example.com/article', content: 'Short' }),
      makeArticle({ url: 'https://example.com/article?utm_source=twitter', content: 'Longer content here' }),
    ];
    const result = deduplicate(articles);
    expect(result).toHaveLength(1);
  });

  it('URL が重複した場合、content が長い方を残す', () => {
    const articles = [
      makeArticle({ url: 'https://example.com/article', content: 'Short' }),
      makeArticle({ url: 'https://example.com/article', content: 'Much longer content here' }),
    ];
    const result = deduplicate(articles);
    expect(result[0]?.content).toBe('Much longer content here');
  });

  it('タイトルが類似した記事は重複とみなす', () => {
    const articles = [
      makeArticle({
        url: 'https://site1.com/gpt5',
        title: 'OpenAI releases GPT-5 with major improvements',
      }),
      makeArticle({
        url: 'https://site2.com/gpt5',
        title: 'OpenAI releases GPT-5 with major improvements today',
      }),
    ];
    const result = deduplicate(articles);
    expect(result).toHaveLength(1);
  });

  it('異なる記事は両方残す', () => {
    const articles = [
      makeArticle({ url: 'https://example.com/article-1', title: 'GPT-5 Released' }),
      makeArticle({ url: 'https://example.com/article-2', title: 'New Quantum Computer Built' }),
    ];
    const result = deduplicate(articles);
    expect(result).toHaveLength(2);
  });
});
