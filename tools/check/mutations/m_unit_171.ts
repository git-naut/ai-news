/**
 * HN の検索をタイトルに限らない。UNIT-1 が捕まえるはず。
 *
 * 本文・URL・投稿者名にも当たり、LLM が "Have an LLC" に当たる（2026-09-29 の実測）。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_171',
  family: 'unit',
  expect: 'UNIT-1',
  title: "HN の検索をタイトルに限らない",
  touches: ["src/hn/client.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/hn/client.ts", "    restrictSearchableAttributes: 'title',\n", "");
  },
} satisfies Mutation;
