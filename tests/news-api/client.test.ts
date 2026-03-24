import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixtureData = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/newsdata-response.json'), 'utf-8')
);

// axios をモック
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

import axios from 'axios';
import { fetchNewsApi } from '../../src/news-api/client.js';

// フィクスチャの記事日付 (2026-03-23 01:00:00 UTC) が 24h フィルターを通るよう時刻を固定
const FIXED_NOW = new Date('2026-03-23T10:00:00Z').getTime();

describe('fetchNewsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('API から記事を取得して RawArticle に変換する', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: fixtureData });

    const articles = await fetchNewsApi('test-api-key');
    // 3クエリ × 2件 = 6件（モックが毎回同じデータを返すため）
    expect(articles.length).toBe(6);
    expect(articles[0]?.title).toBe('New AI Model Breaks Performance Records');
  });

  it('日本語記事の language を "ja" に変換する', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: fixtureData });

    const articles = await fetchNewsApi('test-api-key');
    const jaArticle = articles.find((a) => a.title.includes('日本'));
    expect(jaArticle?.language).toBe('ja');
  });

  it('API エラー時は空配列を返す（パイプライン停止しない）', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

    const articles = await fetchNewsApi('test-api-key');
    expect(articles).toEqual([]);
  });

  it('レスポンス形式が不正な場合はスキップする', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { status: 'success', results: 'invalid' } });

    const articles = await fetchNewsApi('test-api-key');
    expect(articles).toEqual([]);
  });
});
