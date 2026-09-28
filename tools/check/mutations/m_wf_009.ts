/**
 * keep-alive の checkout を v4 に戻す。WF-7 が捕まえるはず。
 *
 * v4 は node20 で動き、GitHub が非推奨の警告を出す。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_009',
  family: 'wf',
  expect: 'WF-7',
  title: "keep-alive の checkout を v4 に戻す",
  touches: [".github/workflows/keep-alive.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/keep-alive.yml", "uses: actions/checkout@v7", "uses: actions/checkout@v4");
  },
} satisfies Mutation;
