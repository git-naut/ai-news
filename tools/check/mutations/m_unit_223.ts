/**
 * トレンドの失敗をフッターに出さない。UNIT-1 が捕まえるはず。
 *
 * トレンドの欄が黙って消えるだけになる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_223',
  family: 'unit',
  expect: 'UNIT-1',
  title: "トレンドの失敗をフッターに出さない",
  touches: ["src/mail/template-engine.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/mail/template-engine.ts", "  if (health.trendFailed === true) lines.push('トレンドを作れませんでした');\n", "");
  },
} satisfies Mutation;
