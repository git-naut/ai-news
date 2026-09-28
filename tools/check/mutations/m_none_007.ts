/**
 * 判定スクリプトのログの文面を言い換える。捕まえてはいけない変異。
 *
 * WF-2 は探す文字列の数だけを見る。ログの文面は見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_007',
  family: 'wf',
  expect: 'NONE',
  title: "判定スクリプトのログの文面を言い換える",
  touches: [".github/scripts/decide-delivery.sh"],
  async apply(ws) {
    await replaceOnce(ws, ".github/scripts/decide-delivery.sh", "echo \"manual: 即時に送信します。\"", "echo \"manual: すぐに送ります。\"");
  },
} satisfies Mutation;
