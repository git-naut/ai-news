import type { z } from 'zod';

/**
 * LLM のモデル識別子（BytePlus ModelArk、ap-southeast-1）。
 * 2026-09-29 に Gemini から移した。手元のキーのプロジェクトは前払い課金の残高が 0 で
 * 3.x 系が 402、2.5 系は新 SDK から 404（新規ユーザーには提供しない）だったため。
 * 両モデルとも 2026-09-29 に構造化出力で 200 を実測した（lite-260428 は 4.2 秒、260228 は 11.3 秒）。
 */
export const PRIMARY_MODEL = 'seed-2-0-lite-260428';
export const FALLBACK_MODEL = 'seed-2-0-lite-260228';

/**
 * 出力トークンの上限。送らないと 4,096 で打ち切られ、JSON が途中で切れる。
 * 5 件の要約の実測は 200 トークン前後なので余裕を持たせる。
 */
const MAX_TOKENS = 4096;

/** リトライ設定 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/** リトライする HTTP ステータス。レート制限と、サーバ・中継の一時的な失敗 */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/** リトライする通信エラーのコード（Node の fetch は cause に入れる） */
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT']);

/** 1 リクエストの時間制限（ミリ秒） */
const REQUEST_TIMEOUT_MS = 60_000;

/** LLM の接続先 */
export interface LlmConfig {
  apiKey: string;
  /** 例: https://ark.ap-southeast.bytepluses.com/api/v3 */
  baseUrl: string;
}

/** fetch のうち、ここで使う部分だけの形。テストで差し替える */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/** generateJson に差し込める依存 */
export interface GenerateDeps {
  fetch?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
}

/** JSON 生成の依頼 */
export interface JsonRequest<T> {
  prompt: string;
  /** 応答を検証する zod スキーマ */
  schema: z.ZodType<T>;
  /** 構造化出力として API に渡す JSON Schema。最上位は object にする */
  jsonSchema: Record<string, unknown>;
  /** json_schema.name に入れる名前 */
  schemaName: string;
}

/** HTTP のエラー応答 */
export class HttpError extends Error {
  /**
   * @param status HTTP ステータス
   * @param body 応答の本文（先頭だけ）
   */
  constructor(readonly status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 200)}`);
    this.name = 'HttpError';
  }
}

/** sleep ユーティリティ */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * エラーがリトライで解消しうるかを判定する。
 * HttpError はステータスで、通信エラーは cause のコードで見る。
 * 旧実装はエラー文字列に "429" が含まれるかで判定していたので、500 や切断をリトライせず、
 * 本文に数字が出るだけの無関係なエラーをリトライすることがあった。
 * @param error 捕まえた値
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof HttpError) return RETRYABLE_STATUS.has(error.status);
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: unknown }).code ?? (error.cause as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' && RETRYABLE_CODES.has(code);
}

/**
 * 指数バックオフ + ジッターでリトライする汎用ラッパー。
 * @param fn 実行する処理
 * @param wait 待機に使う関数
 */
async function withRetry<T>(fn: () => Promise<T>, wait: (ms: number) => Promise<void>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === RETRY_CONFIG.maxRetries - 1) {
        throw error;
      }

      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelayMs
      ) + Math.random() * 1000;

      console.warn(`[ai] リトライ ${attempt + 1}/${RETRY_CONFIG.maxRetries} (${Math.round(delay)}ms 後)`);
      await wait(delay);
    }
  }

  throw lastError;
}

/**
 * chat/completions を1回呼び、JSON を読んでスキーマで検証する。
 * @param llm 接続先
 * @param f fetch
 * @param model モデル ID
 * @param req 依頼
 * @param format 構造化出力の形。json_schema は公式が beta としている
 */
async function completeOnce<T>(
  llm: LlmConfig,
  f: FetchLike,
  model: string,
  req: JsonRequest<T>,
  format: 'json_schema' | 'json_object',
): Promise<T> {
  const response_format =
    format === 'json_schema'
      ? { type: 'json_schema', json_schema: { name: req.schemaName, strict: true, schema: req.jsonSchema } }
      : { type: 'json_object' };
  const res = await f(`${llm.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${llm.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: req.prompt }],
      response_format,
      // seed-2-0 系は既定で思考を出力に載せる。要約には要らないので止める
      thinking: { type: 'disabled' },
      max_tokens: MAX_TOKENS,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) throw new HttpError(res.status, text);

  const body = JSON.parse(text) as { choices?: { message?: { content?: unknown }; finish_reason?: unknown }[] };
  const choice = body.choices?.[0];
  if (choice?.finish_reason === 'length') throw new Error(`${model} の出力が上限 ${MAX_TOKENS} トークンで切れました`);
  const content = choice?.message?.content;
  if (typeof content !== 'string' || content === '') throw new Error(`${model} の応答が空です`);
  return req.schema.parse(JSON.parse(content));
}

/**
 * 1 つのモデルで JSON を生成する。json_schema が 400 で拒まれたら json_object に落として1回だけやり直す。
 * @param llm 接続先
 * @param f fetch
 * @param model モデル ID
 * @param req 依頼
 * @param wait 待機に使う関数
 */
async function generateWithModel<T>(
  llm: LlmConfig,
  f: FetchLike,
  model: string,
  req: JsonRequest<T>,
  wait: (ms: number) => Promise<void>,
): Promise<T> {
  try {
    return await withRetry(() => completeOnce(llm, f, model, req, 'json_schema'), wait);
  } catch (error) {
    if (error instanceof HttpError && error.status === 400) {
      console.warn(`[ai] ${model} が json_schema を拒否しました。json_object でやり直します:`, error.message);
      return await withRetry(() => completeOnce(llm, f, model, req, 'json_object'), wait);
    }
    throw error;
  }
}

/**
 * 構造化出力で JSON を生成し、zod で検証して返す。
 * 主モデルが失敗したとき（リトライを使い切った、リトライしない失敗、JSON やスキーマの不一致、
 * 出力の打ち切り）は予備モデルで1回やり直す。
 * @param llm 接続先
 * @param req プロンプトとスキーマ
 * @param deps テスト用の差し替え
 * @throws 予備モデルでも失敗した場合
 */
export async function generateJson<T>(llm: LlmConfig, req: JsonRequest<T>, deps: GenerateDeps = {}): Promise<T> {
  const f = deps.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const wait = deps.sleep ?? sleep;

  try {
    return await generateWithModel(llm, f, PRIMARY_MODEL, req, wait);
  } catch (error) {
    console.warn('[ai] プライマリモデル失敗。フォールバックモデルに切り替えます:', error instanceof Error ? error.message : String(error));
    return await generateWithModel(llm, f, FALLBACK_MODEL, req, wait);
  }
}
