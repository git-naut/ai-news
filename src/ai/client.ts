import { GoogleGenerativeAI } from '@google/generative-ai';

/** Gemini モデル識別子 */
export const PRIMARY_MODEL = 'gemini-2.5-flash';
export const FALLBACK_MODEL = 'gemini-2.5-flash-lite';

/** リトライ設定 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/** sleep ユーティリティ */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 指数バックオフ + ジッターでリトライする汎用ラッパー。
 * 429（レート制限）または 503 エラーの場合にリトライする。
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errMsg = String(error);
      const isRetryable = errMsg.includes('429') || errMsg.includes('503') || errMsg.includes('RESOURCE_EXHAUSTED');

      if (!isRetryable || attempt === RETRY_CONFIG.maxRetries - 1) {
        throw error;
      }

      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelayMs
      ) + Math.random() * 1000;

      console.warn(`[ai] リトライ ${attempt + 1}/${RETRY_CONFIG.maxRetries} (${Math.round(delay)}ms 後)`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/** Gemini API クライアントのシングルトン */
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(apiKey: string): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * 指定したモデルでテキスト生成を実行する。
 * フォールバックモデルへの自動切り替えを含む。
 * @param apiKey Gemini API キー
 * @param prompt プロンプトテキスト
 * @param modelName 使用するモデル名（デフォルト: PRIMARY_MODEL）
 */
export async function generateText(
  apiKey: string,
  prompt: string,
  modelName: string = PRIMARY_MODEL
): Promise<string> {
  const client = getGenAI(apiKey);

  try {
    return await withRetry(async () => {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  } catch (error) {
    // プライマリモデルが失敗した場合、フォールバックモデルを試みる
    if (modelName === PRIMARY_MODEL) {
      console.warn('[ai] プライマリモデル失敗。フォールバックモデルに切り替えます:', (error as Error).message);
      return await withRetry(async () => {
        const model = client.getGenerativeModel({ model: FALLBACK_MODEL });
        const result = await model.generateContent(prompt);
        return result.response.text();
      });
    }
    throw error;
  }
}
