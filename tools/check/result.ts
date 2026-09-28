/**
 * 検査1本ぶんの結果。
 *
 * dev/google の tools/check/result.py を移植した。要は `surveyed`（見た対象の数）と
 * `primary`（素通り判定に使う主たる対象のキー）。対象が0件のまま緑になる状態は
 * 検査が働いた結果ではないので、それに気づく手段がこの2つしかない。
 */

/** 不合格1件。 */
export interface Failure {
  /** 検査 ID。例 `SEC-2` */
  check: string;
  /** 何が悪いか */
  message: string;
  /** ファイルと行。例 `README.md:14` */
  where?: string;
  /** どう直すか */
  remedy?: string;
}

/** 検査1本ぶんの結果。 */
export interface Result {
  /** 結果のまとまりの名前。例 `SEC-2` や `LES` */
  check: string;
  /** 不合格の一覧。空なら合格 */
  failures: Failure[];
  /** 見た対象の数。素通りの検出に使う */
  surveyed: Record<string, number>;
  /**
   * 素通り判定に使う主たる対象のキー。これが 0 件のまま緑なら素通り。
   * 「すべて 0 件」にしないのは、付随的な件数が 1 でも入ると判定が効かなくなるため。
   */
  primary?: string;
  /** 落としはしないが人が見るべきもの */
  warnings: string[];
  /** 検査の前提に関する断り書き */
  notes: string[];
}

/**
 * 結果を組み立てる。省略した配列と件数は空で埋める。
 * @param init 検査名と、埋めたい項目
 * @returns 欠けのない Result
 */
export function makeResult(init: Partial<Result> & { check: string }): Result {
  return {
    check: init.check,
    failures: init.failures ?? [],
    surveyed: init.surveyed ?? {},
    primary: init.primary,
    warnings: init.warnings ?? [],
    notes: init.notes ?? [],
  };
}

/**
 * 合格したか。
 * @param r 検査結果
 * @returns 不合格が0件なら true
 */
export function ok(r: Result): boolean {
  return r.failures.length === 0;
}

/**
 * 対象0件のまま緑になっていないか。
 *
 * `primary` を宣言していない結果は判定しない。宣言していても surveyed にキーが
 * 無ければ「数えていない」とみなし、これも判定しない。0 を明示したときだけ素通り。
 * @param r 検査結果
 * @returns 素通りなら true
 */
export function vacuous(r: Result): boolean {
  if (!ok(r) || r.primary === undefined) return false;
  return r.surveyed[r.primary] === 0;
}

/**
 * 検査 ID ごとの不合格件数を数える。変異注入の増分判定に使う。
 * @param failures 不合格の一覧
 * @returns 検査 ID から件数への対応
 */
export function countByCheck(failures: readonly Failure[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of failures) out[f.check] = (out[f.check] ?? 0) + 1;
  return out;
}
