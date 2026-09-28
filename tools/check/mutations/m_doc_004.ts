/**
 * README の HN の検索の本数だけを 6 にする。DOC-1 が捕まえるはず。
 *
 * HN を hnrss から Algolia へ移したときのように、本数は取得元の変更で動く。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_doc_004',
  family: 'doc',
  expect: 'DOC-1',
  title: "README の HN の検索の本数だけを 6 にする",
  touches: ["README.md"],
  async apply(ws) {
    await replaceOnce(ws, "README.md", "Hacker News の検索 5 本、", "Hacker News の検索 6 本、");
  },
} satisfies Mutation;
