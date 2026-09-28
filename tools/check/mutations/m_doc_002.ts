/**
 * コードの主モデルだけを替える。DOC-2 が捕まえるはず。
 *
 * README のモデル ID が古いまま残る形。3 月の README は Gemini と書いていた。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_doc_002',
  family: 'doc',
  expect: 'DOC-2',
  title: "コードの主モデルだけを替える",
  touches: ["src/ai/client.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/ai/client.ts", "export const PRIMARY_MODEL = 'seed-2-0-lite-260428';", "export const PRIMARY_MODEL = 'seed-2-0-mini-260428';");
  },
} satisfies Mutation;
