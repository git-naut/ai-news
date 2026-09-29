/**
 * 要約の欄の上限を 200 文字にする。UNIT-1 が捕まえるはず。
 *
 * 1 カラムのメールで 2 行に収まる長さを超える。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_194',
  family: 'unit',
  expect: 'UNIT-1',
  title: "要約の欄の上限を 200 文字にする",
  touches: ["src/ai/summary-lint.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/summary-lint.ts", "export const SUMMARY_FIELD_MAX = 120;", "export const SUMMARY_FIELD_MAX = 200;");
  },
} satisfies Mutation;
