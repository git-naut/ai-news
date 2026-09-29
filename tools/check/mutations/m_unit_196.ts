/**
 * 取得に失敗した取得元をフッターに出さない。UNIT-1 が捕まえるはず。
 *
 * 止まったフィードだけ出して失敗を落とすと、取得元が丸ごと消えた日に受信箱で気づけない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_196',
  family: 'unit',
  expect: 'UNIT-1',
  title: "取得に失敗した取得元をフッターに出さない",
  touches: ["src/mail/template-engine.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/mail/template-engine.ts", "return [...lines, ...health.failed.map((name) => `${name} は取得に失敗しました`)];", "return lines;");
  },
} satisfies Mutation;
