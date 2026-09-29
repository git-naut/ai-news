/**
 * トレンドの欄を上限で切らない。UNIT-1 が捕まえるはず。
 *
 * モデルが上限を守らなかった日に、長い説明がそのまま載る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_214',
  family: 'unit',
  expect: 'UNIT-1',
  title: "トレンドの欄を上限で切らない",
  touches: ["src/ai/trend-analyzer.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/trend-analyzer.ts", "  if (chars.length <= max) return { text: s, cut: false };", "  return { text: s, cut: false };");
  },
} satisfies Mutation;
