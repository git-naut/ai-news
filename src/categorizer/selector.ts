import type { RawArticle } from '../feeds/types.js';
import type { FeedSource } from '../config/feeds.js';
import { hnSourceName, type HnQuery } from '../hn/client.js';

/** 載せる順の段。1 が先 */
export type Tier = 1 | 2 | 3;

/** selectForDigest の設定 */
export interface SelectOptions {
  /** 載せる件数の上限 */
  limit: number;
  /** 記事の段を返す関数 */
  tierOf: (a: RawArticle) => Tier;
}

/**
 * ダイジェストに載せる記事を選ぶ。段の小さい順、同じ段の中は公開日時の新しい順に並べ、先頭から limit 件を取る。
 * 同じ段・同じ時刻の記事は入力の並びを保つ（Array.prototype.sort は安定）。入力の配列は変えない。
 * @param articles 重複排除と分類を済ませた記事
 * @param opts 上限と段の決め方
 */
export function selectForDigest<T extends RawArticle>(articles: readonly T[], opts: SelectOptions): T[] {
  const ranked = articles.map((a) => ({ a, tier: opts.tierOf(a) }));
  ranked.sort((x, y) => x.tier - y.tier || y.a.publishedAt.getTime() - x.a.publishedAt.getTime());
  return ranked.slice(0, opts.limit).map((r) => r.a);
}

/**
 * 取得元の表から、記事の段を返す関数を作る。
 * 段1 は英語の RSS と Hacker News、段2 は日本語の RSS、段3 はそれ以外（NewsData.io の媒体）。
 * @param feeds RSS の取得元
 * @param hnQueries HN の検索条件（ソース名は hnSourceName で作る）
 */
export function buildTierOf(
  feeds: readonly Pick<FeedSource, 'name' | 'language'>[],
  hnQueries: readonly Pick<HnQuery, 'name'>[]
): (a: RawArticle) => Tier {
  const table = new Map<string, Tier>();
  for (const f of feeds) table.set(f.name, f.language === 'ja' ? 2 : 1);
  for (const q of hnQueries) table.set(hnSourceName(q), 1);
  return (a) => table.get(a.sourceName) ?? 3;
}

/**
 * 段ごとの件数を数える。上限で落とした件数をログに出すのに使う。
 * @param articles 数える記事
 * @param tierOf 記事の段を返す関数
 */
export function countByTier(articles: readonly RawArticle[], tierOf: (a: RawArticle) => Tier): Record<Tier, number> {
  const counts: Record<Tier, number> = { 1: 0, 2: 0, 3: 0 };
  for (const a of articles) counts[tierOf(a)]++;
  return counts;
}
