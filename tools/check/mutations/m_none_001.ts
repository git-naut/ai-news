/**
 * .env.example のコメントを言い換える。捕まえてはいけない変異。
 *
 * sec 系統は .env.example を「追跡してよい雛形」として扱い、中身は鍵の形だけを見る。
 * コメントの言い回しは見ていない軸なので、ここで反応したら検査が過敏。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_001',
  family: 'sec',
  expect: 'NONE',
  title: '.env.example のコメントを言い換える（意味は変わらない）',
  touches: ['.env.example'],
  async apply(ws) {
    await replaceOnce(
      ws,
      '.env.example',
      '# 配信先メールアドレス（自分自身でも可）',
      '# 配信先のメールアドレス（自分宛てでもよい）',
    );
  },
} satisfies Mutation;
