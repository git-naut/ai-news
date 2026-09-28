/**
 * computeSendDelay の説明コメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。コメントは見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_009',
  family: 'unit',
  expect: 'NONE',
  title: "computeSendDelay の説明コメントを言い換える",
  touches: ["src/schedule/send-delay.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/schedule/send-delay.ts", " * 上限を超える場合や目標ちょうどの場合は 0（即時送信）を返し、翌日へは繰り越さない。", " * 上限より長いときと目標と同時刻のときは 0（すぐ送る）を返し、翌日には回さない。");
  },
} satisfies Mutation;
