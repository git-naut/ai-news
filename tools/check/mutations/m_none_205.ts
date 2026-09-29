/**
 * 子プロセスの上限の説明コメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_205',
  family: 'unit',
  expect: 'NONE',
  title: "子プロセスの上限の説明コメントを言い換える",
  touches: ["tools/check/mutate.ts"],
  async apply(ws) {
    await replaceOnce(ws, "tools/check/mutate.ts", " * 検査の子プロセスの上限（ミリ秒）。unit 系統は中で vitest と tsc を起こすので、その上限", " * 検査の子プロセスを止めるまでの時間（ミリ秒）。unit 系統は中で vitest と tsc を起こすので、その上限");
  },
} satisfies Mutation;
