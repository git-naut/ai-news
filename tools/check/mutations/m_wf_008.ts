/**
 * 送信ジョブ名から種類を外す。WF-2 が捕まえるはず。
 *
 * 名前が "send-digest" だけになると、primary の送信を探せない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_008',
  family: 'wf',
  expect: 'WF-2',
  title: "送信ジョブ名から種類を外す",
  touches: [".github/workflows/daily-news.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/daily-news.yml", "name: send-digest (${{ needs.check.outputs.kind }})", "name: send-digest");
  },
} satisfies Mutation;
