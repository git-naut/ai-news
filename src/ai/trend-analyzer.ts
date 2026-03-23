import { generateText } from './client.js';
import type { Article } from '../feeds/types.js';

/** トレンド分析結果の1項目 */
export interface Trend {
  /** トレンドのタイトル（短い見出し） */
  trend: string;
  /** 1〜2文の説明 */
  description: string;
}

/**
 * 全記事のタイトルと要約から今日のトレンドを3〜5点で分析する。
 * パースに失敗した場合は空配列を返す。
 */
export async function analyzeTrends(
  apiKey: string,
  articles: Article[]
): Promise<Trend[]> {
  if (articles.length === 0) return [];

  const articleSummaries = articles
    .slice(0, 50) // コンテキスト長を抑えるため上位50件のみ使用
    .map((a) => `・${a.title}${a.summary ? `\n  → ${a.summary}` : ''}`)
    .join('\n');

  const prompt = `以下は本日の AI/テック ニュース ${Math.min(articles.length, 50)} 件のタイトルと要約です。
これらを分析し、今日の主要なトレンドを3〜5個の観点で日本語で説明してください。
必ず以下の JSON 配列形式のみで返すこと（コードブロックや説明文は不要）:
[{"trend": "トレンドのタイトル（20文字以内）", "description": "1〜2文の説明"}]

ニュース一覧:
${articleSummaries}`;

  try {
    const responseText = await generateText(apiKey, prompt);

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('JSON 配列が見つかりません');

    const parsed = JSON.parse(jsonMatch[0]) as Trend[];
    return parsed.filter((t) => t.trend && t.description);
  } catch (error) {
    console.warn('[ai] トレンド分析のパースに失敗:', (error as Error).message);
    return [];
  }
}
