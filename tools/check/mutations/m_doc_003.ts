/**
 * README の Secrets の一覧から ARK_API_KEY を消す。DOC-3 が捕まえるはず。
 *
 * 読んだ人が登録し損ね、起動直後に zod が落ちる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_doc_003',
  family: 'doc',
  expect: 'DOC-3',
  title: "README の Secrets の一覧から ARK_API_KEY を消す",
  touches: ["README.md"],
  async apply(ws) {
    await replaceOnce(ws, "README.md", "- `ARK_API_KEY`\n- `NEWS_API_KEY`\n", "- `NEWS_API_KEY`\n");
  },
} satisfies Mutation;
