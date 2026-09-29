/**
 * 系統が落ちただけの反応を escaped と数える。UNIT-1 が捕まえるはず。
 *
 * 検査が転んだのを「歯が無い」と誤診する。2026-09-29 に負荷で vitest が時間切れになった 2 本で踏んだ。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_205',
  family: 'unit',
  expect: 'UNIT-1',
  title: "系統が落ちただけの反応を escaped と数える",
  touches: ["tools/check/mutate.ts"],
  async apply(ws) {
    await replaceOnce(ws, "tools/check/mutate.ts", "  if (crashed.length > 0 && meaningful.length === 0) {", "  if (false) {");
  },
} satisfies Mutation;
