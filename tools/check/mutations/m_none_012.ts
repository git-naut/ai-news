/**
 * README の Secrets の一覧の並びを入れ替える。捕まえてはいけない変異。
 *
 * DOC-3 は集合で比べる。並び順は見ていない軸。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_012',
  family: 'doc',
  expect: 'NONE',
  title: "README の Secrets の一覧の並びを入れ替える",
  touches: ["README.md"],
  async apply(ws) {
    await replaceOnce(ws, "README.md", "- `ARK_API_KEY`\n- `NEWS_API_KEY`\n", "- `NEWS_API_KEY`\n- `ARK_API_KEY`\n");
  },
} satisfies Mutation;
