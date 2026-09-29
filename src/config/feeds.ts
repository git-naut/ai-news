import type { Category } from './categories.js';

/** RSS フィードソースの定義 */
export interface FeedSource {
  /** 表示名 */
  name: string;
  /** RSS/Atom フィード URL */
  url: string;
  /** デフォルトカテゴリ（記事単位で上書き可） */
  category: Category;
  /** コンテンツ言語 */
  language: 'en' | 'ja';
  /** 1フィードから取得する最大記事数（公開日降順） */
  maxItems: number;
}

/** 取得対象の RSS フィード一覧 */
export const RSS_FEEDS: FeedSource[] = [
  // --- 公式ブログ（RSS あり）---
  {
    // GPT-5.4, o3 など
    name: 'OpenAI Blog',
    url: 'https://openai.com/news/rss.xml',
    category: 'AI/LLM',
    language: 'en',
    maxItems: 5,
  },
  {
    // Anthropic は公式の RSS を出していない。Olshansk/rss-feeds が anthropic.com/news を巡回して作る第三者のフィード。
    // 2026-09-29 まで使っていた conoro 版は 2025-11-24 で更新が止まり、10 か月気づかなかった
    name: 'Anthropic Blog',
    url: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml',
    category: 'AI/LLM',
    language: 'en',
    maxItems: 5,
  },
  {
    // deepmind.google 自身の RSS。blog.google 側のフィードは 2026-09-09 から記事が増えていなかった（09-29 の実測）
    name: 'Google DeepMind',
    url: 'https://deepmind.google/blog/rss.xml',
    category: 'AI/LLM',
    language: 'en',
    maxItems: 5,
  },
  {
    // Phi-4, Phi-4-reasoning, Phi-4-multimodal
    name: 'Microsoft Research',
    url: 'https://www.microsoft.com/en-us/research/feed/',
    category: 'AI/LLM',
    language: 'en',
    maxItems: 5,
  },
  {
    // オープンモデル・ライブラリ情報
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    category: 'AI/LLM',
    language: 'en',
    maxItems: 5,
  },

  // Hacker News は hnrss.org をやめ、公式の検索 API で取る（src/hn/client.ts の HN_QUERIES）

  // --- 日本語ソース ---
  {
    name: 'Publickey',
    url: 'https://www.publickey1.jp/atom.xml',
    category: 'Development',
    language: 'ja',
    maxItems: 5,
  },
  {
    name: 'Zenn トレンド',
    url: 'https://zenn.dev/feed',
    category: 'Development',
    language: 'ja',
    maxItems: 5,
  },
  {
    name: 'Qiita 人気記事',
    url: 'https://qiita.com/popular-items/feed.atom',
    category: 'Development',
    language: 'ja',
    maxItems: 5,
  },
  // @IT と ITmedia AI+ は同じ記事を両方に載せることがある（09-29 の実測で数件）。
  // 重複は deduplicate（URL とタイトルの類似度）が1件に絞る
  {
    name: '@IT',
    url: 'https://rss.itmedia.co.jp/rss/2.0/ait.xml',
    category: 'Development',
    language: 'ja',
    maxItems: 5,
  },
  {
    name: 'ITmedia AI+',
    url: 'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml',
    category: 'AI/LLM',
    language: 'ja',
    maxItems: 5,
  },
];
