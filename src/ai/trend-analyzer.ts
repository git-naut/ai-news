import { z } from 'zod';
import { generateJson, type LlmConfig } from './client.js';
import type { Article } from '../feeds/types.js';

/** トレンド分析結果の1項目 */
export interface Trend {
  /** トレンドのタイトル（短い見出し） */
  trend: string;
  /** 1〜2文の技術的説明 */
  description: string;
  /** エンジニアが今週試すべき具体的アクション（リポジトリ名・ツール名・APIなど） */
  action?: string;
}

/**
 * トレンドの各欄の上限（文字数）。2026-09-29 の見本では、トレンドの欄だけでスマホの画面が約 1,200px あり、
 * 記事が下に押しやられた。プロンプトで指示し、超えた分は受け取った側で切る。
 */
export const TREND_LIMITS = { trend: 20, description: 80, action: 50 } as const;

/** 載せるトレンドの最大件数 */
export const TREND_MAX = 4;

/**
 * 文字列を上限の長さに収める。超えるときは上限の 1 文字手前で切って「…」を付ける。
 * @param s 文字列
 * @param max 上限（文字数）
 */
function clamp(s: string, max: number): { text: string; cut: boolean } {
  const chars = [...s];
  if (chars.length <= max) return { text: s, cut: false };
  return { text: `${chars.slice(0, max - 1).join('')}…`, cut: true };
}

/** トレンドの応答スキーマ（検証用） */
const trendSchema = z.object({
  trends: z.array(
    z.object({
      trend: z.string().min(1),
      description: z.string().min(1),
      action: z.string().optional(),
    })
  ),
});

/** トレンドの応答スキーマ（構造化出力として API に渡す） */
const trendJsonSchema = {
  type: 'object',
  properties: {
    trends: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          trend: { type: 'string', description: `トレンドのタイトル（${TREND_LIMITS.trend} 文字以内）` },
          description: { type: 'string', description: `技術的な説明（${TREND_LIMITS.description} 文字以内の 1 文）` },
          action: { type: 'string', description: `試すための具体的アクション（${TREND_LIMITS.action} 文字以内。リポジトリ名・ツール名・API名など）` },
        },
        required: ['trend', 'description'],
      },
    },
  },
  required: ['trends'],
};

/**
 * 全記事のタイトルと要約から今日のトレンドを3〜5点で分析する。
 * 失敗した場合は空配列を返し、パイプラインを止めない。
 */
export async function analyzeTrends(
  llm: LlmConfig,
  articles: Article[]
): Promise<Trend[]> {
  if (articles.length === 0) return [];

  const articleSummaries = articles
    .slice(0, 50) // コンテキスト長を抑えるため上位50件のみ使用
    .map((a) => `・${a.title}${a.summary ? `\n  → ${a.summary.what}${a.summary.change ? ` ${a.summary.change}` : ''}` : ''}`)
    .join('\n');

  const prompt = `以下は本日の AI/テック ニュース ${Math.min(articles.length, 50)} 件のタイトルと要約です。
これらを分析し、エンジニアが「今週押さえておくべき技術トレンド」を3〜4個、日本語で説明してください。
観察の羅列ではなく、何を試せるか・何に備えるべきかを重視してください。
trend は ${TREND_LIMITS.trend} 文字以内、description は ${TREND_LIMITS.description} 文字以内の 1 文、action は ${TREND_LIMITS.action} 文字以内で書いてください。
action は情報がなければ省略してください。

ニュース一覧:
${articleSummaries}`;

  try {
    const parsed = await generateJson(llm, { prompt, schema: trendSchema, jsonSchema: trendJsonSchema, schemaName: 'trends' });
    let cutCount = 0;
    const trends = parsed.trends.slice(0, TREND_MAX).map((t): Trend => {
      const trend = clamp(t.trend, TREND_LIMITS.trend);
      const description = clamp(t.description, TREND_LIMITS.description);
      const action = t.action ? clamp(t.action, TREND_LIMITS.action) : null;
      cutCount += [trend, description, action].filter((x) => x?.cut === true).length;
      return action
        ? { trend: trend.text, description: description.text, action: action.text }
        : { trend: trend.text, description: description.text };
    });
    if (cutCount > 0 || parsed.trends.length > TREND_MAX) {
      console.warn(`[ai] トレンドを上限に合わせて切りました（欄 ${cutCount} 件、件数 ${parsed.trends.length} → ${trends.length}）`);
    }
    return trends;
  } catch (error) {
    console.warn('[ai] トレンド分析に失敗:', error instanceof Error ? error.message : String(error));
    return [];
  }
}
