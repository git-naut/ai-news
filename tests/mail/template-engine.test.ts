import { describe, it, expect } from 'vitest';
import { buildTemplateData, renderTemplate, formatJstDate } from '../../src/mail/template-engine.js';
import type { Article } from '../../src/feeds/types.js';
import type { Trend } from '../../src/ai/trend-analyzer.js';

const mockArticles: Article[] = [
  {
    id: 'abc123',
    title: 'GPT-5 Released by OpenAI',
    url: 'https://openai.com/gpt-5',
    publishedAt: new Date('2026-03-23T01:00:00Z'),
    sourceName: 'OpenAI Blog',
    sourceUrl: 'https://openai.com',
    content: 'OpenAI has released GPT-5 with major improvements.',
    language: 'en',
    category: 'AI/LLM',
    summary: 'OpenAIがGPT-5をリリース。大幅な性能向上が特徴です。',
  },
  {
    id: 'def456',
    title: 'TypeScript 6.0 Released',
    url: 'https://devblog.example.com/ts6',
    publishedAt: new Date('2026-03-23T02:00:00Z'),
    sourceName: 'Dev Blog',
    sourceUrl: 'https://devblog.example.com',
    content: 'TypeScript 6.0 brings new features.',
    language: 'en',
    category: 'Development',
    summary: null,
  },
];

const mockTrends: Trend[] = [
  { trend: 'GPT-5 登場', description: 'OpenAI が GPT-5 をリリースし市場に大きな影響を与えました。' },
];

describe('buildTemplateData', () => {
  it('カテゴリ別にグループ化する', () => {
    const data = buildTemplateData(mockArticles, [], '2026年03月23日 09:00 JST');
    const categoryNames = data.categories.map((c) => c.name);
    expect(categoryNames).toContain('AI/LLM');
    expect(categoryNames).toContain('Development');
  });

  it('totalCount を正しく設定する', () => {
    const data = buildTemplateData(mockArticles, [], '2026年03月23日 09:00 JST');
    expect(data.totalCount).toBe(2);
  });

  it('summary が null の場合は content の先頭を使用する', () => {
    const data = buildTemplateData(mockArticles, [], '2026年03月23日 09:00 JST');
    const devSection = data.categories.find((c) => c.name === 'Development');
    expect(devSection?.articles[0]?.summary).toContain('TypeScript');
  });

  it('トレンドが存在する場合は hasTrends が true', () => {
    const data = buildTemplateData(mockArticles, mockTrends, '2026年03月23日 09:00 JST');
    expect(data.hasTrends).toBe(true);
    expect(data.trends).toHaveLength(1);
  });

  it('トレンドが空の場合は hasTrends が false', () => {
    const data = buildTemplateData(mockArticles, [], '2026年03月23日 09:00 JST');
    expect(data.hasTrends).toBe(false);
  });
});

describe('renderTemplate', () => {
  it('HTML テンプレートをレンダリングする', () => {
    const data = buildTemplateData(mockArticles, mockTrends, '2026年03月23日 09:00 JST');
    const html = renderTemplate('digest', data);
    expect(html).toContain('AI News Digest');
    expect(html).toContain('GPT-5 Released by OpenAI');
    expect(html).toContain('GPT-5 登場');
  });

  it('プレーンテキストテンプレートをレンダリングする', () => {
    const data = buildTemplateData(mockArticles, [], '2026年03月23日 09:00 JST');
    const text = renderTemplate('digest-text', data);
    expect(text).toContain('AI News Digest');
    expect(text).toContain('GPT-5 Released by OpenAI');
  });
});

describe('formatJstDate', () => {
  it('UTC 時刻を JST にフォーマットする', () => {
    const date = new Date('2026-03-23T00:00:00Z'); // UTC 00:00 = JST 09:00
    const formatted = formatJstDate(date);
    expect(formatted).toContain('2026年03月23日');
    expect(formatted).toContain('JST');
  });
});
