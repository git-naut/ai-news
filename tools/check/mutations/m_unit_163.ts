/**
 * HTML のテンプレートも noEscape で組む。UNIT-1 が捕まえるはず。
 *
 * テキスト版の修正の裏側。HTML でエスケープが外れると記事タイトルの <script> がそのまま出る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_163',
  family: 'unit',
  expect: 'UNIT-1',
  title: "HTML のテンプレートも noEscape で組む",
  touches: ["src/mail/template-engine.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/mail/template-engine.ts", "new Set(['digest-text'])", "new Set(['digest-text', 'digest'])");
  },
} satisfies Mutation;
