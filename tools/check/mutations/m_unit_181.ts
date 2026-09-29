/**
 * 選別の並べ替えから段の比較を外し、公開日時だけで並べる。UNIT-1 が捕まえるはず。
 *
 * 新しいだけの NewsData.io の記事が、英語の RSS と HN を押しのけて上限の枠を埋める形。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_181',
  family: 'unit',
  expect: 'UNIT-1',
  title: "選別の並べ替えから段の比較を外す",
  touches: ["src/categorizer/selector.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/categorizer/selector.ts", "x.tier - y.tier || ", "");
  },
} satisfies Mutation;
