/**
 * 記事の取得窓（何時間前までの記事を拾うか）。RSS と NewsData の両方がこの値を使う。
 *
 * 36h にしているのは、週明け月曜の配信で土日の記事を取りこぼさないため。
 * 取得元ごとに別の値を書くと片方だけ短くなり、その取得元の週末分が黙って落ちる。
 */
export const LOOKBACK_HOURS = 36;

const HOUR_MS = 60 * 60 * 1000;

/**
 * 公開日時が取得窓の内側にあるかを返す。境界ちょうど（now - LOOKBACK_HOURS）は内側に含める。
 * @param date 記事の公開日時
 * @param now 基準時刻（通常は現在時刻）
 */
export function isWithinLookback(date: Date, now: Date): boolean {
  return date.getTime() >= now.getTime() - LOOKBACK_HOURS * HOUR_MS;
}
