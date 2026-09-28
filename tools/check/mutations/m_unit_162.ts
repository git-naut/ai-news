/**
 * 相対リンクの基準にフィードの link を渡さない。UNIT-1 が捕まえるはず。
 *
 * XML の置き場所を基準にすると、raw.githubusercontent.com のような別ホストの URL になる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_162',
  family: 'unit',
  expect: 'UNIT-1',
  title: "相対リンクの基準にフィードの link を渡さない",
  touches: ["src/feeds/fetcher.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/feeds/fetcher.ts", "normalizeItem(item, source, feed.link)", "normalizeItem(item, source)");
  },
} satisfies Mutation;
