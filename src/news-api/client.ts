import axios from 'axios';
import { stripHtml } from '../feeds/normalizer.js';
import { NewsdataResponseSchema } from './types.js';
import type { RawArticle } from '../feeds/types.js';

const NEWSDATA_API_BASE = 'https://newsdata.io/api/1/news';

/** 1日に実行するクエリ一覧 */
const QUERIES = [
  'AI LLM',
  'machine learning ChatGPT',
  'generative AI artificial intelligence',
];

/**
 * NewsData.io から最新ニュースを取得して RawArticle の配列を返す。
 * API キーが未設定または取得エラーの場合は空配列を返す。
 * @param apiKey NewsData.io の API キー
 */
export async function fetchNewsApi(apiKey: string): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];

  for (const query of QUERIES) {
    try {
      const response = await axios.get(NEWSDATA_API_BASE, {
        params: {
          apikey: apiKey,
          q: query,
          language: 'en,ja',
          size: 10,
        },
        timeout: 10000,
      });

      const parsed = NewsdataResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        console.warn('[news-api] レスポンスのパースに失敗しました:', parsed.error.message);
        continue;
      }

      for (const item of parsed.data.results) {
        const rawContent = item.content ?? item.description ?? null;
        const content = rawContent ? stripHtml(rawContent).slice(0, 1000) : null;

        const dateStr = item.pubDate;
        const publishedAt = dateStr ? new Date(dateStr) : new Date();
        if (isNaN(publishedAt.getTime())) continue;

        // 24時間以内の記事のみ追加
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (publishedAt < cutoff) continue;

        articles.push({
          title: item.title,
          url: item.link,
          publishedAt,
          sourceName: item.source_name,
          sourceUrl: item.source_url ?? new URL(item.link).origin,
          content,
          language: (item.language === 'ja' || item.language === 'japanese') ? 'ja' : 'en',
        });
      }

      console.log(`[news-api] "${query.slice(0, 30)}...": ${parsed.data.results.length}件取得`);
    } catch (error) {
      console.warn('[news-api] API 呼び出しに失敗しました:', (error as Error).message);
    }
  }

  return articles;
}
