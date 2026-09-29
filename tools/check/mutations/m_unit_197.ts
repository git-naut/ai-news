/**
 * 何がの欄が空の記事も要約ありとして残す。UNIT-1 が捕まえるはず。
 *
 * 中身の無い「何が:」だけのカードが並ぶ。本文の抜粋を出すほうが読める。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_197',
  family: 'unit',
  expect: 'UNIT-1',
  title: "何がの欄が空の記事も要約ありとして残す",
  touches: ["src/ai/summarizer.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/summarizer.ts", "    if (what === '') continue;\n", "");
  },
} satisfies Mutation;
