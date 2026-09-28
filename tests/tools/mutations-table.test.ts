import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { makeContext } from '../../tools/check/context.js';
import { FAMILIES } from '../../tools/check/families/index.js';
import { collectCheckIds, collectMutationIds } from '../../tools/check/families/lessons.js';
import { discoverMutations } from '../../tools/check/mutate.js';
import type { Mutation } from '../../tools/check/workspace.js';

/**
 * 変異の表そのものの健全性。
 *
 * 表は腐る。検査 ID を変えれば期待が指す先が消え、ファイルを動かせば前提が消える。
 * `pnpm check --mutate` はサンドボックスの複製とプロセスの起動を伴うので毎回は回せない。
 * 表が現在のコードと噛み合っていることだけを、ここで毎回守る。
 *
 * 系統ごとに「捕まえる変異」と「NONE の変異」を最低1本ずつ求める。例外は設けない。
 * lessons と loop も検査を持つ以上、歯と過敏さの両方を測る。
 */
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

let table: Array<{ file: string; mutation: Mutation }> = [];
let checkIds = new Set<string>();

// 変異のモジュールを全部読み込むので遅い。72 本のとき単独で 3.6〜4.0 秒、unit 系統が tsc 3 本と並べて
// 走らせると既定の 10 秒を超えた（2026-09-29）。変異は増え続けるので上限を広めに取る
beforeAll(async () => {
  table = await discoverMutations(ROOT);
  checkIds = await collectCheckIds(makeContext(ROOT));
}, 60_000);

describe('変異の表', () => {
  it('変異がある', () => {
    expect(table.length).toBeGreaterThanOrEqual(FAMILIES.length * 2);
  });

  it('id が重複しない', () => {
    const ids = table.map((t) => t.mutation.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('id がファイル名と一致する', () => {
    for (const t of table) expect(basename(t.file, '.ts'), t.file).toBe(t.mutation.id);
  });

  it('lessons 系統が拾う変異 ID と表の ID が一致する', async () => {
    // lessons は正規表現でファイルを読む。import した表とずれたら LES-4 が空振りする
    const scanned = await collectMutationIds(makeContext(ROOT));
    expect([...scanned].sort()).toEqual(table.map((t) => t.mutation.id).sort());
  });

  it('family が登録済みの系統', () => {
    const known = new Set(FAMILIES.map((f) => f.id));
    for (const { mutation: m } of table) expect(known.has(m.family), `${m.id}: ${m.family}`).toBe(true);
  });

  it('expect が実在する検査 ID か、系統の -X か、NONE', () => {
    const crash = new Set(FAMILIES.map((f) => `${f.prefix}-X`));
    for (const { mutation: m } of table) {
      const valid = m.expect === 'NONE' || checkIds.has(m.expect) || crash.has(m.expect);
      expect(valid, `${m.id}: ${m.expect}`).toBe(true);
    }
  });

  it('touches のファイルが実在する', () => {
    for (const { mutation: m } of table) {
      for (const rel of m.touches) expect(existsSync(`${ROOT}${rel}`), `${m.id}: ${rel}`).toBe(true);
    }
  });

  it('系統ごとに捕まえる変異と NONE の変異が1本ずつ以上ある', () => {
    for (const f of FAMILIES) {
      const mine = table.filter((t) => t.mutation.family === f.id);
      expect(mine.some((t) => t.mutation.expect !== 'NONE'), `${f.id} に捕まえる変異が無い`).toBe(true);
      expect(mine.some((t) => t.mutation.expect === 'NONE'), `${f.id} に NONE の変異が無い`).toBe(true);
    }
  });
});
