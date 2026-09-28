/**
 * テキスト用テンプレートの noEscape を外し、既定の HTML エスケープに戻す。UNIT-1 が捕まえるはず。
 *
 * テキストメールのタイトルが AT&amp;T&#x27;s のような実体参照で届いた元の欠陥と同じ形。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_111',
  family: 'unit',
  expect: 'UNIT-1',
  title: "テキスト用テンプレートの noEscape を外す",
  touches: ["src/mail/template-engine.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/mail/template-engine.ts", "Handlebars.compile(source, { noEscape: PLAIN_TEXT_TEMPLATES.has(templateName) });", "Handlebars.compile(source);");
  },
} satisfies Mutation;
