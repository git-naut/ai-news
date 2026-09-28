/**
 * dep 系統 — 依存の宣言と lockfile の整合。
 *
 * 2026-04-01 に axios を package.json だけで 1.13.6 に固定し、lockfile の specifier は
 * ^1.7.9 のまま残っていた。この状態で push すると CI と毎朝の実行が
 * `pnpm install --frozen-lockfile` の ERR_PNPM_OUTDATED_LOCKFILE で落ちる（手元で実測）。
 * pnpm を起動せず、package.json と pnpm-lock.yaml の specifier を突き合わせて先に捕まえる。
 */

import { parse } from 'yaml';
import type { Context } from '../context.js';
import { isRecord } from '../context.js';
import { makeResult, type Failure, type Result } from '../result.js';

export const ID = 'dep';
export const TITLE = '依存の整合';
export const speed = 'fast' as const;

/**
 * 版を完全に固定しておく依存。範囲指定にすると、乗っ取られた新しい版が install で入る。
 * axios は 2026-03 末の乗っ取りを受けて固定した。
 */
const PINNED = ['axios'];

const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;

/**
 * 依存に入れてはいけないパッケージと理由。
 * @google/generative-ai は 2025-11-30 にサポートが終わった旧 Gemini SDK。2026-09-29 に LLM を
 * ModelArk へ移し、Gemini の SDK は新旧とも外した。
 */
const FORBIDDEN: Record<string, string> = {
  '@google/generative-ai': '2025-11-30 にサポートが終わった旧 Gemini SDK です',
};

/**
 * 依存の名前から specifier への対応を取り出す。
 * @param v package.json か lockfile の1区分
 * @param fromLock lockfile の形（名前 → { specifier, version }）なら true
 * @returns 名前 → specifier
 */
function specifiers(v: unknown, fromLock: boolean): Map<string, string> {
  const out = new Map<string, string>();
  if (!isRecord(v)) return out;
  for (const [name, spec] of Object.entries(v)) {
    if (fromLock) {
      if (isRecord(spec) && typeof spec['specifier'] === 'string') out.set(name, spec['specifier']);
    } else if (typeof spec === 'string') {
      out.set(name, spec);
    }
  }
  return out;
}

/**
 * 依存の宣言と lockfile の整合を調べる。
 * @param ctx 作業ツリーを読むための文脈
 * @returns DEP-1〜DEP-3 の結果
 */
export async function run(ctx: Context): Promise<Result[]> {
  const pkg: unknown = JSON.parse(await ctx.read('package.json'));
  const lock: unknown = parse(await ctx.read('pnpm-lock.yaml'));
  if (!isRecord(pkg)) throw new Error('package.json の最上位がオブジェクトではありません');
  if (!isRecord(lock)) throw new Error('pnpm-lock.yaml の最上位がオブジェクトではありません');
  const importers = isRecord(lock['importers']) ? lock['importers'] : {};
  const root = isRecord(importers['.']) ? importers['.'] : {};

  // DEP-1: 区分ごとに、名前の集合と specifier が一致する（並び順は見ない）
  const syncFails: Failure[] = [];
  let compared = 0;
  for (const section of SECTIONS) {
    const want = specifiers(pkg[section], false);
    const have = specifiers(root[section], true);
    for (const [name, spec] of want) {
      compared++;
      const locked = have.get(name);
      if (locked === undefined) {
        syncFails.push({
          check: 'DEP-1',
          message: `${section}.${name} が lockfile にありません`,
          where: 'pnpm-lock.yaml importers["."]',
          remedy: 'pnpm install --lockfile-only --ignore-scripts で lockfile を作り直してください。',
        });
      } else if (locked !== spec) {
        syncFails.push({
          check: 'DEP-1',
          message: `${section}.${name} の specifier が食い違います（package.json: ${spec} / lockfile: ${locked}）`,
          where: 'pnpm-lock.yaml importers["."]',
          remedy: 'このまま push すると --frozen-lockfile で CI と毎朝の実行が落ちます。lockfile を作り直してください。',
        });
      }
    }
    for (const name of have.keys()) {
      if (!want.has(name)) {
        syncFails.push({ check: 'DEP-1', message: `lockfile の ${section}.${name} が package.json にありません`, where: 'pnpm-lock.yaml' });
      }
    }
  }

  // DEP-2: 固定しておく依存が完全な版で書かれている
  const pinFails: Failure[] = [];
  const deps = specifiers(pkg['dependencies'], false);
  for (const name of PINNED) {
    const spec = deps.get(name);
    if (spec === undefined || !/^\d+\.\d+\.\d+$/.test(spec)) {
      pinFails.push({
        check: 'DEP-2',
        message: `${name} が完全な版で固定されていません: ${spec ?? '（なし）'}`,
        where: 'package.json dependencies',
        remedy: '^ や ~ を外し、確かめた版を1つだけ書いてください。',
      });
    }
  }

  // DEP-3: 入れてはいけない依存がどの区分にも無い
  const forbidFails: Failure[] = [];
  for (const section of SECTIONS) {
    for (const name of specifiers(pkg[section], false).keys()) {
      const why = FORBIDDEN[name];
      if (why !== undefined) {
        forbidFails.push({ check: 'DEP-3', message: `${section}.${name} は入れない依存です（${why}）`, where: 'package.json' });
      }
    }
  }

  return [
    makeResult({ check: 'DEP-3', failures: forbidFails, surveyed: { 禁止: Object.keys(FORBIDDEN).length, 依存: compared }, primary: '禁止' }),
    makeResult({ check: 'DEP-1', failures: syncFails, surveyed: { 依存: compared }, primary: '依存' }),
    makeResult({ check: 'DEP-2', failures: pinFails, surveyed: { 固定: PINNED.length }, primary: '固定' }),
  ];
}
