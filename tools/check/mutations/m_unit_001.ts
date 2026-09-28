/**
 * 待機の上限を外し、目標まで何時間でも待つ。UNIT-1 が捕まえるはず。
 *
 * 3 か月の欠配の直接の原因と同じ形。上限が消えると backup は翌日まで待って打ち切られる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_001',
  family: 'unit',
  expect: 'UNIT-1',
  title: "待機の上限を外し、目標まで何時間でも待つ",
  touches: ["src/schedule/send-delay.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/schedule/send-delay.ts", "return wait <= maxWaitMs ? wait : 0;", "return wait;");
  },
} satisfies Mutation;
