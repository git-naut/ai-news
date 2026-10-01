/**
 * 起点の説明コメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。シェルのコメントは判定に関わらない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_221',
  family: 'unit',
  expect: 'NONE',
  title: "起点の説明コメントを言い換える",
  touches: [".github/scripts/decide-delivery.sh"],
  async apply(ws) {
    await replaceOnce(ws, ".github/scripts/decide-delivery.sh", "# 予定時刻 04:00 の 4 時間 25 分前 = 前夜の 23:35", "# 予定時刻 04:00 から 4 時間 25 分さかのぼると前夜の 23:35");
  },
} satisfies Mutation;
