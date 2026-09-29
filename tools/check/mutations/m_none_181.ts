/**
 * 選別の段の説明コメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_181',
  family: 'unit',
  expect: 'NONE',
  title: "選別の段の説明コメントを言い換える",
  touches: ["src/categorizer/selector.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/categorizer/selector.ts", "/** 載せる順の段。1 が先 */", "/** 並べる順番の段。数の小さい段から載せる */");
  },
} satisfies Mutation;
