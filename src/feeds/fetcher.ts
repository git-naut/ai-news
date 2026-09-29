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

/** これより長く新しい記事が出ていないフィードを「止まった」とみなす日数 */
export const STALE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 1 本のフィードを取った結果 */
interface FeedResult {
  /** 取得窓の内側にあり、maxItems で切った記事 */
  articles: RawArticle[];
  /** 取得窓で絞る前の、いちばん新しい記事の公開日時。記事が0件なら null */
  newest: Date | null;
  /** 取得かパースに失敗したか */
  failed: boolean;
}

/** fetchAllFeedsWithReport の戻り値 */
export interface FeedReport {
  /** 全フィードの記事 */
  articles: RawArticle[];
  /** 最新の記事が STALE_DAYS より古いか、記事が0件のフィード。取得に失敗したものは含めない */
  stale: { name: string; newest: Date | null }[];
  /** 取得かパースに失敗したフィードの名前 */
  failed: string[];
}

/**
 * 1つの RSS/Atom フィードを取得して記事と最新の公開日時を返す。
 * ネットワークエラーやパースエラーが発生した場合は failed を立てて空で返す（パイプラインを止めない）。
 * @param source 取得するフィード
 * @param now 取得窓の基準時刻
 */
async function fetchFeed(source: FeedSource, now: Date): Promise<FeedResult> {
  try {
    const feed = await parser.parseURL(source.url);

    const articles: RawArticle[] = [];
    let newest: Date | null = null;

    for (const item of feed.items) {
      // 相対リンクはフィードが示すサイトの link を基準にする。XML の置き場所（raw.githubusercontent.com など）は
      // サイトと別のホストのことがあり、そこを基準にすると存在しない URL になる
      const article = normalizeItem(item, source, feed.link);
      if (!article) continue;
      // 最新日時は取得窓で絞る前に取る。絞った後に取ると、週末に静かなだけのフィードまで止まった扱いになる
      if (newest === null || article.publishedAt > newest) newest = article.publishedAt;
      // 取得窓の外の記事は捨てる（窓の長さは config/lookback.ts で NewsData と共有）
      if (!isWithinLookback(article.publishedAt, now)) continue;
      if (articles.length >= source.maxItems) continue;

      articles.push(article);
    }

    console.log(`[feeds] ${source.name}: ${articles.length}件取得`);
    return { articles, newest, failed: false };
  } catch (error) {
    console.warn(`[feeds] ${source.name} の取得に失敗しました:`, (error as Error).message);
    return { articles: [], newest: null, failed: true };
  }
}

/**
 * 最新の公開日時から、フィードが止まっているかを返す。記事が0件（null）も止まった側に数える。
 * @param newest 最新の記事の公開日時
 * @param now 基準時刻
 */
function isStale(newest: Date | null, now: Date): boolean {
  return newest === null || now.getTime() - newest.getTime() > STALE_DAYS * DAY_MS;
}

/**
 * 全 RSS フィードを並列取得し、記事と取得元の健康状態をまとめて返す。
 * 2025-11 に Anthropic の第三者フィードが止まり、10 か月誰も気づかなかった。止まったフィードを名前で返す。
 * @param sources 取得対象のフィードソース配列
 * @param now 基準時刻（通常は現在時刻）
 */
export async function fetchAllFeedsWithReport(sources: FeedSource[], now: Date = new Date()): Promise<FeedReport> {
  const limit = pLimit(REQUEST_CONCURRENCY);
  const results = await Promise.all(
    sources.map((source) => limit(() => fetchFeed(source, now)))
  );
  const report: FeedReport = { articles: [], stale: [], failed: [] };
  results.forEach((r, i) => {
    const name = sources[i]?.name ?? '';
    report.articles.push(...r.articles);
    if (r.failed) report.failed.push(name);
    else if (isStale(r.newest, now)) report.stale.push({ name, newest: r.newest });
  });
  return report;
}

/**
 * 全 RSS フィードを並列取得して RawArticle の配列に結合して返す。
 * @param sources 取得対象のフィードソース配列
 */
export async function fetchAllFeeds(sources: FeedSource[]): Promise<RawArticle[]> {
  return (await fetchAllFeedsWithReport(sources)).articles;
}
