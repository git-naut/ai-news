/**
 * 取得元の状態の説明コメントを言い換える。捕まえてはいけない変異。
 *
 * UNIT はテストの合否と型だけを見る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_192',
  family: 'unit',
  expect: 'NONE',
  title: "取得元の状態の説明コメントを言い換える",
  touches: ["src/mail/template-engine.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/mail/template-engine.ts", " * Anthropic の第三者フィードは 10 か月止まっていて、誰も気づかなかった。受信箱で気づけるようにする。", " * Anthropic の第三者フィードが 10 か月止まっていたのに気づけなかった。受信箱で分かるようにする。");
  },
} satisfies Mutation;
