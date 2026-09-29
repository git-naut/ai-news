import { env } from './config/env.js';
import { RSS_FEEDS } from './config/feeds.js';
import { fetchAllFeedsWithReport } from './feeds/fetcher.js';
import { fetchNewsApi } from './news-api/client.js';
import { fetchHackerNews, HN_QUERIES, hnSourceName } from './hn/client.js';
import { deduplicate } from './categorizer/deduplicator.js';
import { classifyArticles, buildSourceCategoryMap } from './categorizer/classifier.js';
import { selectForDigest, buildTierOf, countByTier } from './categorizer/selector.js';
import { DIGEST_LIMIT } from './config/digest.js';
import { batchSummarize } from './ai/summarizer.js';
import { analyzeTrends } from './ai/trend-analyzer.js';
import { applyFallbackSummaries } from './ai/fallback.js';
import { buildTemplateData, renderTemplate, formatJstDate } from './mail/template-engine.js';
import { sendEmail } from './mail/sender.js';
import { computeSendDelay, plannedSendTime } from './schedule/send-delay.js';
import type { Article } from './feeds/types.js';
import type { Trend } from './ai/trend-analyzer.js';

/**
 * AI ニュースダイジストの配信パイプラインを実行する。
 * 各ステップはエラーが発生しても可能な限り続行する。
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  console.log('[ai-news] 開始:', new Date().toISOString());

  // Step 1: ニュース取得（RSS + HN + News API を並列実行）
  console.log('[ai-news] ニュース取得中...');
  const [rssReport, hnArticles, apiArticles] = await Promise.all([
    fetchAllFeedsWithReport(RSS_FEEDS),
    fetchHackerNews(HN_QUERIES),
    fetchNewsApi(env.NEWS_API_KEY),
  ]);

  const rssArticles = rssReport.articles;

  // 取得元の健康状態。止まったフィードは記事が0件になるだけで、配信は黙って続いてしまう
  // （Anthropic の第三者フィードは 2025-11 に止まり、10 か月気づかなかった）。
  // メール本文への載せ方は template-engine.ts 側で組むので、ここでは名前をログに出す
  const sourceHealth = { stale: rssReport.stale, failed: rssReport.failed };
  for (const s of sourceHealth.stale) {
    const newest = s.newest ? s.newest.toISOString() : '記事なし';
    console.warn(`[ai-news] 更新が止まっている取得元: ${s.name}（最新 ${newest}）`);
  }
  if (sourceHealth.failed.length > 0) {
    console.warn(`[ai-news] 取得に失敗した取得元: ${sourceHealth.failed.join('、')}`);
  }

  const allRaw = [...rssArticles, ...hnArticles, ...apiArticles];
  console.log(`[ai-news] 取得合計: ${allRaw.length}件 (RSS: ${rssArticles.length}, HN: ${hnArticles.length}, API: ${apiArticles.length})`);

  // Step 2: 重複排除 → キーワードベースカテゴリ分類
  const deduped = deduplicate(allRaw);
  console.log(`[ai-news] 重複排除後: ${deduped.length}件`);

  const sourceCategoryMap = buildSourceCategoryMap([
    ...RSS_FEEDS,
    ...HN_QUERIES.map((q) => ({ name: hnSourceName(q), category: q.category })),
  ]);
  const classifiedAll = classifyArticles(deduped, sourceCategoryMap);

  // 載せる件数を DIGEST_LIMIT で切る。要約の前に切り、LLM の呼び出しを減らす。
  // 段1（英語の RSS と HN）、段2（日本語の RSS）、段3（NewsData.io）の順に残し、落とした件数は段ごとに出す
  const tierOf = buildTierOf(RSS_FEEDS, HN_QUERIES);
  const classified = selectForDigest(classifiedAll, { limit: DIGEST_LIMIT, tierOf });
  if (classified.length < classifiedAll.length) {
    const before = countByTier(classifiedAll, tierOf);
    const after = countByTier(classified, tierOf);
    const dropped = ([1, 2, 3] as const).map((t) => `段${t}: ${before[t] - after[t]}件`).join(', ');
    console.log(`[ai-news] 上限 ${DIGEST_LIMIT} 件で ${classifiedAll.length - classified.length}件を落としました (${dropped})`);
  }

  // Step 3: LLM（BytePlus ModelArk）による要約・トレンド分析
  // 失敗してもフォールバックでパイプラインを継続する
  let summarized: Article[];
  let trends: Trend[] = [];
  const llm = { apiKey: env.ARK_API_KEY, baseUrl: env.ARK_BASE_URL };

  // Article 型に変換（summary: null で初期化）
  const articlesWithNull: Article[] = classified.map((a) => ({ ...a, summary: null }));

  try {
    console.log('[ai-news] LLM で要約中...');
    summarized = await batchSummarize(llm, articlesWithNull);

    console.log('[ai-news] トレンド分析中...');
    trends = await analyzeTrends(llm, summarized);
    console.log(`[ai-news] トレンド: ${trends.length}件`);
  } catch (error) {
    console.error('[ai-news] LLM エラー。フォールバック要約を使用します:', (error as Error).message);
    summarized = applyFallbackSummaries(classified);
  }

  // 記事が0件の場合でも空のダイジストを送信する
  if (summarized.length === 0) {
    console.warn('[ai-news] 取得できた記事が0件でした。空のダイジストを送信します。');
  }

  // SEND_AT_UTC が指定されている場合、その時刻まで待機してから送信する
  // （例: "00:00" → UTC 00:00 = JST 09:00 に送信）
  // 待ちが SEND_MAX_WAIT_MINUTES を超える場合は翌日へ繰り越さず即時に送る
  const now = new Date();
  const sleepMs = computeSendDelay(now, env.SEND_AT_UTC, env.SEND_MAX_WAIT_MINUTES * 60 * 1000);

  // Step 4: メール生成
  // 配信時刻は起動時刻ではなく送信予定時刻（now + 待ち）で描く
  const deliveryDate = formatJstDate(plannedSendTime(now, sleepMs));
  const templateData = buildTemplateData(summarized, trends, deliveryDate, sourceHealth);
  const html = renderTemplate('digest', templateData);
  const text = renderTemplate('digest-text', templateData);

  if (sleepMs > 0) {
    console.log(`[ai-news] UTC ${env.SEND_AT_UTC} まで待機中 (${(sleepMs / 1000).toFixed(0)}秒)...`);
    await new Promise((resolve) => setTimeout(resolve, sleepMs));
  } else if (env.SEND_AT_UTC) {
    console.warn(`[ai-news] UTC ${env.SEND_AT_UTC} までの待ちが上限 ${env.SEND_MAX_WAIT_MINUTES} 分を超えるため即時に送信します。`);
  }

  // Step 5: メール送信
  await sendEmail(
    { html, text, totalCount: summarized.length, deliveryDate, deliveryKind: env.DELIVERY_KIND },
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
