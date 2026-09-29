/**
 * DADS の説明コメントを言い換える。捕まえてはいけない変異。
 *
 * HTML のコメントは色・太さ・書体の検査のどれにも当たらない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_201',
  family: 'unit',
  expect: 'NONE',
  title: "DADS の説明コメントを言い換える",
  touches: ["src/templates/digest.hbs"],
  async apply(ws) {
    await replaceOnce(ws, "src/templates/digest.hbs", "DADS（デジタル庁デザインシステム）準拠。", "デジタル庁デザインシステム（DADS）に沿う。");
  },
} satisfies Mutation;
