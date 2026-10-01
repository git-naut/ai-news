/**
 * 要約の状態の説明コメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_222',
  family: 'unit',
  expect: 'NONE',
  title: "要約の状態の説明コメントを言い換える",
  touches: ["src/mail/template-engine.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/mail/template-engine.ts", " * LLM が使えなくなっても、メールは本文の抜粋で毎日届き続ける。要約が無いことに受信箱で気づけるようにする。", " * LLM が止まっても、メールは本文の抜粋で届き続ける。要約が無いことを受信箱で分かるようにする。");
  },
} satisfies Mutation;
