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
        // フィードの XML はサイトと別のホストにあり、記事のリンクは相対（Anthropic の第三者フィードの形）
        if (url.includes('relative')) {
          return Promise.resolve({
            link: 'https://site.example.com/',
            items: [{ title: 'Relative Link Post', link: '/engineering/post', isoDate: new Date(now).toISOString() }],
          });
        }
        // 壊れたリンクの記事が1件混ざったフィード
        if (url.includes('mixed')) {
          return Promise.resolve({
            items: [
              { title: 'Broken Link', link: 'http://[::1', isoDate: new Date(now).toISOString() },
              { title: 'Good Link', link: 'https://example.com/good', isoDate: new Date(now).toISOString() },
            ],
          });
        }
        // 中身が0件のフィード
        if (url.includes('empty')) {
          return Promise.resolve({ items: [] });
        }
        // age-<N>d: N 日前の記事が1件だけのフィード（鮮度の判定用）
        const age = /age-(\d+)d/.exec(url);
        if (age) {
          const days = Number(age[1]);
          return Promise.resolve({
            items: [{ title: `Post ${days} Days Ago`, link: `https://example.com/age-${days}`, isoDate: new Date(now - days * 24 * 60 * 60 * 1000).toISOString() }],
          });
        }
        return Promise.resolve({ items });
      }),
    })),
  };
});

import { fetchAllFeeds, fetchAllFeedsWithReport, STALE_DAYS } from '../../src/feeds/fetcher.js';
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

describe('fetchAllFeeds（リンクの解決）', () => {
  const base = { category: 'AI/LLM' as const, language: 'en' as const, maxItems: 5 };

  it('相対リンクはフィードの XML の場所ではなく、フィードが示すサイトの link を基準に解決する', async () => {
    const [a] = await fetchAllFeeds([{ ...base, name: 'Rel', url: 'https://raw.example.com/x/relative.xml' }]);
    expect(a?.url).toBe('https://site.example.com/engineering/post');
    expect(a?.sourceUrl).toBe('https://site.example.com');
  });

  it('壊れたリンクの記事が1件混ざっても、同じフィードの正常な記事は fetchFeed を通って残る', async () => {
    const out = await fetchAllFeeds([{ ...base, name: 'Mixed', url: 'https://example.com/mixed.xml' }]);
    expect(out.map((a) => a.title)).toEqual(['Good Link']);
  });
});

describe('fetchAllFeedsWithReport（取得元の鮮度）', () => {
  const base = { category: 'AI/LLM' as const, language: 'en' as const, maxItems: 5 };
  const DAY = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('止まったとみなす日数は 14 日', () => {
    expect(STALE_DAYS).toBe(14);
  });

  it('最新の記事が 13 日前なら古くない、15 日前なら古い（最新日時も返す）', async () => {
    const report = await fetchAllFeedsWithReport([
      { ...base, name: 'Recent', url: 'https://example.com/age-13d.xml' },
      { ...base, name: 'Stopped', url: 'https://example.com/age-15d.xml' },
    ]);
    expect(report.stale.map((s) => s.name)).toEqual(['Stopped']);
    const newest = report.stale[0]?.newest;
    expect(newest).toBeInstanceOf(Date);
    expect(Math.round((Date.now() - (newest?.getTime() ?? 0)) / DAY)).toBe(15);
    expect(report.failed).toEqual([]);
  });

  it('取得窓の外の記事しか無くても、最新が 3 日前なら古いとは言わない（最新日時は取得窓で絞る前に取る）', async () => {
    const report = await fetchAllFeedsWithReport([{ ...base, name: 'Quiet', url: 'https://example.com/age-3d.xml' }]);
    expect(report.articles).toEqual([]);
    expect(report.stale).toEqual([]);
  });

  it('記事が0件のフィードは最新日時 null で古い側に入る', async () => {
    const report = await fetchAllFeedsWithReport([{ ...base, name: 'Empty', url: 'https://example.com/empty.xml' }]);
    expect(report.stale).toEqual([{ name: 'Empty', newest: null }]);
    expect(report.failed).toEqual([]);
  });

  it('取得に失敗したフィードは failed に分け、stale には入れない', async () => {
    const report = await fetchAllFeedsWithReport([
      ...mockSources,
      { ...base, name: 'Broken', url: 'https://error.example.com/feed' },
    ]);
    expect(report.failed).toEqual(['Broken']);
    expect(report.stale).toEqual([]);
    expect(report.articles).toHaveLength(3);
  });

  it('基準時刻を渡せる（30 日後から見ると、今日の記事しか無いフィードも古い）', async () => {
    const later = new Date(Date.now() + 30 * DAY);
    const report = await fetchAllFeedsWithReport(mockSources, later);
    expect(report.articles).toEqual([]);
    expect(report.stale.map((s) => s.name)).toEqual(['Test Blog']);
  });
});
