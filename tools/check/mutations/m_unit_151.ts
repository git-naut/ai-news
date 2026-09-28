/**
 * NewsData の取得窓を共有の定数から外し、24h の直書きへ戻す。UNIT-1 が捕まえるはず。
 *
 * 修正前の形そのもの。RSS は 36h のままなので、NewsData だけ週末の記事が黙って落ちる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_151',
  family: 'unit',
  expect: 'UNIT-1',
  title: "NewsData の取得窓を 24h の直書きへ戻す",
  touches: ["src/news-api/client.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/news-api/client.ts", "if (!isWithinLookback(publishedAt, new Date())) continue;", "if (publishedAt < new Date(Date.now() - 24 * 60 * 60 * 1000)) continue;");
  },
} satisfies Mutation;
