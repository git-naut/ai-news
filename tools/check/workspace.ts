/**
 * 変異を当てる使い捨ての作業ツリーと、変異を書くための道具。
 *
 * 変異のモジュール（tools/check/mutations/m_*.ts）はここだけを import する。
 * mutate.ts を import すると、変異を1本読むたびに逆テストの本体まで読み込まれる。
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** 変異を当てる対象が無い。捕捉にも、すり抜けにも数えず `na` にする。 */
export class NotApplicable extends Error {
  /** @param message 当てられなかった理由 */
  constructor(message: string) {
    super(message);
    this.name = 'NotApplicable';
  }
}

/** 変異を当てる使い捨ての作業ツリー。 */
export class Workspace {
  /** @param root サンドボックスの絶対パス */
  constructor(readonly root: string) {}

  /**
   * @param rel root からの相対パス
   * @returns 絶対パス
   */
  path(rel: string): string {
    return join(this.root, rel);
  }

  /**
   * @param rel root からの相対パス
   * @returns ファイルがあれば true
   */
  exists(rel: string): boolean {
    return existsSync(this.path(rel));
  }

  /**
   * 無ければ NotApplicable を投げる。
   * @param rel root からの相対パス
   */
  require(rel: string): void {
    if (!this.exists(rel)) throw new NotApplicable(`${rel} がありません`);
  }

  /**
   * @param rel root からの相対パス
   * @returns 改行を LF に揃えた本文
   */
  async read(rel: string): Promise<string> {
    this.require(rel);
    return (await readFile(this.path(rel), 'utf8')).replace(/\r\n/g, '\n');
  }

  /**
   * 親ディレクトリごと作って書く。
   * @param rel root からの相対パス
   * @param text 本文
   */
  async write(rel: string, text: string): Promise<void> {
    await mkdir(dirname(this.path(rel)), { recursive: true });
    await writeFile(this.path(rel), text, 'utf8');
  }
}

/** 変異1本。 */
export interface Mutation {
  /** 変異 ID。ファイル名と同じにする（例 `m_sec_001`） */
  id: string;
  /** 走らせる系統 ID */
  family: string;
  /** 増えるはずの検査 ID。捕まえてはいけない変異なら `NONE` */
  expect: string;
  /** 何を壊すか */
  title: string;
  /** 変異が前提にする既存ファイル。表の健全性テストが実在を確かめる */
  touches: readonly string[];
  /**
   * 作業ツリーを壊す。
   * @param ws サンドボックス
   * @returns 何をしたかの一言（任意）
   */
  apply(ws: Workspace): Promise<string | void>;
}

/**
 * policy.json の mutations.accepted を差し替える。他の項目は残す。
 * @param ws サンドボックス
 * @param accepted 変異 ID から取り下げ理由への対応
 */
export async function setAccepted(ws: Workspace, accepted: Record<string, unknown>): Promise<void> {
  const rel = 'tools/check/policy.json';
  const raw: unknown = JSON.parse(await ws.read(rel));
  const base = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {};
  await ws.write(rel, `${JSON.stringify({ ...base, mutations: { accepted } }, null, 2)}\n`);
}

/**
 * 文字列をちょうど1か所だけ置き換える。
 *
 * 0 か所なら表が腐っている。2 か所以上なら意図しない場所も書き換える。
 * どちらも NotApplicable にして、捕捉やすり抜けに混ぜない。
 * @param ws サンドボックス
 * @param file root からの相対パス
 * @param find 探す文字列
 * @param replace 置き換える文字列
 */
export async function replaceOnce(ws: Workspace, file: string, find: string, replace: string): Promise<void> {
  const text = await ws.read(file);
  const count = text.split(find).length - 1;
  if (count !== 1) {
    throw new NotApplicable(`${file} に ${JSON.stringify(find.slice(0, 40))} が ${count} 箇所あります（1 箇所のはず）`);
  }
  await ws.write(file, text.replace(find, () => replace));
}
