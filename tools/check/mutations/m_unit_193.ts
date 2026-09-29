/**
 * 誇張の語の表から「大幅」を外す。UNIT-1 が捕まえるはず。
 *
 * 2026-09-29 の実機の要約に誇張の言い回しが出た。表から語が抜けるとプロンプトの禁止と検査の両方が外れる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_193',
  family: 'unit',
  expect: 'UNIT-1',
  title: "誇張の語の表から「大幅」を外す",
  touches: ["src/ai/summary-lint.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/summary-lint.ts", "'大幅', ", "");
  },
} satisfies Mutation;
