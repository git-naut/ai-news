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

/** 分類・要約処理後の記事データ */
export interface Article extends RawArticle {
  /** URL の SHA-256 ハッシュ先頭16文字（重複排除に使用） */
  id: string;
  /** 分類されたカテゴリ */
  category: Category;
  /** Gemini API で生成した要約（2〜3文）。生成失敗時は null */
  summary: string | null;
}
