/**
 * トレンドの最大件数を 5 にする。UNIT-1 が捕まえるはず。
 *
 * 2026-09-29 の見本では、トレンドの欄だけでスマホの画面が約 1,200px あり、記事が下に押しやられた。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_211',
  family: 'unit',
  expect: 'UNIT-1',
  title: "トレンドの最大件数を 5 にする",
  touches: ["src/ai/trend-analyzer.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/trend-analyzer.ts", "export const TREND_MAX = 4;", "export const TREND_MAX = 5;");
  },
} satisfies Mutation;
