/**
 * 思考の無効化を外す。UNIT-1 が捕まえるはず。
 *
 * seed-2-0 系は既定で思考を出力トークンに載せ、遅く高くなる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_006',
  family: 'unit',
  expect: 'UNIT-1',
  title: "思考の無効化を外す",
  touches: ["src/ai/client.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/client.ts", "      thinking: { type: 'disabled' },\n", "");
  },
} satisfies Mutation;
