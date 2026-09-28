/**
 * 旧 Gemini SDK を dependencies に戻す。DEP-3 が捕まえるはず。
 *
 * 2025-11-30 にサポートが終わった依存。lockfile は触らないので DEP-1 も反応する。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_dep_004',
  family: 'dep',
  expect: 'DEP-3',
  title: "旧 Gemini SDK を dependencies に戻す",
  touches: ["package.json"],
  async apply(ws) {
    await replaceOnce(ws, "package.json", "\"axios\": \"1.13.6\",", "\"@google/generative-ai\": \"^0.24.1\",\n    \"axios\": \"1.13.6\",");
  },
} satisfies Mutation;
