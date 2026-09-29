/**
 * 切り詰めの説明コメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_211',
  family: 'unit',
  expect: 'NONE',
  title: "切り詰めの説明コメントを言い換える",
  touches: ["src/ai/trend-analyzer.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/trend-analyzer.ts", " * 文字列を上限の長さに収める。超えるときは上限の 1 文字手前で切って「…」を付ける。", " * 文字列を上限の長さまでにする。長いときは上限の 1 文字手前で切り、最後に「…」を付ける。");
  },
} satisfies Mutation;
