/**
 * テキスト版で「試す」の行を空でも出す。UNIT-1 が捕まえるはず。
 *
 * 試せるものが無い記事に「試す:」だけの行が並ぶ。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_191',
  family: 'unit',
  expect: 'UNIT-1',
  title: "テキスト版で「試す」の行を空でも出す",
  touches: ["src/templates/digest-text.hbs"],
  async apply(ws) {
    await replaceOnce(ws, "src/templates/digest-text.hbs", "{{#if summary.tryIt}}\n  試す: {{summary.tryIt}}\n{{/if}}\n", "  試す: {{summary.tryIt}}\n");
  },
} satisfies Mutation;
