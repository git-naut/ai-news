/**
 * .env を作業ツリーに置く。SEC-1 が捕まえるはず。
 *
 * 値は雛形のまま（空）にする。鍵の形を入れると SEC-2 も反応し、SEC-1 の歯を見ている
 * ことにならない。サンドボックスには .git が無いので、置いたファイルはそのまま一覧に
 * 入る（tools/check/files.ts の木を歩く経路）。本物の repo では add したのと同じ状態。
 */

import type { Mutation } from '../workspace.js';

export default {
  id: 'm_sec_002',
  family: 'sec',
  expect: 'SEC-1',
  title: '.env を追跡対象に入れる',
  touches: ['.env.example'],
  async apply(ws) {
    await ws.write('.env', await ws.read('.env.example'));
    return '.env.example を .env として複製した';
  },
} satisfies Mutation;
