/**
 * matchesKeyword の退避処理のコメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。コメントは見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_131',
  family: 'unit',
  expect: 'NONE',
  title: "matchesKeyword の退避処理のコメントを言い換える",
  touches: ["src/categorizer/classifier.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/categorizer/classifier.ts", "// c++ や gpt-5 の記号を正規表現として解釈させないよう退避する", "// c++ や gpt-5 に含まれる記号が正規表現の演算子として働かないよう前置きの逆斜線を付ける");
  },
} satisfies Mutation;
