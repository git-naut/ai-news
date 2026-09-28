import { z } from 'zod';
import { LOOKBACK_HOURS } from '../config/lookback.js';
import { stripHtml } from '../feeds/normalizer.js';
import type { Category } from '../config/categories.js';
import type { RawArticle } from '../feeds/types.js';
import type { FetchLike } from '../ai/client.js';

/**
 * Hacker News の公式検索 API（Algolia）。1 IP あたり 1 時間 10,000 リクエストまで。
 * 2026-09 まで使っていた hnrss.org は 5 本中 4 本が 502 やタイムアウトを返す日があった。
 */
const HN_SEARCH_URL = 'https://hn.algolia.com/api/v1/search_by_date';

/** 1 リクエストの時間制限（ミリ秒） */
const REQUEST_TIMEOUT_MS = 15_000;

/** 1 本の検索条件 */
export interface HnQuery {
  /** 表示名。ソース名は "Hacker News (<name>)" になる */
  name: string;
  /** 検索語。複数語は AND。タイトルだけを検索する */
  query: string;
  /** 点数の下限 */
  minPoints: number;
  /** 取る件数の上限 */
  maxItems: number;
  /** 既定のカテゴリ */
  category: Category;
}

/**
 * 既定の検索条件。公式 RSS の無い企業の動きを HN の話題で拾う。
 * 検索はタイトルだけにし、表記ゆれを許さない。許すと LLM が "LLC" に、Grok が無関係な記事に当たる
 * （2026-09-29 の実測）。
 */
export const HN_QUERIES: readonly HnQuery[] = [
  { name: 'LLM', query: 'LLM', minPoints: 50, maxItems: 8, category: 'AI/LLM' },
  { name: 'Llama/Meta', query: 'Llama', minPoints: 30, maxItems: 5, category: 'AI/LLM' },
  { name: 'DeepSeek', query: 'DeepSeek', minPoints: 50, maxItems: 5, category: 'AI/LLM' },
  { name: 'Mistral', query: 'Mistral', minPoints: 30, maxItems: 5, category: 'AI/LLM' },
  { name: 'Grok/xAI', query: 'Grok', minPoints: 30, maxItems: 5, category: 'AI/LLM' },
];

/** ヒット1件の形。url と story_text は値が無いときキーごと省かれる */
const hitSchema = z.object({
  objectID: z.string(),
  title: z.string().min(1),
  url: z.string().url().optional(),
  points: z.number(),
  created_at_i: z.number(),
  story_text: z.string().optional(),
});

/** fetchHackerNews に差し込める依存 */
export interface HnDeps {
  fetch?: FetchLike;
}

/**
 * 検索条件のソース名を返す。分類の既定カテゴリの表にもこの名前で載せる。
 * @param q 検索条件
 */
export function hnSourceName(q: Pick<HnQuery, 'name'>): string {
  return `Hacker News (${q.name})`;
}

/**
 * 1 本の検索条件で HN を問い合わせ、記事の形にして返す。
 * @param q 検索条件
 * @param now 基準時刻
 * @param f fetch
 */
async function fetchQuery(q: HnQuery, now: Date, f: FetchLike): Promise<RawArticle[]> {
  const since = Math.floor(now.getTime() / 1000) - LOOKBACK_HOURS * 3600;
  const params = new URLSearchParams({
    query: q.query,
    tags: 'story',
    numericFilters: `points>=${q.minPoints},created_at_i>${since}`,
    hitsPerPage: String(q.maxItems),
    restrictSearchableAttributes: 'title',
    typoTolerance: 'false',
  });
  const res = await f(`${HN_SEARCH_URL}?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body: unknown = JSON.parse(await res.text());
  const hits = typeof body === 'object' && body !== null && Array.isArray((body as { hits?: unknown }).hits)
    ? (body as { hits: unknown[] }).hits
    : [];

  const articles: RawArticle[] = [];
  for (const raw of hits) {
    const parsed = hitSchema.safeParse(raw);
    if (!parsed.success) continue;
    const h = parsed.data;
    const text = h.story_text ? stripHtml(h.story_text) : '';
    articles.push({
      title: h.title,
      url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      publishedAt: new Date(h.created_at_i * 1000),
      sourceName: hnSourceName(q),
      sourceUrl: 'https://news.ycombinator.com',
      content: text === '' ? null : text,
      language: 'en',
    });
  }
  return articles;
}

/**
 * HN の検索条件をすべて問い合わせる。1 本が失敗してもその 1 本を空にするだけで、他は残す。
 * @param queries 検索条件
 * @param now 基準時刻（通常は現在時刻）
 * @param deps テスト用の差し替え
 */
export async function fetchHackerNews(
  queries: readonly HnQuery[] = HN_QUERIES,
  now: Date = new Date(),
  deps: HnDeps = {}
): Promise<RawArticle[]> {
  const f = deps.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const results = await Promise.all(
    queries.map(async (q) => {
      try {
        const articles = await fetchQuery(q, now, f);
        console.log(`[hn] ${hnSourceName(q)}: ${articles.length}件取得`);
        return articles;
      } catch (error) {
        console.warn(`[hn] ${hnSourceName(q)} の取得に失敗しました:`, error instanceof Error ? error.message : String(error));
        return [];
      }
    })
  );
  return results.flat();
}
