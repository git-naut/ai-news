/**
 * timeout-minutes を元の 20 分に戻す。WF-3 が捕まえるはず。
 *
 * 待機の上限 20 分と同じ長さでは、取得と要約の時間ぶん足りず打ち切られる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_003',
  family: 'wf',
  expect: 'WF-3',
  title: "timeout-minutes を元の 20 分に戻す",
  touches: [".github/workflows/daily-news.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/daily-news.yml", "timeout-minutes: 35", "timeout-minutes: 20");
  },
} satisfies Mutation;
