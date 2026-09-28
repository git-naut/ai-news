/**
 * LESSONS.md の最初の教訓の印を末尾に複製する。LES-2 が捕まえるはず。
 *
 * 印を名前で決め打ちしない。教訓を足し引きした瞬間に空振りする。最初に現れた印を使う。
 */

import { NotApplicable, type Mutation } from '../workspace.js';

export default {
  id: 'm_les_001',
  family: 'lessons',
  expect: 'LES-2',
  title: '教訓 ID を重複させる',
  touches: ['docs/LESSONS.md'],
  async apply(ws) {
    const text = await ws.read('docs/LESSONS.md');
    const m = /<!--\s*L:[A-Z]+-\d+[^>]*-->/.exec(text);
    if (m === null) throw new NotApplicable('教訓の印が1つもありません');
    await ws.write('docs/LESSONS.md', `${text}\n${m[0]}\n### 重複した節\n\n本文。\n`);
    return `${m[0]} を末尾に複製した`;
  },
} satisfies Mutation;
