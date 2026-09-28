import { z } from 'zod';
import { generateJson, type LlmConfig } from './client.js';
import type { Article } from '../feeds/types.js';

/** 1回の LLM 呼び出しで処理する記事数 */
const BATCH_SIZE = 5;

/**
 * リクエストの間隔（ミリ秒）。10 RPM = 6秒/リクエスト。
 * バッチは直列に送り、2 本目以降の前にこの時間だけ待つ。旧実装は並列 2 本で
 * 各 6 秒待っていたため、実効は 20 RPM に達しえた。
 */
const REQUEST_INTERVAL_MS = 6000;

/** 要約に渡す本文の最大長 */
const CONTENT_EXCERPT_LENGTH = 500;

/** 要約の応答スキーマ（検証用） */
const summarySchema = z.object({ items: z.array(z.object({ id: z.string(), summary: z.string().min(1) })) });

/** 要約の応答スキーマ（構造化出力として API に渡す） */
const summaryJsonSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '記事ID' },
          summary: { type: 'string', description: '日本語で2〜3文の要約' },
        },
        required: ['id', 'summary'],
      },
    },
  },
  required: ['items'],
};

/** batchSummarize に差し込める依存 */
export interface SummarizeDeps {
  sleep?: (ms: number) => Promise<void>;
}

/** sleep ユーティリティ */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 5記事をまとめて1回の LLM 呼び出しで要約する。
 * @returns 記事 ID をキー、要約テキストを値とする Map。依頼した記事の ID だけを含む
 */
async function summarizeBatch(
  llm: LlmConfig,
  articles: Article[]
): Promise<Map<string, string>> {
  const articleList = articles
    .map((a, i) => {
      const excerpt = a.content?.slice(0, CONTENT_EXCERPT_LENGTH) ?? '（本文なし）';
      return `[${i + 1}] id: "${a.id}"\n    タイトル: ${a.title}\n    URL: ${a.url}\n    本文抜粋: ${excerpt}`;
    })
    .join('\n\n');

  const prompt = `あなたはAI/テック専門のエンジニア向けキュレーターです。
以下の ${articles.length} 件の記事について、シニアエンジニアが読んで価値を感じるよう、
それぞれ日本語で2〜3文の要約を作成してください。

要約に含めるべき優先事項（情報がある場合は必ず含める）:
1. 何が変わったか・何が新しいか（従来との差分・変化点）
2. 実装・試用できるか（GitHub リポジトリ名 / API / ライブラリ名）
3. 具体的な数値・ベンチマーク・パラメータ数

各要素の id には、記事リストの id をそのまま使ってください。

記事リスト:
${articleList}`;

  const parsed = await generateJson(llm, { prompt, schema: summarySchema, jsonSchema: summaryJsonSchema, schemaName: 'summaries' });

  const wanted = new Set(articles.map((a) => a.id));
  const summaryMap = new Map<string, string>();
  for (const item of parsed.items) {
    if (wanted.has(item.id)) summaryMap.set(item.id, item.summary);
  }
  return summaryMap;
}

/**
 * 全記事を BATCH_SIZE 件ずつ LLM でバッチ要約する。
 * バッチは直列に送り、失敗したバッチはそのバッチの記事だけ summary を null のまま残す。
 * 1 バッチの失敗で全件の要約を捨てることはしない。
 * @param llm LLM の接続先
 * @param articles 要約する記事
 * @param deps テスト用の差し替え
 */
export async function batchSummarize(
  llm: LlmConfig,
  articles: Article[],
  deps: SummarizeDeps = {}
): Promise<Article[]> {
  const wait = deps.sleep ?? sleep;
  const mergedMap = new Map<string, string>();
  let failedBatches = 0;
  let batchCount = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    if (batchCount > 0) await wait(REQUEST_INTERVAL_MS);
    batchCount++;
    const batch = articles.slice(i, i + BATCH_SIZE);
    try {
      for (const [id, summary] of await summarizeBatch(llm, batch)) {
        mergedMap.set(id, summary);
      }
    } catch (error) {
      failedBatches++;
      console.warn(
        `[ai] バッチ ${batchCount} の要約に失敗しました（${batch.length}件は本文の抜粋で代用）:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (failedBatches > 0) {
    console.warn(`[ai] 要約に失敗したバッチ: ${failedBatches}/${batchCount}`);
  }

  return articles.map((article) => ({
    ...article,
    summary: mergedMap.get(article.id) ?? article.summary,
  }));
}
