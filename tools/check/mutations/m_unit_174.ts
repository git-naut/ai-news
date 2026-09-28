/**
 * HN の取得窓を 24 時間に直書きする。UNIT-1 が捕まえるはず。
 *
 * RSS と NewsData で取得窓が食い違っていたのと同じ形。LOOKBACK_HOURS を共有する。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_174',
  family: 'unit',
  expect: 'UNIT-1',
  title: "HN の取得窓を 24 時間に直書きする",
  touches: ["src/hn/client.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/hn/client.ts", "LOOKBACK_HOURS * 3600", "24 * 3600");
  },
} satisfies Mutation;
