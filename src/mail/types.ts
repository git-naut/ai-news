import type { Trend } from '../ai/trend-analyzer.js';

/** テンプレートに渡す1記事分のデータ */
export interface ArticleTemplateData {
  title: string;
  url: string;
  sourceName: string;
  summary: string;
  publishedAt: string; // フォーマット済み文字列
  githubUrl: string | null; // 本文中に GitHub リンクがある場合のみ設定
}

/** 2カラムレイアウト用の記事ペア */
export interface ArticlePair {
  left: ArticleTemplateData;
  right: ArticleTemplateData | null; // 奇数件数の末尾はnull
}

/** テンプレートに渡すカテゴリセクションのデータ */
export interface CategorySection {
  name: string;
  /** Material Icons のアイコン名 */
  icon: string;
  articles: ArticleTemplateData[];     // テキストテンプレート用
  articlePairs: ArticlePair[];         // 2カラムHTMLテンプレート用
}

/** Handlebars テンプレートに渡すデータ全体 */
export interface DigestTemplateData {
  /** 配信日時（"2026年03月23日 09:00 JST" 形式） */
  deliveryDate: string;
  /** 配信記事の総数 */
  totalCount: number;
  /** カテゴリ別セクション */
  categories: CategorySection[];
  /** Gemini API が生成したトレンド分析。未取得の場合は空配列 */
  trends: Trend[];
  /** トレンドセクションを表示するかどうか */
  hasTrends: boolean;
}

/** メール送信に必要なデータ */
export interface EmailPayload {
  html: string;
  text: string;
  totalCount: number;
  deliveryDate: string;
}
