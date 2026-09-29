/**
 * 逆テストの子プロセスの上限を 300 秒に戻す。UNIT-1 が捕まえるはず。
 *
 * unit 系統の上限（600 秒）より短いと、unit 系統が自分で止まる前に外側が殺して結果が残らない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_206',
  family: 'unit',
  expect: 'UNIT-1',
  title: "逆テストの子プロセスの上限を 300 秒に戻す",
  touches: ["tools/check/mutate.ts"],
  async apply(ws) {
    await replaceOnce(ws, "tools/check/mutate.ts", "export const CHECK_CHILD_TIMEOUT_MS = 900_000;", "export const CHECK_CHILD_TIMEOUT_MS = 300_000;");
  },
} satisfies Mutation;
