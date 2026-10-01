/**
 * 予備配信の起点を「現在以前で最も新しい 23:35」に戻す。UNIT-1 が捕まえるはず。
 *
 * 19 時間 35 分以上遅れた予約実行が、まだ来ていない翌朝の primary を探して予備配信を誤って送る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_221',
  family: 'unit',
  expect: 'UNIT-1',
  title: "予備配信の起点を「現在以前で最も新しい 23:35」に戻す",
  touches: [".github/scripts/decide-delivery.sh"],
  async apply(ws) {
    await replaceOnce(ws, ".github/scripts/decide-delivery.sh", "SCHEDULED=$(date -u -d \"$TODAY 04:00:00\" +%s)\nif [ \"$SCHEDULED\" -gt \"$NOW\" ]; then\n  SCHEDULED=$((SCHEDULED - 86400))\nfi\n# 予定時刻 04:00 の 4 時間 25 分前 = 前夜の 23:35\nSLOT=$((SCHEDULED - 4 * 3600 - 25 * 60))", "SLOT=$(date -u -d \"$TODAY 23:35:00\" +%s)\nif [ \"$SLOT\" -gt \"$NOW\" ]; then\n  SLOT=$((SLOT - 86400))\nfi");
  },
} satisfies Mutation;
