/**
 * daily-news.yml のステップ名を日本語にする。捕まえてはいけない変異。
 *
 * WF-1 は run の中身だけを見る。ステップ名は見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_004',
  family: 'wf',
  expect: 'NONE',
  title: "daily-news.yml のステップ名を日本語にする",
  touches: [".github/workflows/daily-news.yml"],
  async apply(ws) {
    await replaceOnce(ws, ".github/workflows/daily-news.yml", "- name: Install dependencies", "- name: 依存を入れる");
  },
} satisfies Mutation;
