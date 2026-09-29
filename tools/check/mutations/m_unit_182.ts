/**
 * 選別の上限を 1 件ゆるめる。UNIT-1 が捕まえるはず。
 *
 * slice の終わりを 1 つずらすだけで、上限 30 のダイジェストに 31 件が載る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_182',
  family: 'unit',
  expect: 'UNIT-1',
  title: "選別の上限を 1 件ゆるめる",
  touches: ["src/categorizer/selector.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/categorizer/selector.ts", "ranked.slice(0, opts.limit)", "ranked.slice(0, opts.limit + 1)");
  },
} satisfies Mutation;
