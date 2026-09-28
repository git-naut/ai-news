/**
 * simulate_schedule の説明文を言い換える。捕まえてはいけない変異。
 *
 * WF-6 は入力の有無と型だけを見る。説明文は見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_006',
  family: 'wf',
  expect: 'NONE',
  title: "simulate_schedule の説明文を言い換える",
  touches: [".github/workflows/daily-news.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/daily-news.yml", "description: 'schedule 起動（backup）と同じ分岐を通す（動作確認用）'", "description: 'backup と同じ判定を手動で通す（確認用）'");
  },
} satisfies Mutation;
