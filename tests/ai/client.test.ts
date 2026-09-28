import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  generateJson,
  isRetryable,
  HttpError,
  PRIMARY_MODEL,
  FALLBACK_MODEL,
  type FetchLike,
} from '../../src/ai/client.js';

const llm = { apiKey: 'ark-test', baseUrl: 'https://ark.example/api/v3/' };
const schema = z.object({ items: z.array(z.object({ id: z.string(), summary: z.string().min(1) })) });
const jsonSchema = { type: 'object' };
const noSleep = async (): Promise<void> => {};
const okBody = (content: string, finish = 'stop'): unknown => ({ choices: [{ message: { content }, finish_reason: finish }] });
const good = JSON.stringify({ items: [{ id: 'a', summary: '要約' }] });

interface Call {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/**
 * 呼ばれるたびに次の応答を返す偽の fetch。数値は HTTP ステータスのエラー応答、Error は通信の失敗。
 * @param replies 順に返す応答
 */
function fakeFetch(...replies: (unknown | number | Error)[]): FetchLike & { calls: Call[] } {
  const calls: Call[] = [];
  const f = async (url: string, init: { headers: Record<string, string>; body?: string }): Promise<{ ok: boolean; status: number; text(): Promise<string> }> => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body ?? '{}') as Record<string, unknown> });
    const next = replies.shift();
    if (next === undefined) throw new Error('応答の用意が足りません');
    if (next instanceof Error) throw next;
    if (typeof next === 'number') return { ok: false, status: next, text: async () => `{"error":{"code":"E${next}"}}` };
    return { ok: true, status: 200, text: async () => JSON.stringify(next) };
  };
  return Object.assign(f, { calls });
}

const run = (fetch: FetchLike): Promise<unknown> =>
  generateJson(llm, { prompt: 'p', schema, jsonSchema, schemaName: 'summaries' }, { fetch, sleep: noSleep });

describe('isRetryable', () => {
  it('429 / 500 / 502 / 503 / 504 はリトライする', () => {
    for (const s of [429, 500, 502, 503, 504]) expect(isRetryable(new HttpError(s, ''))).toBe(true);
  });

  it('400 / 401 / 404 はリトライしない', () => {
    for (const s of [400, 401, 404]) expect(isRetryable(new HttpError(s, ''))).toBe(false);
  });

  it('通信の切断（cause に ECONNRESET）はリトライする', () => {
    const err = new TypeError('fetch failed', { cause: Object.assign(new Error('socket'), { code: 'ECONNRESET' }) });
    expect(isRetryable(err)).toBe(true);
  });

  it('本文に 429 が含まれるだけのエラーや文字列はリトライしない', () => {
    expect(isRetryable(new Error('記事 429 件'))).toBe(false);
    expect(isRetryable('503')).toBe(false);
  });
});

describe('generateJson', () => {
  it('OpenAI 互換の chat/completions に、鍵・構造化出力・思考の無効化・出力上限を付けて送る', async () => {
    const fetch = fakeFetch(okBody(good));
    await run(fetch);
    const c = fetch.calls[0];
    expect(c?.url).toBe('https://ark.example/api/v3/chat/completions');
    expect(c?.headers['Authorization']).toBe('Bearer ark-test');
    expect(c?.body).toMatchObject({
      model: PRIMARY_MODEL,
      messages: [{ role: 'user', content: 'p' }],
      response_format: { type: 'json_schema', json_schema: { name: 'summaries', strict: true, schema: jsonSchema } },
      thinking: { type: 'disabled' },
    });
    expect(typeof c?.body['max_tokens']).toBe('number');
  });

  it('応答の content を JSON として読み、スキーマで検証して返す', async () => {
    await expect(run(fakeFetch(okBody(good)))).resolves.toEqual({ items: [{ id: 'a', summary: '要約' }] });
  });

  it('429 はリトライして成功する', async () => {
    const fetch = fakeFetch(429, okBody(good));
    await run(fetch);
    expect(fetch.calls.map((c) => c.body['model'])).toEqual([PRIMARY_MODEL, PRIMARY_MODEL]);
  });

  it('401 はリトライせず予備モデルへ切り替える', async () => {
    const fetch = fakeFetch(401, okBody(good));
    await run(fetch);
    expect(fetch.calls.map((c) => c.body['model'])).toEqual([PRIMARY_MODEL, FALLBACK_MODEL]);
  });

  it('主モデルが 3 回とも 503 なら予備モデルへ切り替える', async () => {
    const fetch = fakeFetch(503, 503, 503, okBody(good));
    await run(fetch);
    expect(fetch.calls.map((c) => c.body['model'])).toEqual([PRIMARY_MODEL, PRIMARY_MODEL, PRIMARY_MODEL, FALLBACK_MODEL]);
  });

  it('出力が上限で切れた応答（finish_reason=length）は採らずに予備モデルでやり直す', async () => {
    const fetch = fakeFetch(okBody('{"items":[{"id":"a","summ', 'length'), okBody(good));
    await expect(run(fetch)).resolves.toEqual({ items: [{ id: 'a', summary: '要約' }] });
    expect(fetch.calls.map((c) => c.body['model'])).toEqual([PRIMARY_MODEL, FALLBACK_MODEL]);
  });

  it('JSON として閉じていても finish_reason=length なら採らない（件数が途中で切れている）', async () => {
    const fetch = fakeFetch(okBody(good, 'length'), okBody(good));
    await run(fetch);
    expect(fetch.calls.map((c) => c.body['model'])).toEqual([PRIMARY_MODEL, FALLBACK_MODEL]);
  });

  it('JSON でない応答やスキーマ違反は予備モデルでやり直し、両方だめなら投げる', async () => {
    const fetch = fakeFetch(okBody('Invalid JSON'), okBody(JSON.stringify({ items: [{ id: 'a' }] })));
    await expect(run(fetch)).rejects.toThrow();
    expect(fetch.calls.map((c) => c.body['model'])).toEqual([PRIMARY_MODEL, FALLBACK_MODEL]);
  });

  it('json_schema が 400 で拒まれたら json_object に落として同じモデルで1回だけやり直す', async () => {
    const fetch = fakeFetch(400, okBody(good));
    await expect(run(fetch)).resolves.toEqual({ items: [{ id: 'a', summary: '要約' }] });
    expect(fetch.calls.map((c) => [c.body['model'], (c.body['response_format'] as { type: string }).type])).toEqual([
      [PRIMARY_MODEL, 'json_schema'],
      [PRIMARY_MODEL, 'json_object'],
    ]);
  });

  it('両方とも失敗したら最後のエラーを投げる', async () => {
    await expect(run(fakeFetch(401, 404))).rejects.toThrow('404');
  });
});
