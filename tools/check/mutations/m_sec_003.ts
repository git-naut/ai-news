/**
 * sec 系統の検査そのものを落とす。SEC-X が出るはず。
 *
 * 移植元（dev/google の gas.py）では、検査が未束縛の変数で落ちたのを逆テストが
 * 「どの検査も反応せず」と読み、すり抜けと誤診した。落ちた検査は `<接頭辞>-X` として
 * 表に出ることを、ここで逆から確かめる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_sec_003',
  family: 'sec',
  expect: 'SEC-X',
  title: 'sec の検査の先頭で例外を投げる',
  touches: ['tools/check/families/sec.ts'],
  async apply(ws) {
    await replaceOnce(
      ws,
      'tools/check/families/sec.ts',
      '  const files = await ctx.files();\n',
      "  if (ctx.root !== '') throw new Error('変異: sec の検査を落とす');\n  const files = await ctx.files();\n",
    );
  },
} satisfies Mutation;
