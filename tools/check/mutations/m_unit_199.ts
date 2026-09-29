/**
 * テキスト版で差分の行を空でも出す。UNIT-1 が捕まえるはず。
 *
 * 差分が null の記事に「差分:」だけの行が並ぶ。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_199',
  family: 'unit',
  expect: 'UNIT-1',
  title: "テキスト版で差分の行を空でも出す",
  touches: ["src/templates/digest-text.hbs"],
  async apply(ws) {
    await replaceOnce(ws, "src/templates/digest-text.hbs", "{{#if summary.change}}\n  差分: {{summary.change}}\n{{/if}}\n", "  差分: {{summary.change}}\n");
  },
} satisfies Mutation;
