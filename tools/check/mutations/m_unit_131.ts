/**
 * 英字キーワードの語境界照合を部分一致に戻す。UNIT-1 が捕まえるはず。
 *
 * 修正前と同じ形。storage の中の rag、google の中の go が再びカテゴリを決めてしまう。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_131',
  family: 'unit',
  expect: 'UNIT-1',
  title: "英字キーワードの語境界照合を部分一致に戻す",
  touches: ["src/categorizer/classifier.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/categorizer/classifier.ts", "return pattern.test(text);", "return text.includes(keyword);");
  },
} satisfies Mutation;
