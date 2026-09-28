/**
 * 1 本の検索の失敗を HN 全体に広げる。UNIT-1 が捕まえるはず。
 *
 * hnrss.org では 1 本の 502 がよくあった。Algolia でも 1 本の失敗で他を捨てない。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_173',
  family: 'unit',
  expect: 'UNIT-1',
  title: "1 本の検索の失敗を HN 全体に広げる",
  touches: ["src/hn/client.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/hn/client.ts", "        return [];\n      }\n    })", "        throw error;\n      }\n    })");
  },
} satisfies Mutation;
