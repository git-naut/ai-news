/**
 * plannedSendTime の説明コメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。コメントは見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_141',
  family: 'unit',
  expect: 'NONE',
  title: "plannedSendTime の説明コメントを言い換える",
  touches: ["src/schedule/send-delay.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/schedule/send-delay.ts", " * 件名と本文の配信時刻は、起動した時刻ではなくこの時刻で描画する。", " * メールの件名と本文に出す配信時刻には、起動時刻でなくこの値を使う。");
  },
} satisfies Mutation;
