/**
 * json_object へ落とすときのログを言い換える。捕まえてはいけない変異。
 *
 * テストはモデルと形式の並びだけを見る。ログの文面は見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_011',
  family: 'unit',
  expect: 'NONE',
  title: "json_object へ落とすときのログを言い換える",
  touches: ["src/ai/client.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/client.ts", "json_object でやり直します", "json_object に切り替えて再送します");
  },
} satisfies Mutation;
