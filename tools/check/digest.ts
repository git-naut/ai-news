/**
 * 作業ツリーの内容ダイジェスト。
 *
 * 鮮度の判定に mtime を使わない。/mnt/c（DrvFs）越しでは WSL と Windows で
 * タイムスタンプの粒度が違い、触っていないのにずれる。内容の sha256 なら
 * どちらから見ても同じ値になる。gate.json を手で緑に書き換えても、ダイジェストが
 * そのときの作業ツリーと一致しないので古いと分かる。
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listFiles } from './files.js';

/** ダイジェストと、混ぜたファイルの数。 */
export interface Digest {
  digest: string;
  files: number;
}

/**
 * 作業ツリーのダイジェストを計算する。
 *
 * 改行は LF に正規化してから混ぜる。Windows と WSL で同じ値にするため。
 * @param root 作業ツリーの絶対パス
 * @returns `sha256:` で始まるダイジェストとファイル数
 */
export async function computeDigest(root: string): Promise<Digest> {
  const files = await listFiles(root);
  const h = createHash('sha256');
  for (const rel of files) {
    let data: Buffer;
    try {
      data = await readFile(join(root, rel));
    } catch {
      continue;
    }
    const normalized = Buffer.from(data.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
    h.update(rel, 'utf8');
    h.update('\0');
    h.update(createHash('sha256').update(normalized).digest());
  }
  return { digest: `sha256:${h.digest('hex')}`, files: files.length };
}
