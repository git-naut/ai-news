/**
 * normalizeUrl を元の形に戻し、クエリを丸ごと捨てて全体を小文字にする。UNIT-1 が捕まえるはず。
 *
 * news.ycombinator.com/item?id=1 と ?id=2 が同じ URL になり、別記事が1件に潰れる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_121',
  family: 'unit',
  expect: 'UNIT-1',
  title: "normalizeUrl でクエリを丸ごと捨てて全体を小文字にする",
  touches: ["src/categorizer/deduplicator.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/categorizer/deduplicator.ts", "return `${parsed.protocol}//${parsed.host}${path}${search ? `?${search}` : ''}`;", "return `${parsed.protocol}//${parsed.host}${path}`.toLowerCase();");
  },
} satisfies Mutation;
