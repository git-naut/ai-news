/**
 * 重複判定が探すジョブ名を1文字ずらす。WF-2 が捕まえるはず。
 *
 * ジョブ名と判定の文字列がずれると、primary が届いた日も backup が二通目を送る。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_wf_002',
  family: 'wf',
  expect: 'WF-2',
  title: "重複判定が探すジョブ名を1文字ずらす",
  touches: [".github/scripts/decide-delivery.sh"],
  async apply(ws) {
    await replaceOnce(ws, ".github/scripts/decide-delivery.sh", "\"send-digest (primary)\"", "\"send-digest(primary)\"");
  },
} satisfies Mutation;
