/**
 * package.json の dotenv だけ版を上げる。DEP-1 が捕まえるはず。
 *
 * lockfile を作り直さずに package.json だけ触った状態。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_dep_001',
  family: 'dep',
  expect: 'DEP-1',
  title: "package.json の dotenv だけ版を上げる",
  touches: ["package.json"],
  async apply(ws) {
    await replaceOnce(ws, "package.json", "\"dotenv\": \"^16.4.7\"", "\"dotenv\": \"^16.6.1\"");
  },
} satisfies Mutation;
