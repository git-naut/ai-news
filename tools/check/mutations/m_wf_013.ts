/**
 * ModelArk の呼び出し口を eu-west にする。WF-3 が捕まえるはず。
 *
 * 鍵は ap-southeast-1 で発行している。他リージョンに投げると 401 になる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_013',
  family: 'wf',
  expect: 'WF-3',
  title: "ModelArk の呼び出し口を eu-west にする",
  touches: [".github/workflows/daily-news.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/daily-news.yml", "ARK_BASE_URL: https://ark.ap-southeast.bytepluses.com/api/v3", "ARK_BASE_URL: https://ark.eu-west.bytepluses.com/api/v3");
  },
} satisfies Mutation;
