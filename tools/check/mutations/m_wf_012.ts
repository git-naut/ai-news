/**
 * 送信ステップの env から GMAIL_USER を消す。WF-10 が捕まえるはず。
 *
 * env.ts が必須にした変数が渡らないと、起動直後に zod が落ちて1通も送れない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_012',
  family: 'wf',
  expect: 'WF-10',
  title: "送信ステップの env から GMAIL_USER を消す",
  touches: [".github/workflows/daily-news.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/daily-news.yml", "          GMAIL_USER: ${{ secrets.GMAIL_USER }}\n", "");
  },
} satisfies Mutation;
