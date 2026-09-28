/**
 * 取り下げ済みの変異だけが残った gaps.json を置く。捕まえてはいけない変異。
 *
 * gaps.json を書いた後で policy に取り下げを足すことがある。loop 系統はその変異を
 * 数えないはず。ここで LOOP-2 が反応したら、取り下げが効いていない。
 */

import { setAccepted, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_003',
  family: 'loop',
  expect: 'NONE',
  title: '取り下げ済みの変異だけが残った gaps.json を置く（赤にならない）',
  touches: ['tools/check/policy.json'],
  async apply(ws) {
    await setAccepted(ws, { m_sec_001: '変異の試験用に取り下げる' });
    const entry = { id: 'm_sec_001', family: 'sec', expect: 'SEC-2', outcome: 'escaped', reason: '変異の試験' };
    await ws.write('.state/gaps.json', `${JSON.stringify({ entries: [entry] }, null, 2)}\n`);
  },
} satisfies Mutation;
