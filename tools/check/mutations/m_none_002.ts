/**
 * LESSONS.md に印の無い段落を足す。捕まえてはいけない変異。
 *
 * lessons 系統が見るのは印（`<!-- L:… -->`）と policy だけ。散文は見ていない軸なので、
 * ここで反応したら検査が過敏。段落には印の属性に似た語をわざと入れる。
 */

import type { Mutation } from '../workspace.js';

export default {
  id: 'm_none_002',
  family: 'lessons',
  expect: 'NONE',
  title: 'LESSONS.md に印の無い段落を足す（意味は変わらない）',
  touches: ['docs/LESSONS.md'],
  async apply(ws) {
    const text = await ws.read('docs/LESSONS.md');
    await ws.write(
      'docs/LESSONS.md',
      `${text}\n言い回しを整えただけの段落。check=SEC-99 や mutation=m_x のような語が散文にあっても印ではない。\n`,
    );
  },
} satisfies Mutation;
