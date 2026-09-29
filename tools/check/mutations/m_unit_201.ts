/**
 * ヘッダーの線を旧デザインの紺にする。UNIT-1 が捕まえるはず。
 *
 * DADS の表に無い色が 1 つ混ざるだけで、トークンに帰着しない見た目に戻る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_201',
  family: 'unit',
  expect: 'UNIT-1',
  title: "ヘッダーの線を旧デザインの紺にする",
  touches: ["src/templates/digest.hbs"],
  async apply(ws) {
    await replaceOnce(ws, "src/templates/digest.hbs", "border-bottom:4px solid #378bca", "border-bottom:4px solid #1a1a2e");
  },
} satisfies Mutation;
