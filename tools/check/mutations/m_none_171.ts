/**
 * HN の失敗ログの文面を言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_171',
  family: 'unit',
  expect: 'NONE',
  title: "HN の失敗ログの文面を言い換える",
  touches: ["src/hn/client.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/hn/client.ts", "の取得に失敗しました:", "を取れませんでした:");
  },
} satisfies Mutation;
