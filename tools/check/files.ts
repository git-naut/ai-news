/**
 * 作業ツリーのファイル一覧。
 *
 * git が使えるなら `git ls-files --cached --others --exclude-standard` を使う。
 * 追跡済みに加えて、まだ add していないが無視もされていないファイルも入る。
 * 次のコミットに入りうるものは全部見る、という範囲。
 *
 * 逆テストのサンドボックスには .git が無い。そこでは木を歩いて一覧を作る。
 * サンドボックスに置かれているのは元の一覧から複製したものと変異が足したものだけなので、
 * 「置かれている＝追跡される」とみなしてよい。
 */

import { execFile } from 'node:child_process';
import { readdir, realpath, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

/** 一覧から外すディレクトリ。生成物と状態置き場と依存。 */
export const SKIP_DIRS = new Set(['.git', '.state', 'node_modules', 'dist', 'coverage']);

/**
 * root 自身が git の作業ツリーの最上位かを確かめて、ファイル一覧をもらう。
 *
 * 上位を確かめないと、/tmp の下のサンドボックスがたまたま別のリポジトリの中にあったとき、
 * その親リポジトリの一覧を拾ってしまう。
 * @param root 作業ツリーの絶対パス
 * @returns root からの相対パス（区切りは `/`）。git が使えなければ null
 */
async function gitFiles(root: string): Promise<string[] | null> {
  try {
    const top = await execFileP('git', ['-C', root, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    });
    const [a, b] = await Promise.all([realpath(top.stdout.trim()), realpath(root)]);
    if (a !== b) return null;
    const out = await execFileP(
      'git',
      ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    return out.stdout.split('\0').filter((s) => s !== '');
  } catch {
    return null;
  }
}

/**
 * 木を歩いてファイル一覧を作る。git が使えないときの代わり。
 * @param root 作業ツリーの絶対パス
 * @returns root からの相対パス（区切りは `/`）
 */
async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) await walk(join(dir, e.name));
      } else if (e.isFile()) {
        out.push(relative(root, join(dir, e.name)).split(sep).join('/'));
      }
    }
  };
  await walk(root);
  return out;
}

/**
 * 作業ツリーのファイル一覧を返す。消したが git にはまだ残っているものは除く。
 * @param root 作業ツリーの絶対パス
 * @returns 並べ替え済みの相対パス（区切りは `/`）
 */
export async function listFiles(root: string): Promise<string[]> {
  const listed = (await gitFiles(root)) ?? (await walkFiles(root));
  const kept: string[] = [];
  for (const rel of listed) {
    if (rel.split('/').some((part) => SKIP_DIRS.has(part))) continue;
    try {
      if ((await stat(join(root, rel))).isFile()) kept.push(rel);
    } catch {
      // 削除済みでまだ git の索引に残っているもの
    }
  }
  return kept.sort();
}
