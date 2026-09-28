/**
 * テストのファイルに型エラーを1つ入れる。UNIT-2 が捕まえるはず。
 *
 * 2026-09-29 まで tsc は src/ だけを見ていて、tests/ の型は誰も検査していなかった。
 * 実行時には何も起きない行なので vitest は緑のまま。tests/tsconfig.json を tsc に
 * かけていれば UNIT-2 だけが反応する。
 */

import type { Mutation } from '../workspace.js';

export default {
  id: 'm_unit_004',
  family: 'unit',
  expect: 'UNIT-2',
  title: 'tests/ に実行時は無害な型エラーを入れる',
  touches: ['tests/schedule/send-delay.test.ts'],
  async apply(ws) {
    const rel = 'tests/schedule/send-delay.test.ts';
    const text = await ws.read(rel);
    await ws.write(rel, `${text}\nexport const typeProbe: number = 'x' as string;\n`);
  },
} satisfies Mutation;
