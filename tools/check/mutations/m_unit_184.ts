/**
 * 1 通の上限 DIGEST_LIMIT を 30 から 40 にする。UNIT-1 が捕まえるはず。
 *
 * 選別の関数は上限を引数で受けるので、関数のテストだけでは値の書き換えに気づかない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_184',
  family: 'unit',
  expect: 'UNIT-1',
  title: "DIGEST_LIMIT を 30 から 40 にする",
  touches: ["src/config/digest.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/config/digest.ts", "export const DIGEST_LIMIT = 30;", "export const DIGEST_LIMIT = 40;");
  },
} satisfies Mutation;
