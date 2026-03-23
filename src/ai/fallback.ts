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
 * Gemini API が完全に利用不可の場合に、全記事にフォールバック要約を適用する。
 * カテゴリは各記事の既存の category フィールドを使用する。
 */
export function applyFallbackSummaries(
  articles: (RawArticle & { id: string; category: Category })[]
): Article[] {
  return articles.map((article) => ({
    ...article,
    summary: generateFallbackSummary(article),
  }));
}
