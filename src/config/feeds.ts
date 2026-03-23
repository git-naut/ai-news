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
  // --- AI/LLM 公式ブログ ---
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/news/rss.xml',
    category: 'AI/LLM',
    language: 'en',
    maxItems: 5,
  },
  {
    name: 'Anthropic Engineering',
    url: 'https://raw.githubusercontent.com/conoro/anthropic-engineering-rss-feed/main/anthropic_engineering_rss.xml',
    category: 'AI/LLM',
    language: 'en',
    maxItems: 5,
  },
  {
    name: 'Google AI Blog',
    url: 'http://googleaiblog.blogspot.com/atom.xml',
    category: 'AI/LLM',
    language: 'en',
    maxItems: 5,
  },
  {
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    category: 'AI/LLM',
    language: 'en',
    maxItems: 5,
  },
  // --- テック総合 ---
  {
    name: 'Hacker News (AI)',
    url: 'https://hnrss.org/newest?q=AI+LLM&points=50',
    category: 'Tech',
    language: 'en',
    maxItems: 10,
  },
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'Tech',
    language: 'en',
    maxItems: 5,
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'Tech',
    language: 'en',
    maxItems: 5,
  },
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
