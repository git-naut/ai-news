import type { RawArticle } from '../feeds/types.js';
import type { Article } from '../feeds/types.js';
import type { Category } from '../config/categories.js';

/** フォールバック時の本文抜粋の最大文字数 */
const FALLBACK_SUMMARY_LENGTH = 150;

/**
 * Gemini API が利用不可の場合に、記事の content から簡易要約を生成する。
 * content が存在しない場合は null を返す。
 */
export function generateFallbackSummary(article: RawArticle): string | null {
  if (!article.content) return null;
  const text = article.content.trim();
  if (text.length <= FALLBACK_SUMMARY_LENGTH) return text;
  return text.slice(0, FALLBACK_SUMMARY_LENGTH) + '…';
}

/**
 * LLM が完全に利用不可の場合に、全記事を要約なし（summary: null）の Article にする。
 * メールは要約の代わりに本文の抜粋（generateFallbackSummary）を出す。
 */
export function applyFallbackSummaries(
  articles: (RawArticle & { id: string; category: Category })[]
): Article[] {
  return articles.map((article) => ({
    ...article,
    summary: null,
  }));
}
