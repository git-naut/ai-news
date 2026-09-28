/**
 * PLAIN_TEXT_TEMPLATES の説明コメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。コメントは見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_111',
  family: 'unit',
  expect: 'NONE',
  title: "PLAIN_TEXT_TEMPLATES の説明コメントを言い換える",
  touches: ["src/mail/template-engine.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/mail/template-engine.ts", " * HTML エスケープを切るプレーンテキスト用テンプレートの名前。", " * 実体参照に変換しないテキストメール用テンプレートの一覧。");
  },
} satisfies Mutation;
