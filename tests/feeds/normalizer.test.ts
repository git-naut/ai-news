import { describe, it, expect } from 'vitest';
import { generateArticleId, stripHtml, normalizeItem } from '../../src/feeds/normalizer.js';
import type { FeedSource } from '../../src/config/feeds.js';

const mockSource: FeedSource = {
  name: 'Test Blog',
  url: 'https://test.example.com/feed',
  category: 'AI/LLM',
  language: 'en',
  maxItems: 5,
};

describe('generateArticleId', () => {
  it('同じ URL から同じ ID を生成する', () => {
    const id1 = generateArticleId('https://example.com/article');
    const id2 = generateArticleId('https://example.com/article');
    expect(id1).toBe(id2);
  });

  it('異なる URL から異なる ID を生成する', () => {
    const id1 = generateArticleId('https://example.com/article-1');
    const id2 = generateArticleId('https://example.com/article-2');
    expect(id1).not.toBe(id2);
  });

  it('生成される ID は16文字', () => {
    const id = generateArticleId('https://example.com/article');
    expect(id).toHaveLength(16);
  });
});

describe('stripHtml', () => {
  it('HTML タグを除去する', () => {
    expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
  });

  it('HTML エンティティをデコードする', () => {
    // &nbsp; → スペースに変換後、連続スペースが1つに正規化される
    expect(stripHtml('&amp; &lt; &gt; &quot; &#39;')).toBe("& < > \" '");
  });

  it('連続するスペースを1つにまとめる', () => {
    expect(stripHtml('Hello   World')).toBe('Hello World');
  });
});

describe('normalizeItem', () => {
  it('正常な記事を変換する', () => {
    const item = {
      title: 'Test Article',
      link: 'https://example.com/test',
      isoDate: '2026-03-23T01:00:00.000Z',
      contentSnippet: 'This is a test article.',
    };
    const result = normalizeItem(item, mockSource);
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Test Article');
    expect(result?.url).toBe('https://example.com/test');
    expect(result?.sourceName).toBe('Test Blog');
    expect(result?.language).toBe('en');
  });

  it('タイトルが欠損している場合は null を返す', () => {
    const item = { link: 'https://example.com/test' };
    expect(normalizeItem(item, mockSource)).toBeNull();
  });

  it('URL が欠損している場合は null を返す', () => {
    const item = { title: 'Test Article' };
    expect(normalizeItem(item, mockSource)).toBeNull();
  });

  it('content:encoded を優先して本文を取得する', () => {
    const item = {
      title: 'Test',
      link: 'https://example.com/test',
      contentEncoded: '<p>Full content here</p>',
      contentSnippet: 'Short snippet',
    };
    const result = normalizeItem(item, mockSource);
    expect(result?.content).toBe('Full content here');
  });
});
