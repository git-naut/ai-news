import { describe, it, expect } from 'vitest';
import { fetchHackerNews, HN_QUERIES, type HnQuery } from '../../src/hn/client.js';
import type { FetchLike } from '../../src/ai/client.js';

const now = new Date('2026-09-29T00:00:00Z');
const nowSec = Math.floor(now.getTime() / 1000);
const q = (over: Partial<HnQuery> = {}): HnQuery => ({ name: 'LLM', query: 'LLM', minPoints: 50, maxItems: 5, category: 'AI/LLM', ...over });

/**
 * URL ごとに応答を返す偽の fetch。値が数値なら HTTP エラー、Error なら通信の失敗。
 * @param reply URL を受けて応答を返す関数
 */
function fakeFetch(reply: (url: string) => unknown): FetchLike & { urls: string[] } {
  const urls: string[] = [];
  const f = async (url: string): Promise<{ ok: boolean; status: number; text(): Promise<string> }> => {
    urls.push(url);
    const r = reply(url);
    if (r instanceof Error) throw r;
    if (typeof r === 'number') return { ok: false, status: r, text: async () => '' };
    return { ok: true, status: 200, text: async () => JSON.stringify(r) };
  };
  return Object.assign(f, { urls });
}

const hit = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  objectID: '4101',
  title: 'Show HN: A tiny LLM runtime',
  url: 'https://example.com/tiny',
  points: 120,
  created_at_i: nowSec - 3600,
  num_comments: 40,
  ...over,
});

describe('fetchHackerNews', () => {
  it('search_by_date に、タイトルだけ・表記ゆれなし・点数と取得窓の下限を付けて問い合わせる', async () => {
    const fetch = fakeFetch(() => ({ hits: [] }));
    await fetchHackerNews([q()], now, { fetch });
    const url = new URL(fetch.urls[0] ?? '');
    expect(url.origin + url.pathname).toBe('https://hn.algolia.com/api/v1/search_by_date');
    expect(url.searchParams.get('query')).toBe('LLM');
    expect(url.searchParams.get('tags')).toBe('story');
    expect(url.searchParams.get('restrictSearchableAttributes')).toBe('title');
    expect(url.searchParams.get('typoTolerance')).toBe('false');
    expect(url.searchParams.get('hitsPerPage')).toBe('5');
    // 取得窓は RSS と同じ 36 時間
    expect(url.searchParams.get('numericFilters')).toBe(`points>=50,created_at_i>${nowSec - 36 * 3600}`);
  });

  it('ヒットを記事の形にする', async () => {
    const [a] = await fetchHackerNews([q()], now, { fetch: fakeFetch(() => ({ hits: [hit()] })) });
    expect(a).toEqual({
      title: 'Show HN: A tiny LLM runtime',
      url: 'https://example.com/tiny',
      publishedAt: new Date((nowSec - 3600) * 1000),
      sourceName: 'Hacker News (LLM)',
      sourceUrl: 'https://news.ycombinator.com',
      content: null,
      language: 'en',
    });
  });

  it('url の無い投稿（Ask HN）は HN の item ページを URL にし、本文の HTML を剥がして content にする', async () => {
    const [a] = await fetchHackerNews([q()], now, {
      fetch: fakeFetch(() => ({ hits: [hit({ url: undefined, title: 'Ask HN: LLM evals?', story_text: '<p>How do you &amp; your team eval?</p>' })] })),
    });
    expect(a?.url).toBe('https://news.ycombinator.com/item?id=4101');
    expect(a?.content).toBe('How do you & your team eval?');
  });

  it('形の違うヒットは捨て、同じ応答の正しいヒットは残す', async () => {
    const out = await fetchHackerNews([q()], now, {
      fetch: fakeFetch(() => ({ hits: [{ objectID: '1', title: 42 }, hit()] })),
    });
    expect(out.map((a) => a.url)).toEqual(['https://example.com/tiny']);
  });

  it('1 つのクエリが失敗しても、他のクエリの記事は残る', async () => {
    const fetch = fakeFetch((url) => (url.includes('query=Mistral') ? 502 : { hits: [hit()] }));
    const out = await fetchHackerNews([q({ name: 'Mistral', query: 'Mistral' }), q()], now, { fetch });
    expect(out).toHaveLength(1);
    expect(out[0]?.sourceName).toBe('Hacker News (LLM)');
  });

  it('応答が JSON でない・hits が無いときも例外を投げない', async () => {
    const out = await fetchHackerNews([q()], now, { fetch: fakeFetch(() => ({ nope: true })) });
    expect(out).toEqual([]);
  });

  it('既定のクエリは 5 本で、名前が重ならない', () => {
    expect(HN_QUERIES).toHaveLength(5);
    expect(new Set(HN_QUERIES.map((x) => x.name)).size).toBe(5);
  });
});
