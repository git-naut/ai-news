/**
 * HTML テンプレートのコメントを言い換える。捕まえてはいけない変異。
 *
 * HTML のコメントはメールの見た目にもテストにも出ない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_191',
  family: 'unit',
  expect: 'NONE',
  title: "HTML テンプレートのコメントを言い換える",
  touches: ["src/templates/digest.hbs"],
  async apply(ws) {
    await replaceOnce(ws, "src/templates/digest.hbs", "<!-- 1 カラム。スマホの Gmail でも折り返しが崩れないよう、幅は最大 600px の可変にする -->", "<!-- 1 カラム（最大 600px の可変幅） -->");
  },
} satisfies Mutation;
