/**
 * sec 系統 — 秘密をリポジトリに入れていないか。
 *
 * この repo は GitHub Actions の Secrets に Gemini の鍵と Gmail のアプリパスワードを
 * 置いて動く。手元の .env を誤って add すると、公開リポジトリなら数分で鍵が拾われる。
 * 見るのは次のコミットに入りうるファイル全部（tools/check/files.ts の範囲）。
 */

import type { Context } from '../context.js';
import { makeResult, type Failure, type Result } from '../result.js';

export const ID = 'sec';
export const TITLE = '秘密の混入';
export const speed = 'fast' as const;

/** 追跡してよい .env 系のファイル名。中身は空の雛形に限る。 */
const TEMPLATE_NAMES = new Set(['.env.example', '.env.sample', '.env.template']);

/** .env 系のファイル名か。`.env`、`.env.local`、`.env.production` など。 */
const ENV_NAME = /^\.env(\..+)?$/;

/** どのファイルに出ても鍵とみなす形。 */
const KEY_SHAPES: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'Google API キー', re: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'GitHub の個人トークン（classic）', re: /ghp_[0-9A-Za-z]{36}/g },
  { name: 'GitHub の個人トークン（fine-grained）', re: /github_pat_[0-9A-Za-z_]{80,}/g },
];

/**
 * .env 系のファイルに限って鍵とみなす形。
 * Gmail のアプリパスワードは英小文字4文字×4の空白区切り。散文にも出る形なので、
 * README などに当てると誤検知が増える。
 */
const ENV_ONLY_SHAPES: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'Gmail のアプリパスワード', re: /\b[a-z]{4} [a-z]{4} [a-z]{4} [a-z]{4}\b/g },
];

/** これより大きいファイルは読まない（ロックファイルでも 1 MB に届かない）。 */
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * パスの末尾のファイル名を返す。
 * @param rel `/` 区切りの相対パス
 * @returns ファイル名
 */
function basename(rel: string): string {
  return rel.slice(rel.lastIndexOf('/') + 1);
}

/**
 * 文字位置から行番号を出す。
 * @param text 本文
 * @param index 文字位置
 * @returns 1 始まりの行番号
 */
function lineOf(text: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/**
 * 秘密の混入を調べる。
 * @param ctx 作業ツリーを読むための文脈
 * @returns SEC-1 と SEC-2 の結果
 */
export async function run(ctx: Context): Promise<Result[]> {
  const files = await ctx.files();

  // SEC-1: .env そのものが追跡対象に入っていないか
  const envFails: Failure[] = [];
  let envFiles = 0;
  for (const rel of files) {
    const name = basename(rel);
    if (!ENV_NAME.test(name)) continue;
    envFiles++;
    if (TEMPLATE_NAMES.has(name)) continue;
    envFails.push({
      check: 'SEC-1',
      message: `${name} が追跡対象に入っています`,
      where: rel,
      remedy: 'git rm --cached で索引から外し、鍵を失効させてから作り直してください。',
    });
  }

  // SEC-2: 追跡対象のどこかに鍵の形をした文字列がないか
  const keyFails: Failure[] = [];
  let scanned = 0;
  let skipped = 0;
  for (const rel of files) {
    let text: string;
    try {
      text = await ctx.read(rel);
    } catch {
      skipped++;
      continue;
    }
    if (text.length > MAX_BYTES || text.includes('\0')) {
      skipped++;
      continue;
    }
    scanned++;
    const shapes = ENV_NAME.test(basename(rel)) ? [...KEY_SHAPES, ...ENV_ONLY_SHAPES] : KEY_SHAPES;
    for (const { name, re } of shapes) {
      for (const m of text.matchAll(re)) {
        keyFails.push({
          check: 'SEC-2',
          message: `${name}の形をした文字列があります（先頭 ${m[0].slice(0, 6)}…）`,
          where: `${rel}:${lineOf(text, m.index ?? 0)}`,
          remedy: '本物なら今すぐ失効させ、履歴からも消してください。例示なら形を崩して書きます。',
        });
      }
    }
  }

  return [
    makeResult({
      check: 'SEC-1',
      failures: envFails,
      surveyed: { ファイル: files.length, 環境ファイル: envFiles },
      primary: 'ファイル',
    }),
    makeResult({
      check: 'SEC-2',
      failures: keyFails,
      surveyed: { 読んだファイル: scanned, 読まなかったファイル: skipped },
      primary: '読んだファイル',
    }),
  ];
}
