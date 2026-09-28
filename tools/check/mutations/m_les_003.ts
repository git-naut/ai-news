/**
 * 教訓が参照する変異 ID を実在しないものに書き換える。LES-4 が捕まえるはず。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_les_003',
  family: 'lessons',
  expect: 'LES-4',
  title: '教訓の mutation= を実在しない変異 ID にする',
  touches: ['docs/LESSONS.md'],
  async apply(ws) {
    await replaceOnce(ws, 'docs/LESSONS.md', 'mutation=m_sec_001 ', 'mutation=m_sec_999 ');
  },
} satisfies Mutation;
