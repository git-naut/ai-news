/**
 * テストの上限を既定の 5 秒に戻す。UNIT-1 が捕まえるはず。
 *
 * 負荷のかかった逆テストで、ふだん 0.3 秒未満のテストが 5 秒を超えて落ちた。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_207',
  family: 'unit',
  expect: 'UNIT-1',
  title: "テストの上限を既定の 5 秒に戻す",
  touches: ["vitest.config.ts"],
  async apply(ws) {
    await replaceOnce(ws, "vitest.config.ts", "    testTimeout: 30_000,", "    testTimeout: 5_000,");
  },
} satisfies Mutation;
