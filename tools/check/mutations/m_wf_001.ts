/**
 * ci.yml の install から --ignore-scripts を外す。WF-1 が捕まえるはず。
 *
 * axios の乗っ取り対策で足したフラグ。消えると依存の postinstall が CI で走る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_001',
  family: 'wf',
  expect: 'WF-1',
  title: "ci.yml の install から --ignore-scripts を外す",
  touches: [".github/workflows/ci.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/ci.yml", "pnpm install --frozen-lockfile --ignore-scripts", "pnpm install --frozen-lockfile");
  },
} satisfies Mutation;
