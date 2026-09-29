/**
 * トレンドの説明の上限を 120 文字にする。UNIT-1 が捕まえるはず。
 *
 * 説明が長いと、1 件でスマホの画面の 3 分の 1 を使う。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_212',
  family: 'unit',
  expect: 'UNIT-1',
  title: "トレンドの説明の上限を 120 文字にする",
  touches: ["src/ai/trend-analyzer.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/trend-analyzer.ts", "export const TREND_LIMITS = { trend: 20, description: 80, action: 50 } as const;", "export const TREND_LIMITS = { trend: 20, description: 120, action: 50 } as const;");
  },
} satisfies Mutation;
