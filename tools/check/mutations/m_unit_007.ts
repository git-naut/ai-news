/**
 * 失敗したバッチで要約全体を止める。UNIT-1 が捕まえるはず。
 *
 * 旧実装は Promise.all で1バッチの失敗が全件のフォールバックに広がった。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_007',
  family: 'unit',
  expect: 'UNIT-1',
  title: "失敗したバッチで要約全体を止める",
  touches: ["src/ai/summarizer.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/summarizer.ts", "      failedBatches++;", "      throw error;");
  },
} satisfies Mutation;
