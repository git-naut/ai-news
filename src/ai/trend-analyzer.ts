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
          trend: { type: 'string', description: 'トレンドのタイトル（20文字以内）' },
          description: { type: 'string', description: '1〜2文の技術的説明' },
          action: { type: 'string', description: '試すための具体的アクション（リポジトリ名・ツール名・API名など）' },
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
    .map((a) => `・${a.title}${a.summary ? `\n  → ${a.summary}` : ''}`)
    .join('\n');

  const prompt = `以下は本日の AI/テック ニュース ${Math.min(articles.length, 50)} 件のタイトルと要約です。
これらを分析し、エンジニアが「今週押さえておくべき技術トレンド」を3〜5個、日本語で説明してください。
観察の羅列ではなく、何を試せるか・何に備えるべきかを重視してください。
action は情報がなければ省略してください。

ニュース一覧:
${articleSummaries}`;

  try {
    const parsed = await generateJson(llm, { prompt, schema: trendSchema, jsonSchema: trendJsonSchema, schemaName: 'trends' });
    return parsed.trends.map((t) => (t.action ? { trend: t.trend, description: t.description, action: t.action } : { trend: t.trend, description: t.description }));
  } catch (error) {
    console.warn('[ai] トレンド分析に失敗:', error instanceof Error ? error.message : String(error));
    return [];
  }
}
