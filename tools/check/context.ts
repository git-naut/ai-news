/**
 * 検査が作業ツリーを読むための道具一式。
 *
 * 系統はファイルシステムを直接触らず、ここを通す。改行の正規化とファイル一覧の
 * 取り方を1か所に寄せるため。系統ごとに書くと、片方だけ CRLF で落ちる。
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listFiles } from './files.js';

/** 取り下げた変異の一覧を含む決まり。正本は tools/check/policy.json。 */
export interface Policy {
  mutations: {
    /** 変異 ID から取り下げ理由への対応 */
    accepted: Record<string, unknown>;
  };
}

/** policy.json の置き場所（root からの相対）。 */
export const POLICY_PATH = 'tools/check/policy.json';

/** 検査に渡す文脈。 */
export interface Context {
  /** 作業ツリーの絶対パス */
  root: string;
  /**
   * @param rel root からの相対パス
   * @returns 絶対パス
   */
  path(rel: string): string;
  /**
   * @param rel root からの相対パス
   * @returns ファイルがあれば true
   */
  exists(rel: string): boolean;
  /**
   * @param rel root からの相対パス
   * @returns 改行を LF に揃えた本文
   */
  read(rel: string): Promise<string>;
  /** @returns 作業ツリーのファイル一覧（一度だけ取って使い回す） */
  files(): Promise<string[]>;
  /** @returns policy.json の中身。無ければ空の既定値 */
  policy(): Promise<Policy>;
}

/**
 * 値が素のオブジェクトかを確かめる。
 * @param v 調べる値
 * @returns 配列でも null でもないオブジェクトなら true
 */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * policy.json を読んで形を整える。壊れていたら例外を投げる。
 * 黙って空扱いにすると、取り下げの一覧が消えたことに気づけない。
 * @param text policy.json の本文
 * @returns 整えた Policy
 */
export function parsePolicy(text: string): Policy {
  const raw: unknown = JSON.parse(text);
  if (!isRecord(raw)) throw new Error('policy.json の最上位がオブジェクトではありません');
  const muts = raw['mutations'];
  const accepted = isRecord(muts) ? muts['accepted'] : undefined;
  if (accepted !== undefined && !isRecord(accepted)) {
    throw new Error('policy.json の mutations.accepted はオブジェクト（ID→理由）で書きます');
  }
  return { mutations: { accepted: accepted ?? {} } };
}

/**
 * 文脈を作る。
 * @param root 作業ツリーの絶対パス
 * @returns 検査に渡す Context
 */
export function makeContext(root: string): Context {
  let filesCache: Promise<string[]> | undefined;
  let policyCache: Promise<Policy> | undefined;
  const path = (rel: string): string => join(root, rel);
  const read = async (rel: string): Promise<string> =>
    (await readFile(path(rel), 'utf8')).replace(/\r\n/g, '\n');
  return {
    root,
    path,
    exists: (rel) => existsSync(path(rel)),
    read,
    files: () => (filesCache ??= listFiles(root)),
    policy: () =>
      (policyCache ??= existsSync(path(POLICY_PATH))
        ? read(POLICY_PATH).then(parsePolicy)
        : Promise.resolve({ mutations: { accepted: {} } })),
  };
}
