/**
 * 理由を書かずに変異を取り下げる。LES-5 が捕まえるはず。
 *
 * 取り下げる変異は教訓から参照されているもの（m_sec_001）を選ぶ。参照されていない
 * ものを選ぶと LES-6 も反応し、LES-5 だけの歯を見ていることにならない。
 */

import { setAccepted, type Mutation } from '../workspace.js';

export default {
  id: 'm_les_004',
  family: 'lessons',
  expect: 'LES-5',
  title: '理由なしで変異を取り下げる',
  touches: ['tools/check/policy.json'],
  async apply(ws) {
    await setAccepted(ws, { m_sec_001: '' });
  },
} satisfies Mutation;
