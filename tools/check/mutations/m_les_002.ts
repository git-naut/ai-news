/**
 * 教訓が参照する検査 ID を実在しないものに書き換える。LES-3 が捕まえるはず。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_les_002',
  family: 'lessons',
  expect: 'LES-3',
  title: '教訓の check= を実在しない検査 ID にする',
  touches: ['docs/LESSONS.md'],
  async apply(ws) {
    await replaceOnce(ws, 'docs/LESSONS.md', 'check=SEC-2 ', 'check=SEC-99 ');
  },
} satisfies Mutation;
