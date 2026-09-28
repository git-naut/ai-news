/**
 * ci.yml の pnpm のステップ名を言い換える。捕まえてはいけない変異。
 *
 * WF-7 と WF-9 は uses と with だけを見る。ステップ名は見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_010',
  family: 'wf',
  expect: 'NONE',
  title: "ci.yml の pnpm のステップ名を言い換える",
  touches: [".github/workflows/ci.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/ci.yml", "name: Setup pnpm", "name: pnpm を用意");
  },
} satisfies Mutation;
