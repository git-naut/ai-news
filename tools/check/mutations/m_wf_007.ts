/**
 * dispatch の入力 simulate_schedule を消す。WF-6 が捕まえるはず。
 *
 * backup の分岐を手で確かめる手段が無くなる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_007',
  family: 'wf',
  expect: 'WF-6',
  title: "dispatch の入力 simulate_schedule を消す",
  touches: [".github/workflows/daily-news.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/daily-news.yml", "      simulate_schedule:\n        description: 'schedule 起動（backup）と同じ分岐を通す（動作確認用）'\n        type: boolean\n        default: false\n", "");
  },
} satisfies Mutation;
