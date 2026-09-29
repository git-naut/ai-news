/**
 * 見出しの太さを 600 にする。UNIT-1 が捕まえるはず。
 *
 * 公式トークンの font-weight は 400 と 700 だけ。旧テンプレートは 600 を使っていた。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_202',
  family: 'unit',
  expect: 'UNIT-1',
  title: "見出しの太さを 600 にする",
  touches: ["src/templates/digest.hbs"],
  async apply(ws) {
    await replaceOnce(ws, "src/templates/digest.hbs", "<h1 style=\"margin:0;font-size:18px;font-weight:700;", "<h1 style=\"margin:0;font-size:18px;font-weight:600;");
  },
} satisfies Mutation;
