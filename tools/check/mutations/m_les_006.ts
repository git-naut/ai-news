/**
 * LESSONS.md を見出しだけにする。LOOP-3（素通り）が捕まえるはず。
 *
 * 教訓が0件でも LES-1〜LES-6 はどれも落ちない。落ちないのは検査が働いたからではなく、
 * 見る対象が無いから。primary=教訓 の宣言が素通りを拾うことを逆から確かめる。
 */

import type { Mutation } from '../workspace.js';

export default {
  id: 'm_les_006',
  family: 'lessons',
  expect: 'LOOP-3',
  title: '教訓を0件にする',
  touches: ['docs/LESSONS.md'],
  async apply(ws) {
    ws.require('docs/LESSONS.md');
    await ws.write('docs/LESSONS.md', '# 教訓\n');
  },
} satisfies Mutation;
