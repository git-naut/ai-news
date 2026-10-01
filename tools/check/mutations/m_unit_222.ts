/**
 * 要約できなかった記事の件数をフッターに出さない。UNIT-1 が捕まえるはず。
 *
 * LLM が止まっても抜粋で届き続け、要約が無いことに受信箱で気づけない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_222',
  family: 'unit',
  expect: 'UNIT-1',
  title: "要約できなかった記事の件数をフッターに出さない",
  touches: ["src/mail/template-engine.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/mail/template-engine.ts", "  if ((health.summaryMissing ?? 0) > 0) {", "  if (false) {");
  },
} satisfies Mutation;
