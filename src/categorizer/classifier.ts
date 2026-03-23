import { createHash } from 'node:crypto';
import { CATEGORY_KEYWORDS } from '../config/categories.js';
import type { Category } from '../config/categories.js';
import type { RawArticle } from '../feeds/types.js';
import type { Article } from '../feeds/types.js';
import type { FeedSource } from '../config/feeds.js';

/**
 * 記事のタイトルと本文をキーワードマッチングでカテゴリ分類する。
 * 複数カテゴリにマッチする場合は最初にマッチしたカテゴリを優先する。
 * いずれにもマッチしない場合はフィードのデフォルトカテゴリを使用する。
 */
export function classifyArticle(
  article: RawArticle,
  defaultCategory: Category
): Category {
  const text = `${article.title} ${article.content ?? ''}`.toLowerCase();

  // カテゴリの優先順（AI/LLM > Japan > Development > Tech）
  const priorityOrder: Category[] = ['AI/LLM', 'Japan', 'Development', 'Tech'];

  for (const category of priorityOrder) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }

  return defaultCategory;
}

/**
 * 全記事をキーワードベースで分類し、Article 型（id + category 付き）に変換する。
 * @param articles 生記事の配列
 * @param sourceCategoryMap フィード名 → デフォルトカテゴリのマップ
 */
export function classifyArticles(
  articles: RawArticle[],
  sourceCategoryMap: Map<string, Category>
): (RawArticle & { id: string; category: Category })[] {
  return articles.map((article) => {
    const defaultCategory = sourceCategoryMap.get(article.sourceName) ?? 'Tech';
    const category = classifyArticle(article, defaultCategory);
    const id = createHash('sha256').update(article.url).digest('hex').slice(0, 16);

    return { ...article, id, category };
  });
}

/**
 * RSS_FEEDS 配列から sourceName → category のマップを構築する。
 */
export function buildSourceCategoryMap(sources: FeedSource[]): Map<string, Category> {
  return new Map(sources.map((s) => [s.name, s.category]));
}
