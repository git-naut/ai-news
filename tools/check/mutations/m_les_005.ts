/**
 * 教訓の無い変異を理由つきで取り下げる。LES-6 が捕まえるはず。
 *
 * 取り下げる ID は LESSONS.md に出てこないものにする。実在する変異から選ぶと、
 * その変異の教訓を書き足した日に空振りする。
 */

import { setAccepted, type Mutation } from '../workspace.js';

export default {
  id: 'm_les_005',
  family: 'lessons',
  expect: 'LES-6',
  title: '教訓なしで変異を取り下げる',
  touches: ['tools/check/policy.json'],
  async apply(ws) {
    await setAccepted(ws, { m_ghost_001: '変異の試験用に取り下げる' });
  },
} satisfies Mutation;
