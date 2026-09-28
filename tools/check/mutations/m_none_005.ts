/**
 * 送信ステップの env の並びを入れ替える。捕まえてはいけない変異。
 *
 * WF-3 は鍵で引く。並び順は見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_005',
  family: 'wf',
  expect: 'NONE',
  title: "送信ステップの env の並びを入れ替える",
  touches: [".github/workflows/daily-news.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/daily-news.yml", "          NEWS_API_KEY: ${{ secrets.NEWS_API_KEY }}\n          GMAIL_USER: ${{ secrets.GMAIL_USER }}\n", "          GMAIL_USER: ${{ secrets.GMAIL_USER }}\n          NEWS_API_KEY: ${{ secrets.NEWS_API_KEY }}\n");
  },
} satisfies Mutation;
