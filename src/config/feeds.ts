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
    // Claude Opus 4.6, Claude Sonnet 4.6, Claude Haiku 4.5
    name: 'Anthropic Blog',
    url: 'https://raw.githubusercontent.com/conoro/anthropic-engineering-rss-feed/main/anthropic_engineering_rss.xml',
    category: 'AI/LLM',
    language: 'en',
    maxItems: 5,
  },
  {
    // Gemini 3.1 Pro, Gemini 3.1 Flash
    name: 'Google DeepMind',
    url: 'https://blog.google/technology/google-deepmind/rss/',
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
];
