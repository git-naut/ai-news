/**
 * 出力の打ち切り（finish_reason=length）を見ない。UNIT-1 が捕まえるはず。
 *
 * 上限で切れた JSON を読むと、要約が壊れるか例外で予備モデルへ回る判断が消える。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_005',
  family: 'unit',
  expect: 'UNIT-1',
  title: "出力の打ち切り（finish_reason=length）を見ない",
  touches: ["src/ai/client.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/client.ts", "  if (choice?.finish_reason === 'length')", "  if (choice?.finish_reason === 'length-never')");
  },
} satisfies Mutation;
