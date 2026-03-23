import pLimit from 'p-limit';
import { generateText } from './client.js';
import type { Article } from '../feeds/types.js';

/** 1回の Gemini API 呼び出しで処理する記事数 */
const BATCH_SIZE = 5;

/** Gemini API への同時リクエスト数（10 RPM 制限に対応） */
const GEMINI_CONCURRENCY = 2;

/** リクエスト間の最小待機時間（ミリ秒）: 10 RPM = 6秒/リクエスト */
const REQUEST_INTERVAL_MS = 6000;

/** JSON レスポンスから要約を取得できなかった記事の最大コンテンツ長 */
const CONTENT_EXCERPT_LENGTH = 500;

/** sleep ユーティリティ */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 5記事をまとめて1回の Gemini API 呼び出しで要約する。
 * @returns 記事 ID をキー、要約テキストを値とする Map
 */
async function summarizeBatch(
  apiKey: string,
  articles: Article[]
): Promise<Map<string, string>> {
  const articleList = articles
    .map((a, i) => {
      const excerpt = a.content?.slice(0, CONTENT_EXCERPT_LENGTH) ?? '（本文なし）';
      return `[${i + 1}] タイトル: ${a.title}\n    URL: ${a.url}\n    本文抜粋: ${excerpt}`;
    })
    .join('\n\n');

  const prompt = `あなたはAI/テック専門の編集者です。
以下の ${articles.length} 件の記事について、それぞれ日本語で2〜3文の要約を作成してください。
要約は技術的な読者向けで、重要なポイントのみを含めること。
必ず以下の JSON 配列形式のみで返すこと（コードブロックや説明文は不要）:
[{"id": "記事ID", "summary": "要約テキスト"}]

記事リスト:
${articleList}

各記事の id フィールドには以下の値を使用してください:
${articles.map((a, i) => `[${i + 1}] id: "${a.id}"`).join('\n')}`;

  const responseText = await generateText(apiKey, prompt);

  const summaryMap = new Map<string, string>();

  try {
    // JSON 部分を抽出してパース
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('JSON 配列が見つかりません');

    const parsed = JSON.parse(jsonMatch[0]) as { id: string; summary: string }[];
    for (const item of parsed) {
      if (item.id && item.summary) {
        summaryMap.set(item.id, item.summary);
      }
    }
  } catch (error) {
    console.warn('[ai] 要約レスポンスのパースに失敗:', (error as Error).message);
  }

  return summaryMap;
}

/**
 * 全記事を BATCH_SIZE 件ずつ Gemini API でバッチ要約する。
 * 要約取得に失敗した記事の summary は null のまま保持する。
 */
export async function batchSummarize(
  apiKey: string,
  articles: Article[]
): Promise<Article[]> {
  const limit = pLimit(GEMINI_CONCURRENCY);
  const batches: Article[][] = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    batches.push(articles.slice(i, i + BATCH_SIZE));
  }

  const summaryMaps = await Promise.all(
    batches.map((batch, index) =>
      limit(async () => {
        if (index > 0) await sleep(REQUEST_INTERVAL_MS);
        return summarizeBatch(apiKey, batch);
      })
    )
  );

  // 全バッチの要約 Map をマージ
  const mergedMap = new Map<string, string>();
  for (const map of summaryMaps) {
    for (const [id, summary] of map) {
      mergedMap.set(id, summary);
    }
  }

  return articles.map((article) => ({
    ...article,
    summary: mergedMap.get(article.id) ?? article.summary,
  }));
}
