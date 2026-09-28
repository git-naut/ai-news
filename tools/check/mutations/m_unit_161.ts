/**
 * 長い語の前方一致を無効にする。UNIT-1 が捕まえるはず。
 *
 * 語の境界を厳密にしただけだと agentic・gpt4o・llama3・llamaindex を取りこぼす（検証役の指摘）。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_161',
  family: 'unit',
  expect: 'UNIT-1',
  title: "長い語の前方一致を無効にする",
  touches: ["src/categorizer/classifier.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/categorizer/classifier.ts", "const PREFIX_MATCH_MIN_LENGTH = 5;", "const PREFIX_MATCH_MIN_LENGTH = 99;");
  },
} satisfies Mutation;
