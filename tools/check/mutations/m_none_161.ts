/**
 * fetcher のリンク解決のコメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_161',
  family: 'unit',
  expect: 'NONE',
  title: "fetcher のリンク解決のコメントを言い換える",
  touches: ["src/feeds/fetcher.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/feeds/fetcher.ts", "// 相対リンクはフィードが示すサイトの link を基準にする。", "// 相対リンクの基準はフィードに書かれたサイトの link。");
  },
} satisfies Mutation;
