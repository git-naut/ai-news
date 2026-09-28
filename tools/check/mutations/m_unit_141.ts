/**
 * 送信予定時刻から待ちを落とし、起動時刻を配信時刻として返す。UNIT-1 が捕まえるはず。
 *
 * 09:00 JST に届く primary の件名と本文が「08:45 JST」になっていた欠陥と同じ形。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_141',
  family: 'unit',
  expect: 'UNIT-1',
  title: "送信予定時刻から待ちを落とし、起動時刻を返す",
  touches: ["src/schedule/send-delay.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/schedule/send-delay.ts", "return new Date(now.getTime() + delayMs);", "return new Date(now.getTime());");
  },
} satisfies Mutation;
