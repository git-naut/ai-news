/**
 * .state/gaps.json にすり抜けを1件置く。LOOP-2 が捕まえるはず。
 */

import type { Mutation } from '../workspace.js';

export default {
  id: 'm_loop_001',
  family: 'loop',
  expect: 'LOOP-2',
  title: 'すり抜けが残った gaps.json を置く',
  touches: [],
  async apply(ws) {
    const entry = { id: 'm_sec_001', family: 'sec', expect: 'SEC-2', outcome: 'escaped', reason: '変異の試験' };
    await ws.write('.state/gaps.json', `${JSON.stringify({ entries: [entry] }, null, 2)}\n`);
  },
} satisfies Mutation;
