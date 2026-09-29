/**
 * 記事のタイトルのリンクから下線を外す。UNIT-1 が捕まえるはず。
 *
 * DADS は押せるものを見た目で分かるようにする。旧テンプレートは下線を消していた。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_203',
  family: 'unit',
  expect: 'UNIT-1',
  title: "記事のタイトルのリンクから下線を外す",
  touches: ["src/templates/digest.hbs"],
  async apply(ws) {
    await replaceOnce(ws, "src/templates/digest.hbs", "color:#1b4f7a;text-decoration:underline;\">{{title}}</a>", "color:#1b4f7a;text-decoration:none;\">{{title}}</a>");
  },
} satisfies Mutation;
