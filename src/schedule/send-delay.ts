import { z } from 'zod';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * SEND_AT_UTC の検証スキーマ。"HH:MM"（UTC）を受け、空文字と未指定は undefined にする。
 */
export const sendAtUtcSchema = z
  .string()
  .optional()
  .transform((v) => (v === '' ? undefined : v))
  .refine((v) => v === undefined || HHMM.test(v), 'SEND_AT_UTC must be HH:MM (UTC)');

/**
 * SEND_MAX_WAIT_MINUTES の検証スキーマ。待機の上限（分）。未指定なら 20 分。
 * ワークフローの timeout-minutes はこの値より長くしておく。
 */
export const sendMaxWaitMinutesSchema = z.coerce.number().int().min(0).max(60).default(20);

/**
 * 送信までに待つミリ秒を返す。
 *
 * 次に来る目標時刻（UTC の HH:MM）までの待ちが maxWaitMs 以内なら、その待ちを返す。
 * 上限を超える場合や目標ちょうどの場合は 0（即時送信）を返し、翌日へは繰り越さない。
 * 起動が遅れた primary や、誤って目標時刻が渡った backup が長時間待って
 * ジョブのタイムアウトで打ち切られるのを防ぐ。
 *
 * @param now 現在時刻
 * @param sendAtUtc 目標時刻 "HH:MM"。未指定・空文字なら待たない
 * @param maxWaitMs 待機の上限（ミリ秒）
 * @throws sendAtUtc の形式が不正な場合
 */
export function computeSendDelay(now: Date, sendAtUtc: string | undefined, maxWaitMs: number): number {
  if (sendAtUtc === undefined || sendAtUtc === '') return 0;
  const m = HHMM.exec(sendAtUtc);
  if (!m) throw new Error(`SEND_AT_UTC の形式が不正です: ${sendAtUtc}`);

  const target = new Date(now);
  target.setUTCHours(Number(m[1]), Number(m[2]), 0, 0);
  if (target.getTime() < now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  const wait = target.getTime() - now.getTime();
  return wait <= maxWaitMs ? wait : 0;
}

/**
 * 実際にメールを送る予定の時刻を返す。
 *
 * 件名と本文の配信時刻は、起動した時刻ではなくこの時刻で描画する。
 * 起動時刻で描くと、UTC 23:45 に起動して 00:00（JST 09:00）まで待つ primary の件名が
 * 「08:45 JST」になる。
 *
 * @param now 現在時刻（書き換えない）
 * @param delayMs computeSendDelay が返した待ち（ミリ秒）
 * @returns now に delayMs を足した新しい Date
 */
export function plannedSendTime(now: Date, delayMs: number): Date {
  return new Date(now.getTime() + delayMs);
}
