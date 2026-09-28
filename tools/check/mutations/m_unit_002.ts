/**
 * 重複判定で送信ジョブの結論を見ない。UNIT-1 が捕まえるはず。
 *
 * cancelled や skipped の primary も送信済みに数え、欠配の日に予備が出ない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_002',
  family: 'unit',
  expect: 'UNIT-1',
  title: "重複判定で送信ジョブの結論を見ない",
  touches: [".github/scripts/decide-delivery.sh"],
  async apply(ws) {
    await replaceOnce(ws, ".github/scripts/decide-delivery.sh", " and j.get(\"conclusion\") == \"success\"", "");
  },
} satisfies Mutation;
