/**
 * 取得窓を 32 時間にする。UNIT-1 が捕まえるはず。
 *
 * 30h と 40h の記事だけで確かめていたので、31〜39 のどれにしてもテストが通っていた（検証役の指摘）。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_164',
  family: 'unit',
  expect: 'UNIT-1',
  title: "取得窓を 32 時間にする",
  touches: ["src/config/lookback.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/config/lookback.ts", "export const LOOKBACK_HOURS = 36;", "export const LOOKBACK_HOURS = 32;");
  },
} satisfies Mutation;
