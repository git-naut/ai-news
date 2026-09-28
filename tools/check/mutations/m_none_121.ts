/**
 * normalizeUrl の組み立て直前のコメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。コメントは見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_121',
  family: 'unit',
  expect: 'NONE',
  title: "normalizeUrl の組み立て直前のコメントを言い換える",
  touches: ["src/categorizer/deduplicator.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/categorizer/deduplicator.ts", "    // URL は scheme と host を小文字化済み。hash は組み立てに含めないので落ちる", "    // scheme と host は URL が小文字にしてある。hash は組み立てで使わないので消える");
  },
} satisfies Mutation;
