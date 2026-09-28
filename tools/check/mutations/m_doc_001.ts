/**
 * README の RSS の本数だけを 9 にする。DOC-1 が捕まえるはず。
 *
 * 取得元を足し引きしても README が追いつかない形。3 月の README は 10 ソースと書いたまま 13 本になっていた。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_doc_001',
  family: 'doc',
  expect: 'DOC-1',
  title: "README の RSS の本数だけを 9 にする",
  touches: ["README.md"],
  async apply(ws) {
    await replaceOnce(ws, "README.md", "RSS 8 本、", "RSS 9 本、");
  },
} satisfies Mutation;
