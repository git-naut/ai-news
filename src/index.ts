import { env } from './config/env.js';
import { RSS_FEEDS } from './config/feeds.js';
import { fetchAllFeeds } from './feeds/fetcher.js';
import { fetchNewsApi } from './news-api/client.js';
import { deduplicate } from './categorizer/deduplicator.js';
import { classifyArticles, buildSourceCategoryMap } from './categorizer/classifier.js';
import { batchSummarize } from './ai/summarizer.js';
import { analyzeTrends } from './ai/trend-analyzer.js';
import { applyFallbackSummaries } from './ai/fallback.js';
import { buildTemplateData, renderTemplate, formatJstDate } from './mail/template-engine.js';
import { sendEmail } from './mail/sender.js';
import type { Article } from './feeds/types.js';
import type { Trend } from './ai/trend-analyzer.js';

/**
 * AI ニュースダイジストの配信パイプラインを実行する。
 * 各ステップはエラーが発生しても可能な限り続行する。
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  console.log('[ai-news] 開始:', new Date().toISOString());

  const deliveryDate = formatJstDate(new Date());

  // Step 1: ニュース取得（RSS + News API を並列実行）
  console.log('[ai-news] ニュース取得中...');
  const [rssArticles, apiArticles] = await Promise.all([
    fetchAllFeeds(RSS_FEEDS),
    fetchNewsApi(env.NEWS_API_KEY),
  ]);

  const allRaw = [...rssArticles, ...apiArticles];
  console.log(`[ai-news] 取得合計: ${allRaw.length}件 (RSS: ${rssArticles.length}, API: ${apiArticles.length})`);

  // Step 2: 重複排除 → キーワードベースカテゴリ分類
  const deduped = deduplicate(allRaw);
  console.log(`[ai-news] 重複排除後: ${deduped.length}件`);

  const sourceCategoryMap = buildSourceCategoryMap(RSS_FEEDS);
  const classified = classifyArticles(deduped, sourceCategoryMap);

  // Step 3: Gemini API による要約・トレンド分析
  // 失敗してもフォールバックでパイプラインを継続する
  let summarized: Article[];
  let trends: Trend[] = [];

  // Article 型に変換（summary: null で初期化）
  const articlesWithNull: Article[] = classified.map((a) => ({ ...a, summary: null }));

  try {
    console.log('[ai-news] Gemini API で要約中...');
    summarized = await batchSummarize(env.GEMINI_API_KEY, articlesWithNull);

    console.log('[ai-news] トレンド分析中...');
    trends = await analyzeTrends(env.GEMINI_API_KEY, summarized);
    console.log(`[ai-news] トレンド: ${trends.length}件`);
  } catch (error) {
    console.error('[ai-news] Gemini API エラー。フォールバック要約を使用します:', (error as Error).message);
    summarized = applyFallbackSummaries(classified);
  }

  // 記事が0件の場合でも空のダイジストを送信する
  if (summarized.length === 0) {
    console.warn('[ai-news] 取得できた記事が0件でした。空のダイジストを送信します。');
  }

  // Step 4: メール生成・送信
  const templateData = buildTemplateData(summarized, trends, deliveryDate);
  const html = renderTemplate('digest', templateData);
  const text = renderTemplate('digest-text', templateData);

  await sendEmail(
    { html, text, totalCount: summarized.length, deliveryDate },
    {
      gmailUser: env.GMAIL_USER,
      gmailAppPassword: env.GMAIL_APP_PASSWORD,
      recipientEmail: env.RECIPIENT_EMAIL,
    }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[ai-news] 完了 (${elapsed}秒):`, new Date().toISOString());
}

main().catch((error: unknown) => {
  console.error('[ai-news] 致命的なエラーが発生しました:', error);
  process.exit(1);
});
