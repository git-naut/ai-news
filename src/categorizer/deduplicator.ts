import type { RawArticle } from '../feeds/types.js';

/**
 * URL を正規化する（クエリパラメータ・フラグメントを除去、小文字化）。
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().toLowerCase().replace(/\/$/, '');
  } catch {
    return url.toLowerCase();
  }
}

/**
 * タイトルを単語トークンに分割する（英語・日本語対応）。
 */
function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\u3040-\u9faf\u30a0-\u30ff\uff65-\uff9f]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
  return new Set(tokens);
}

/**
 * 2つのテキストの Jaccard 係数を計算する。
 * 0.0（完全不一致）〜 1.0（完全一致）
 */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);

  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/** Jaccard 係数がこの値以上の場合に重複とみなす */
const DUPLICATE_THRESHOLD = 0.7;

/**
 * URL の完全一致またはタイトルの類似度で重複記事を除去する。
 * 重複が検出された場合は content が長い方（より詳細な方）を優先して残す。
 */
export function deduplicate(articles: RawArticle[]): RawArticle[] {
  const seen = new Map<string, RawArticle>();

  for (const article of articles) {
    const normalizedUrl = normalizeUrl(article.url);
    const existing = seen.get(normalizedUrl);

    if (existing) {
      // URL 完全一致: content が長い方を優先
      if ((article.content?.length ?? 0) > (existing.content?.length ?? 0)) {
        seen.set(normalizedUrl, article);
      }
      continue;
    }

    // タイトル類似度チェック（既存の全記事と比較）
    let isDuplicate = false;
    for (const [, existingArticle] of seen) {
      if (jaccardSimilarity(article.title, existingArticle.title) >= DUPLICATE_THRESHOLD) {
        isDuplicate = true;
        // content が長い方を優先
        if ((article.content?.length ?? 0) > (existingArticle.content?.length ?? 0)) {
          const existingUrl = normalizeUrl(existingArticle.url);
          seen.delete(existingUrl);
          seen.set(normalizedUrl, article);
        }
        break;
      }
    }

    if (!isDuplicate) {
      seen.set(normalizedUrl, article);
    }
  }

  return Array.from(seen.values());
}
