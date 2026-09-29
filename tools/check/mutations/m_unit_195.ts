/**
 * 要約がある記事にも抜粋を入れる。UNIT-1 が捕まえるはず。
 *
 * 抜粋と要約を二重に持つ。テンプレートの else で隠れるので見た目では気づけない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_195',
  family: 'unit',
  expect: 'UNIT-1',
  title: "要約がある記事にも抜粋を入れる",
  touches: ["src/mail/template-engine.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/mail/template-engine.ts", "excerpt: a.summary ? null : generateFallbackSummary(a) ?? '（要約なし）',", "excerpt: generateFallbackSummary(a) ?? '（要約なし）',");
  },
} satisfies Mutation;
