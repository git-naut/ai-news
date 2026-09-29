import type { Category } from '../config/categories.js';

/** RSS/API から取得した生の記事データ */
export interface RawArticle {
  /** 記事タイトル */
  title: string;
  /** 記事 URL */
  url: string;
  /** 公開日時 */
  publishedAt: Date;
  /** ソース名（フィード名） */
  sourceName: string;
  /** ソースサイトの URL */
  sourceUrl: string;
  /** 本文抜粋（RSS の description または content:encoded）。取得できない場合は null */
  content: string | null;
  /** コンテンツ言語 */
  language: 'en' | 'ja';
}

/**
 * 3 行の要約。何が出たか・従来との差（数字があれば数字）・試せるもの、の 3 欄に分ける。
 * 欄を分けておくと、欠けた欄や誇張の語を機械で見つけられる（src/ai/summary-lint.ts）。
 */
export interface DigestSummary {
  /** 何が出たか・何が起きたか */
  what: string;
  /** 従来との差。数字があれば含める */
  change: string;
  /** 試せるもの（リポジトリ・API・ツール名）。無ければ null */
  tryIt: string | null;
}

/** 分類・要約処理後の記事データ */
export interface Article extends RawArticle {
  /** URL の SHA-256 ハッシュ先頭16文字（重複排除に使用） */
  id: string;
  /** 分類されたカテゴリ */
  category: Category;
  /** LLM で生成した 3 行の要約。生成に失敗した記事は null（メールでは本文の抜粋を出す） */
  summary: DigestSummary | null;
}
