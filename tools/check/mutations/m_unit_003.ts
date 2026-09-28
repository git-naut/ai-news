/**
 * 予備配信の件名の印を消す。UNIT-1 が捕まえるはず。
 *
 * primary が届かなかった日を受信箱で見分けられなくなる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_003',
  family: 'unit',
  expect: 'UNIT-1',
  title: "予備配信の件名の印を消す",
  touches: ["src/mail/sender.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/mail/sender.ts", "backup: '[予備配信・primary 未着] ',", "backup: '',");
  },
} satisfies Mutation;
