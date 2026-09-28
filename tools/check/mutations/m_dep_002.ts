/**
 * lockfile の axios を 2026-04-01 の状態に戻す。DEP-1 が捕まえるはず。
 *
 * 実際に起きた食い違い。package.json は 1.13.6、lockfile は ^1.7.9 のまま。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_dep_002',
  family: 'dep',
  expect: 'DEP-1',
  title: "lockfile の axios を 2026-04-01 の状態に戻す",
  touches: ["pnpm-lock.yaml"],
  async apply(ws) {
    await replaceOnce(ws, "pnpm-lock.yaml", "specifier: 1.13.6", "specifier: ^1.7.9");
  },
} satisfies Mutation;
