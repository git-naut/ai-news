import { createHash } from 'node:crypto';
import { CATEGORY_KEYWORDS } from '../config/categories.js';
import type { Category } from '../config/categories.js';
import type { RawArticle } from '../feeds/types.js';
import type { Article } from '../feeds/types.js';
import type { FeedSource } from '../config/feeds.js';

/** 英字キーワードごとに組み立てた正規表現の置き場。同じキーワードを毎回組み直さない */
const keywordPatternCache = new Map<string, RegExp>();

/** これ以上の長さで英字で終わるキーワードは前方一致を許す（agent → agentic、llama → llamaindex） */
const PREFIX_MATCH_MIN_LENGTH = 5;

/**
 * キーワードの後ろに続いてよい文字の条件（否定先読み）を返す。
 * 数字で終わる語（gpt-5、o3）は後ろに数字が続くと別物（gpt-50、o30）なので英数字を拒む。
 * 英字で終わる短い語（rag、go、rust）は後ろの英字だけを拒み、gpt4o や llama3 の数字は許す。
 * 英字で終わる長い語は前方一致にする。
 * @param keyword 小文字のキーワード
 */
function trailingGuard(keyword: string): string {
  if (/[0-9]$/.test(keyword)) return 's?(?![a-z0-9])';
  if (/[a-z]$/.test(keyword) && keyword.length >= PREFIX_MATCH_MIN_LENGTH) return '';
  return 's?(?![a-z])';
}

/**
 * 小文字化済みの本文にキーワードが含まれるかを判定する。
 * ASCII だけでできたキーワードは、前が英数字でない位置でのみ一致させ、
 * storage の中の rag や google の中の go を拾わない。後ろの扱いは trailingGuard が決める。
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
    pattern = new RegExp(`(?<![a-z0-9])${escaped}${trailingGuard(keyword)}`);
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
 * フィードや HN の検索条件の一覧から sourceName → category のマップを構築する。
 */
export function buildSourceCategoryMap(sources: ReadonlyArray<Pick<FeedSource, 'name' | 'category'>>): Map<string, Category> {
  return new Map(sources.map((s) => [s.name, s.category]));
}
