import { createHash } from 'node:crypto';
import { CATEGORY_KEYWORDS } from '../config/categories.js';
import type { Category } from '../config/categories.js';
import type { RawArticle } from '../feeds/types.js';
import type { Article } from '../feeds/types.js';
import type { FeedSource } from '../config/feeds.js';

/** 英字キーワードごとに組み立てた正規表現の置き場。同じキーワードを毎回組み直さない */
const keywordPatternCache = new Map<string, RegExp>();

/**
 * 小文字化済みの本文にキーワードが含まれるかを判定する。
 * ASCII だけでできたキーワードは前後が英数字でない位置でのみ一致させ、
 * storage の中の rag や google の中の go を拾わない。末尾の複数形 s は許す。
 * 日本語を含むキーワードは語の境界が定まらないので部分一致のまま照合する。
 * @param text 小文字化済みの本文
 * @param keyword 小文字のキーワード
 */
export function matchesKeyword(text: string, keyword: string): boolean {
  if (!/^[\x00-\x7f]+$/.test(keyword)) {
    return text.includes(keyword);
  }
  let pattern = keywordPatternCache.get(keyword);
  if (!pattern) {
    // c++ や gpt-5 の記号を正規表現として解釈させないよう退避する
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
    pattern = new RegExp(`(?<![a-z0-9])${escaped}s?(?![a-z0-9])`);
    keywordPatternCache.set(keyword, pattern);
  }
  return pattern.test(text);
}

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
    if (keywords.some((kw) => matchesKeyword(text, kw))) {
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
