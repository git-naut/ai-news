/**
 * フィードの最新日時を、取得窓で絞った後に取る。UNIT-1 が捕まえるはず。
 *
 * 36 時間より前の記事しか無いフィードの最新日時が null になり、週末に静かなだけの取得元まで止まった扱いになる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

const NEWEST = "      if (newest === null || article.publishedAt > newest) newest = article.publishedAt;\n";
const LOOKBACK = "      if (!isWithinLookback(article.publishedAt, now)) continue;\n";

export default {
  id: 'm_unit_183',
  family: 'unit',
  expect: 'UNIT-1',
  title: "フィードの最新日時を取得窓で絞った後に取る",
  touches: ["src/feeds/fetcher.ts"],
  async apply(ws) {
    // 最新日時の行を消し、取得窓の判定の直後に置き直す
    await replaceOnce(ws, "src/feeds/fetcher.ts", NEWEST, "");
    await replaceOnce(ws, "src/feeds/fetcher.ts", LOOKBACK, LOOKBACK + NEWEST);
  },
} satisfies Mutation;
