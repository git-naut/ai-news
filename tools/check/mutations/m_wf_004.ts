/**
 * 送信ステップへの SEND_AT_UTC の受け渡しを消す。WF-3 が捕まえるはず。
 *
 * 消えると primary が待たずに 08:45 JST に届く。vitest はワークフローを読まないので気づけない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_004',
  family: 'wf',
  expect: 'WF-3',
  title: "送信ステップへの SEND_AT_UTC の受け渡しを消す",
  touches: [".github/workflows/daily-news.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/daily-news.yml", "          SEND_AT_UTC: ${{ needs.check.outputs.send_at_utc }}\n", "");
  },
} satisfies Mutation;
