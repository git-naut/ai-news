/**
 * 差分の空文字を null にしない。UNIT-1 が捕まえるはず。
 *
 * 差分として書けることが無い記事に、空の「差分」行が出る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_198',
  family: 'unit',
  expect: 'UNIT-1',
  title: "差分の空文字を null にしない",
  touches: ["src/ai/summarizer.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/summarizer.ts", "change: change === '' ? null : change", "change");
  },
} satisfies Mutation;
