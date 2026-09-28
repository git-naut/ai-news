/**
 * normalizeItem の中の相対リンクの説明コメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。コメントは見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_101',
  family: 'unit',
  expect: 'NONE',
  title: "normalizeItem の相対リンクの説明コメントを言い換える",
  touches: ["src/feeds/normalizer.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/feeds/normalizer.ts", "  // 相対リンクは絶対 URL に直し、壊れたリンクはこの記事だけ捨てる", "  // 相対リンクは基準 URL で補い、解決できないリンクの記事だけを落とす");
  },
} satisfies Mutation;
