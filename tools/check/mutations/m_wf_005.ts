/**
 * `&& '' ||` の式を env に足す。WF-4 が捕まえるはず。
 *
 * 2026-03-30 に踏んだ罠。'' は falsy なので右辺が必ず選ばれる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_005',
  family: 'wf',
  expect: 'WF-4',
  title: "`&& '' ||` の式を env に足す",
  touches: [".github/workflows/daily-news.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/daily-news.yml", "          EVENT_NAME: ${{ github.event_name }}\n", "          EVENT_NAME: ${{ github.event_name }}\n          LEGACY_SEND_AT: ${{ inputs.immediate && '' || '00:00' }}\n");
  },
} satisfies Mutation;
