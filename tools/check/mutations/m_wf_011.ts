/**
 * ci.yml の pnpm/action-setup に version を戻す。WF-9 が捕まえるはず。
 *
 * packageManager と二重になり、v6 は文字列が一致しないと失敗する。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_011',
  family: 'wf',
  expect: 'WF-9',
  title: "ci.yml の pnpm/action-setup に version を戻す",
  touches: [".github/workflows/ci.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/ci.yml", "uses: pnpm/action-setup@v6\n", "uses: pnpm/action-setup@v6\n        with:\n          version: 10\n");
  },
} satisfies Mutation;
