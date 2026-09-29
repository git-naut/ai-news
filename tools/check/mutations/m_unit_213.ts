/**
 * トレンドの件数を切らずに全部載せる。UNIT-1 が捕まえるはず。
 *
 * プロンプトの指示を超えて 5 件以上返ることがある。受け取った側で切らないと上限が守られない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_213',
  family: 'unit',
  expect: 'UNIT-1',
  title: "トレンドの件数を切らずに全部載せる",
  touches: ["src/ai/trend-analyzer.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/trend-analyzer.ts", "parsed.trends.slice(0, TREND_MAX).map(", "parsed.trends.map(");
  },
} satisfies Mutation;
