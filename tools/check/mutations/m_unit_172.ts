/**
 * url の無い投稿に HN の item ページを入れない。UNIT-1 が捕まえるはず。
 *
 * Ask HN は url のキーが無い。空の URL の記事はリンク切れで届く。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_172',
  family: 'unit',
  expect: 'UNIT-1',
  title: "url の無い投稿に HN の item ページを入れない",
  touches: ["src/hn/client.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/hn/client.ts", "url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,", "url: h.url ?? '',");
  },
} satisfies Mutation;
