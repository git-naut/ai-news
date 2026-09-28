/**
 * LOOKBACK_HOURS の説明コメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。コメントは見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_151',
  family: 'unit',
  expect: 'NONE',
  title: "LOOKBACK_HOURS の説明コメントを言い換える",
  touches: ["src/config/lookback.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/config/lookback.ts", " * 36h にしているのは、週明け月曜の配信で土日の記事を取りこぼさないため。", " * 36h なのは、月曜朝の配信が土日に出た記事を拾えるようにするため。");
  },
} satisfies Mutation;
