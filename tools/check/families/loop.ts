/**
 * loop 系統 — 検査そのものを信じてよいか。
 *
 * 逆テストで取り残した変異（すり抜け、誤検知、変異の実行エラー）が .state/gaps.json に
 * 残っていたら、他の系統が全部緑でも作業場を赤にする。
 *
 * 移植元の loop.py は primary を宣言しておらず、入口の数も定数で書いていたので、
 * 素通り判定が一度も効かなかった。ここでは変異の本数を実際に数えて primary にする。
 * 変異が0本なら、逆テストは何も確かめていないのに gaps.json は空のまま緑になる。
 */

import type { Context } from '../context.js';
import { isRecord } from '../context.js';
import { makeResult, type Failure, type Result } from '../result.js';
import { collectMutationIds } from './lessons.js';

export const ID = 'loop';
export const TITLE = 'ループの健全性';
export const speed = 'fast' as const;

export const GAPS_PATH = '.state/gaps.json';

/**
 * ループの健全性を調べる。
 * @param ctx 作業ツリーを読むための文脈
 * @returns LOOP-2 の結果
 */
export async function run(ctx: Context): Promise<Result[]> {
  const failures: Failure[] = [];
  const notes: string[] = [];
  const mutations = await collectMutationIds(ctx);

  let entries: unknown[] = [];
  if (ctx.exists(GAPS_PATH)) {
    const raw: unknown = JSON.parse(await ctx.read(GAPS_PATH));
    const e = isRecord(raw) ? raw['entries'] : undefined;
    if (!Array.isArray(e)) throw new Error(`${GAPS_PATH} に entries の配列がありません`);
    entries = e;
  } else {
    notes.push('.state/gaps.json がありません。逆テストをまだ回していません（pnpm check --mutate）。');
  }

  // gaps.json を書いた後に取り下げた変異もあるので、ここでも除く
  const accepted = (await ctx.policy()).mutations.accepted;
  for (const e of entries) {
    const id = isRecord(e) && typeof e['id'] === 'string' ? e['id'] : '?';
    if (Object.hasOwn(accepted, id)) continue;
    const outcome = isRecord(e) && typeof e['outcome'] === 'string' ? e['outcome'] : '?';
    const expect = isRecord(e) && typeof e['expect'] === 'string' ? e['expect'] : '?';
    failures.push({
      check: 'LOOP-2',
      message: `変異 ${id} が ${outcome} のままです（期待 ${expect}）`,
      where: GAPS_PATH,
      remedy:
        '検査を直して pnpm check --mutate を回し直すか、tools/check/policy.json の mutations.accepted に理由つきで登録し、docs/LESSONS.md に教訓を書いてください。',
    });
  }

  return [
    makeResult({
      check: 'LOOP',
      failures,
      surveyed: { 変異: mutations.size, 未解決: entries.length },
      primary: '変異',
      notes,
    }),
  ];
}
