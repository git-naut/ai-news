import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock はホイストされるため、ファクトリ内でファイル読み込みや
// 変数参照は避け、インラインでモックデータを定義する
vi.mock('rss-parser', () => {
  const now = Date.now();
  const items = [
    {
      title: 'GPT-5 Released with Major Improvements',
      link: 'https://example.com/gpt-5-release',
      isoDate: new Date(now).toISOString(),
      contentSnippet: 'OpenAI has released GPT-5.',
    },
    {
      title: 'New LLM Benchmark Results',
      link: 'https://example.com/llm-benchmark',
      isoDate: new Date(now - 60 * 60 * 1000).toISOString(), // 1時間前
      contentSnippet: 'Latest benchmark results.',
    },
    {
      title: 'Weekend Article 30 Hours Ago',
      link: 'https://example.com/weekend-30h',
      isoDate: new Date(now - 30 * 60 * 60 * 1000).toISOString(), // 30時間前（週末の記事）
      contentSnippet: 'Posted on the weekend.',
    },
    {
      title: 'Stale Article 40 Hours Ago',
      link: 'https://example.com/stale-40h',
      isoDate: new Date(now - 40 * 60 * 60 * 1000).toISOString(), // 40時間前（取得窓の外）
      contentSnippet: 'Too old for the lookback window.',
    },
    {
      title: 'Old Article from Last Week',
      link: 'https://example.com/old-article',
      isoDate: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8日前
      contentSnippet: 'This is an old article.',
    },
  ];

  return {
    default: vi.fn().mockImplementation(() => ({
      // URL に 'error' が含まれる場合はエラーをスローする
      parseURL: vi.fn().mockImplementation((url: string) => {
        if (url.includes('error')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ items });
      }),
    })),
  };
});

import { fetchAllFeeds } from '../../src/feeds/fetcher.js';
import type { FeedSource } from '../../src/config/feeds.js';

const mockSources: FeedSource[] = [
  {
    name: 'Test Blog',
    url: 'https://test.example.com/feed',
    category: 'AI/LLM',
    language: 'en',
    maxItems: 5,
  },
];

describe('fetchAllFeeds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('過去36時間以内の記事のみ取得する（30時間前は残し、40時間前と8日前は落とす）', async () => {
    const articles = await fetchAllFeeds(mockSources);
    const titles = articles.map((a) => a.title);
    expect(articles.length).toBe(3);
    expect(titles).toContain('Weekend Article 30 Hours Ago');
    expect(titles).not.toContain('Stale Article 40 Hours Ago');
    expect(titles).not.toContain('Old Article from Last Week');
  });

  it('ソース名を正しく設定する', async () => {
    const articles = await fetchAllFeeds(mockSources);
    expect(articles.every((a) => a.sourceName === 'Test Blog')).toBe(true);
  });

  it('フィード取得エラー時はそのフィードをスキップして他は継続する', async () => {
    const errorSource: FeedSource = {
      name: 'Error Source',
      url: 'https://error.example.com/feed', // 'error' を含む URL → エラーをシミュレート
      category: 'Tech',
      language: 'en',
      maxItems: 5,
    };
    // 正常ソース1つ + エラーソース1つ
    const articles = await fetchAllFeeds([...mockSources, errorSource]);
    // エラーソースはスキップされ、正常ソースの3件のみ返る
    expect(articles.length).toBe(3);
    expect(articles.every((a) => a.sourceName !== 'Error Source')).toBe(true);
  });
});
