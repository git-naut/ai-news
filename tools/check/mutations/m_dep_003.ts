/**
 * axios の固定を範囲指定に戻す。DEP-2 が捕まえるはず。
 *
 * package.json と lockfile の両方を揃えて書き換えるので DEP-1 は反応しない。
 * DEP-2 だけが「固定を外した」ことを見ているかを確かめる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_dep_003',
  family: 'dep',
  expect: 'DEP-2',
  title: 'axios を ^1.13.6 に戻す（lockfile も揃える）',
  touches: ['package.json', 'pnpm-lock.yaml'],
  async apply(ws) {
    await replaceOnce(ws, 'package.json', '"axios": "1.13.6"', '"axios": "^1.13.6"');
    await replaceOnce(ws, 'pnpm-lock.yaml', 'specifier: 1.13.6', 'specifier: ^1.13.6');
  },
} satisfies Mutation;
