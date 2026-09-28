/**
 * keep-alive の runs-on を ubuntu-latest に戻す。WF-8 が捕まえるはず。
 *
 * ubuntu-latest は 2026-10-19 から Ubuntu 26 へ移り、移行の時期を自分で選べない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_010',
  family: 'wf',
  expect: 'WF-8',
  title: "keep-alive の runs-on を ubuntu-latest に戻す",
  touches: [".github/workflows/keep-alive.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/keep-alive.yml", "runs-on: ubuntu-24.04", "runs-on: ubuntu-latest");
  },
} satisfies Mutation;
