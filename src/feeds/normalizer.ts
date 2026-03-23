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
 * rss-parser の出力を RawArticle の形式に正規化する。
 * 必須フィールドが欠損している場合は null を返す。
 */
export function normalizeItem(
  item: ParsedItem,
  source: FeedSource
): RawArticle | null {
  const title = item.title?.trim();
  const url = item.link?.trim();

  // タイトルと URL は必須
  if (!title || !url) return null;

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
    sourceUrl: new URL(url).origin,
    content,
    language: source.language,
  };
}
