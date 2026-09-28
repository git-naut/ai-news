import { createHash } from 'node:crypto';
import type { RawArticle } from './types.js';
import type { FeedSource } from '../config/feeds.js';

/**
 * URL から重複排除用の ID を生成する（SHA-256 先頭16文字）。
 */
export function generateArticleId(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 16);
}

/**
 * HTML タグを除去してプレーンテキストに変換する。
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** rss-parser が返す1記事のデータ型（使用するフィールドのみ） */
interface ParsedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  'content:encoded'?: string;
  contentEncoded?: string;
}

/**
 * 記事のリンクを絶対 URL に解決する。
 * 絶対 URL はそのまま返し、相対リンクは base を基準に解決する。
 * 解決できないリンクと http(s) 以外のリンクは null を返す（例外は投げない）。
 */
function resolveLink(link: string, base: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(link, base);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return parsed;
}

/**
 * rss-parser の出力を RawArticle の形式に正規化する。
 * 必須フィールドが欠損している場合や、リンクを URL として解決できない場合は null を返す。
 * 1記事の不正で例外を投げると fetchFeed がフィードごと捨てるため、ここでは投げない。
 * @param item rss-parser が返した1記事
 * @param source 取得元のフィード設定
 * @param baseUrl 相対リンクの基準（フィードの link）。省略時は source.url を使う
 */
export function normalizeItem(
  item: ParsedItem,
  source: FeedSource,
  baseUrl?: string
): RawArticle | null {
  const title = item.title?.trim();
  const link = item.link?.trim();

  // タイトルと URL は必須
  if (!title || !link) return null;

  // 相対リンクは絶対 URL に直し、壊れたリンクはこの記事だけ捨てる
  const resolved = resolveLink(link, baseUrl ?? source.url);
  if (!resolved) return null;
  // 元から絶対 URL なら表記を変えない（記事 ID が URL 文字列から作られるため）
  const url = URL.canParse(link) ? link : resolved.href;

  // 公開日時の取得（isoDate → pubDate の優先順）
  const dateStr = item.isoDate ?? item.pubDate;
  const publishedAt = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(publishedAt.getTime())) return null;

  // 本文抜粋: content:encoded > content > contentSnippet の順で優先
  const rawContent =
    item.contentEncoded ??
    item['content:encoded'] ??
    item.content ??
    item.contentSnippet ??
    null;

  const content = rawContent ? stripHtml(rawContent).slice(0, 1000) : null;

  return {
    title,
    url,
    publishedAt,
    sourceName: source.name,
    sourceUrl: resolved.origin,
    content,
    language: source.language,
  };
}
