import Parser from 'rss-parser';
import pLimit from 'p-limit';
import { normalizeItem } from './normalizer.js';
import type { RawArticle } from './types.js';
import type { FeedSource } from '../config/feeds.js';
import { isWithinLookback } from '../config/lookback.js';

/** rss-parser のカスタムフィールド型 */
type CustomItem = {
  'content:encoded'?: string;
  contentEncoded?: string;
};

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: [['content:encoded', 'contentEncoded']],
  },
  timeout: 10000,
});

/** 並列 HTTP 接続数の上限 */
const REQUEST_CONCURRENCY = 5;

/**
 * 1つの RSS/Atom フィードを取得して RawArticle の配列を返す。
 * ネットワークエラーやパースエラーが発生した場合は空配列を返す（パイプラインを止めない）。
 */
async function fetchFeed(source: FeedSource): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const now = new Date();

    const articles: RawArticle[] = [];

    for (const item of feed.items) {
      if (articles.length >= source.maxItems) break;

      const article = normalizeItem(item, source);
      if (!article) continue;
      // 取得窓の外の記事は捨てる（窓の長さは config/lookback.ts で NewsData と共有）
      if (!isWithinLookback(article.publishedAt, now)) continue;

      articles.push(article);
    }

    console.log(`[feeds] ${source.name}: ${articles.length}件取得`);
    return articles;
  } catch (error) {
    console.warn(`[feeds] ${source.name} の取得に失敗しました:`, (error as Error).message);
    return [];
  }
}

/**
 * 全 RSS フィードを並列取得して RawArticle の配列に結合して返す。
 * @param sources 取得対象のフィードソース配列
 */
export async function fetchAllFeeds(sources: FeedSource[]): Promise<RawArticle[]> {
  const limit = pLimit(REQUEST_CONCURRENCY);
  const results = await Promise.all(
    sources.map((source) => limit(() => fetchFeed(source)))
  );
  return results.flat();
}
