/**
 * tryIt の空文字を null にしない。UNIT-1 が捕まえるはず。
 *
 * strict の構造化出力は欄を省けないので、無いときは空文字で返ってくる。そのままだと空の「試す」になる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_192',
  family: 'unit',
  expect: 'UNIT-1',
  title: "tryIt の空文字を null にしない",
  touches: ["src/ai/summarizer.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/summarizer.ts", "tryIt: tryIt === '' ? null : tryIt", "tryIt");
  },
} satisfies Mutation;
