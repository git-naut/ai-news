import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  NEWS_API_KEY: z.string().min(1, 'NEWS_API_KEY is required'),
  GMAIL_USER: z.string().email('GMAIL_USER must be a valid email'),
  GMAIL_APP_PASSWORD: z.string().min(1, 'GMAIL_APP_PASSWORD is required'),
  RECIPIENT_EMAIL: z.string().email('RECIPIENT_EMAIL must be a valid email'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * 環境変数をバリデーションして型安全なオブジェクトとしてエクスポートする。
 * 必須変数が未設定の場合は起動時にエラーをスローする。
 */
export const env = envSchema.parse(process.env);
