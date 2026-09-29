import { z } from 'zod';
import { generateJson, type LlmConfig } from './client.js';
import { findSummaryIssues, HYPE_WORDS, SUMMARY_FIELD_MAX } from './summary-lint.js';
import type { Article, DigestSummary } from '../feeds/types.js';

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
const summarySchema = z.object({
  // 欄の空は記事ごとに扱う。min(1) で縛るとバッチ全体が検証に落ち、5 件まとめて予備モデルでやり直すことになる
  // （2026-09-29 の見本づくりで 2 回とも 1 バッチずつ change が空で返った）
  items: z.array(z.object({ id: z.string(), what: z.string(), change: z.string(), tryIt: z.string() })),
});

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
          what: { type: 'string', description: '何が出たか・何が起きたか（日本語1文）' },
          change: { type: 'string', description: '従来との差。数字があれば数字で（日本語1文）' },
          tryIt: { type: 'string', description: '試せるリポジトリ・API・ツール名。無ければ空文字' },
        },
        required: ['id', 'what', 'change', 'tryIt'],
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
): Promise<Map<string, DigestSummary>> {
  const articleList = articles
    .map((a, i) => {
      const excerpt = a.content?.slice(0, CONTENT_EXCERPT_LENGTH) ?? '（本文なし）';
      return `[${i + 1}] id: "${a.id}"\n    タイトル: ${a.title}\n    URL: ${a.url}\n    本文抜粋: ${excerpt}`;
    })
    .join('\n\n');

  const prompt = `あなたはAI/テック専門のエンジニア向けキュレーターです。
以下の ${articles.length} 件の記事を、シニアエンジニアが朝に読む前提で、各記事 3 欄の日本語で要約してください。

- what: 何が出たか・何が起きたか。主語と固有名詞を入れた 1 文。
- change: 従来との差。ベンチマーク・パラメータ数・価格・版などの数字が記事にあれば数字で書く。無ければ何が変わったかを 1 文で。
- tryIt: 読者が試せるリポジトリ名・API 名・ツール名。記事に無ければ空文字。推測で作らない。

各欄は ${SUMMARY_FIELD_MAX} 文字以内。である調で書く。
次の誇張の語は使わず、数字か事実に置き換える: ${HYPE_WORDS.join('、')}。
記事に書かれていないことは書かない。
各要素の id には、記事リストの id をそのまま使ってください。

記事リスト:
${articleList}`;

  const parsed = await generateJson(llm, { prompt, schema: summarySchema, jsonSchema: summaryJsonSchema, schemaName: 'summaries' });

  const wanted = new Set(articles.map((a) => a.id));
  const summaryMap = new Map<string, DigestSummary>();
  for (const item of parsed.items) {
    if (!wanted.has(item.id)) continue;
    const what = item.what.trim();
    // 何がの欄が空の記事は要約なしにする（メールは本文の抜粋を出す）
    if (what === '') continue;
    const change = item.change.trim();
    const tryIt = item.tryIt.trim();
    summaryMap.set(item.id, { what, change: change === '' ? null : change, tryIt: tryIt === '' ? null : tryIt });
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
  const mergedMap = new Map<string, DigestSummary>();
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

  // 誇張の語・長すぎる欄・空の欄を数えて出す。止めずに監視に使う
  const issues = [...mergedMap.values()].flatMap((s) => findSummaryIssues(s));
  if (issues.length > 0) {
    console.warn(`[ai] 要約の指摘 ${issues.length} 件（先頭 5 件）:`, issues.slice(0, 5).join(' / '));
  }

  if (failedBatches > 0) {
    console.warn(`[ai] 要約に失敗したバッチ: ${failedBatches}/${batchCount}`);
  }

  return articles.map((article) => ({
    ...article,
    summary: mergedMap.get(article.id) ?? article.summary,
  }));
}
