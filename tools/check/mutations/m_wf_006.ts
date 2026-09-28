/**
 * check.outputs.kind を旧ステップ id に向ける。WF-5 が捕まえるはず。
 *
 * 出力が空になると送信ジョブ名が "send-digest ()" になり、重複判定も件名の印も外れる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_006',
  family: 'wf',
  expect: 'WF-5',
  title: "check.outputs.kind を旧ステップ id に向ける",
  touches: [".github/workflows/daily-news.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/daily-news.yml", "kind: ${{ steps.decide.outputs.kind }}", "kind: ${{ steps.dedup.outputs.kind }}");
  },
} satisfies Mutation;
