/**
 * 系統の一覧。
 *
 * 系統は読み込みを遅らせて1本ずつ import する。まとめて静的に import すると、
 * 1本の構文エラーで検査全体が起動できなくなり、逆テストからは「JSON が返らない」
 * としか見えない。遅らせておけば、読み込みに失敗した系統だけが `<ID>-X` で落ちる。
 */

import type { Context } from '../context.js';
import type { Result } from '../result.js';

/** 系統の速さ。既定の実行（`--all` なし）は fast だけを回す。 */
export type Speed = 'fast' | 'slow';

/** 系統のモジュールが export するもの。 */
export interface FamilyModule {
  /** 系統 ID。小文字。例 `sec` */
  ID: string;
  /** 人が読む名前 */
  TITLE: string;
  speed: Speed;
  /**
   * 検査を走らせる。
   * @param ctx 作業ツリーを読むための文脈
   * @returns 検査結果の一覧
   */
  run(ctx: Context): Promise<Result[]>;
}

/** 一覧の1行。ID と、不合格 ID の接頭辞と、読み込み手続き。 */
export interface FamilyEntry {
  id: string;
  /** 不合格 ID の接頭辞。検査が落ちたときの `<prefix>-X` にも使う */
  prefix: string;
  load(): Promise<FamilyModule>;
}

/** 登録済みの系統。足すときはここに1行足す。 */
export const FAMILIES: readonly FamilyEntry[] = [
  { id: 'sec', prefix: 'SEC', load: async () => import('./sec.js') },
  { id: 'lessons', prefix: 'LES', load: async () => import('./lessons.js') },
  { id: 'loop', prefix: 'LOOP', load: async () => import('./loop.js') },
];

/**
 * 系統 ID から一覧の行を引く。
 * @param id 系統 ID
 * @returns 見つかった行。無ければ undefined
 */
export function findFamily(id: string): FamilyEntry | undefined {
  return FAMILIES.find((f) => f.id === id);
}
