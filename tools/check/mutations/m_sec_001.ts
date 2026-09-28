/**
 * README に Google API キーの形をした文字列を書き足す。SEC-2 が捕まえるはず。
 *
 * 鍵をこのファイルに直書きしない。書くと、このファイル自身が SEC-2 に引っかかり、
 * 基準の段階で赤くなる（基準で赤いと増分 0 に見えることがある）。
 */

import type { Mutation } from '../workspace.js';

export default {
  id: 'm_sec_001',
  family: 'sec',
  expect: 'SEC-2',
  title: 'README に Google API キーの形をした文字列を足す',
  touches: ['README.md'],
  async apply(ws) {
    const text = await ws.read('README.md');
    const fake = `AIza${'x'.repeat(35)}`;
    await ws.write('README.md', `${text}\n設定例: GEMINI_API_KEY=${fake}\n`);
    return 'README.md の末尾に 39 文字の AIza… を足した';
  },
} satisfies Mutation;
