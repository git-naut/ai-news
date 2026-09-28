import { z } from 'zod';
import 'dotenv/config';
import { sendAtUtcSchema, sendMaxWaitMinutesSchema } from '../schedule/send-delay.js';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  NEWS_API_KEY: z.string().min(1, 'NEWS_API_KEY is required'),
  GMAIL_USER: z.string().email('GMAIL_USER must be a valid email'),
  GMAIL_APP_PASSWORD: z.string().min(1, 'GMAIL_APP_PASSWORD is required'),
  RECIPIENT_EMAIL: z.string().email('RECIPIENT_EMAIL must be a valid email'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** 送信する時刻（UTC の HH:MM）。空なら即時送信 */
  SEND_AT_UTC: sendAtUtcSchema,
  /** SEND_AT_UTC まで待つ上限（分）。超えるなら待たずに送る */
  SEND_MAX_WAIT_MINUTES: sendMaxWaitMinutesSchema,
  /** 配信の種類。件名の印に使う */
  DELIVERY_KIND: z.enum(['primary', 'backup', 'manual']).default('manual'),
});

/**
 * 環境変数をバリデーションして型安全なオブジェクトとしてエクスポートする。
 * 必須変数が未設定の場合は起動時にエラーをスローする。
 */
export const env = envSchema.parse(process.env);
