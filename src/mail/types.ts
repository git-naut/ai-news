import type { Trend } from '../ai/trend-analyzer.js';
import type { DigestSummary } from '../feeds/types.js';

/** テンプレートに渡す1記事分のデータ */
export interface ArticleTemplateData {
  title: string;
  url: string;
  sourceName: string;
  /** 3 行の要約。LLM が失敗した記事は null */
  summary: DigestSummary | null;
  /** 要約が無い記事に出す本文の抜粋。要約がある記事は null */
  excerpt: string | null;
  publishedAt: string; // フォーマット済み文字列
  githubUrl: string | null; // 本文中に GitHub リンクがある場合のみ設定
}

/** テンプレートに渡すカテゴリセクションのデータ */
export interface CategorySection {
  name: string;
  /** 見出しの記号（Gmail が Web フォントを読まないので Unicode 記号を使う。例 ◇） */
  icon: string;
  articles: ArticleTemplateData[];
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
  /** 更新が止まった・取得に失敗した取得元の説明。問題が無ければ空 */
  sourceNotes: string[];
}

/**
 * 配信の種類。primary は cron-job.org 起動の定時配信、backup は primary が
 * 届かなかった日に GitHub schedule が送る予備配信、manual は手動の即時送信。
 */
export type DeliveryKind = 'primary' | 'backup' | 'manual';

/** メール送信に必要なデータ */
export interface EmailPayload {
  html: string;
  text: string;
  totalCount: number;
  deliveryDate: string;
  deliveryKind: DeliveryKind;
}
