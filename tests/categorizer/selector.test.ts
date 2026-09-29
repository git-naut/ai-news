import { describe, it, expect } from 'vitest';
import { selectForDigest, buildTierOf, countByTier } from '../../src/categorizer/selector.js';
import { DIGEST_LIMIT } from '../../src/config/digest.js';
import { RSS_FEEDS } from '../../src/config/feeds.js';
import { HN_QUERIES } from '../../src/hn/client.js';
import type { RawArticle } from '../../src/feeds/types.js';

const HOUR = 60 * 60 * 1000;
const base = new Date('2026-09-29T00:00:00Z').getTime();

/** sourceName と何時間前かだけを決めた記事を作る */
function art(sourceName: string, hoursAgo: number, title = `${sourceName} ${hoursAgo}h`): RawArticle {
  return {
    title,
    url: `https://example.com/${encodeURIComponent(title)}`,
    publishedAt: new Date(base - hoursAgo * HOUR),
    sourceName,
    sourceUrl: 'https://example.com',
    content: null,
    language: 'en',
  };
}

/** 名前の頭文字で段を決める簡易版（E=1, J=2, それ以外=3） */
const tierByPrefix = (a: RawArticle): 1 | 2 | 3 => (a.sourceName.startsWith('E') ? 1 : a.sourceName.startsWith('J') ? 2 : 3);

describe('DIGEST_LIMIT', () => {
  it('1 通に載せる記事は 30 件まで（2026-09-29 の決定）', () => {
    expect(DIGEST_LIMIT).toBe(30);
  });
});

describe('selectForDigest', () => {
  it('段の小さい順に並べ、同じ段の中は新しい順にする', () => {
    const input = [art('News', 1), art('J-feed', 5), art('E-feed', 10), art('J-feed', 2), art('E-feed', 3)];
    const out = selectForDigest(input, { limit: 10, tierOf: tierByPrefix });
    expect(out.map((a) => a.title)).toEqual(['E-feed 3h', 'E-feed 10h', 'J-feed 2h', 'J-feed 5h', 'News 1h']);
  });

  it('上限を超えた分は後ろの段から落ちる。新しくても段3は段1より後', () => {
    const input = [art('News', 0), art('News', 1), art('E-feed', 20), art('J-feed', 10), art('E-feed', 30)];
    const out = selectForDigest(input, { limit: 3, tierOf: tierByPrefix });
    expect(out).toHaveLength(3);
    expect(out.map((a) => a.title)).toEqual(['E-feed 20h', 'E-feed 30h', 'J-feed 10h']);
  });

  it('上限ちょうどで切り、1 件も多く載せない', () => {
    const input = Array.from({ length: 35 }, (_, i) => art('E-feed', i));
    expect(selectForDigest(input, { limit: 30, tierOf: tierByPrefix })).toHaveLength(30);
    expect(selectForDigest(input.slice(0, 5), { limit: 30, tierOf: tierByPrefix })).toHaveLength(5);
  });

  it('同じ段・同じ時刻の記事は元の並びを保つ（安定）', () => {
    const input = [art('E-a', 1, 'first'), art('E-b', 1, 'second'), art('E-c', 1, 'third')];
    const out = selectForDigest(input, { limit: 10, tierOf: tierByPrefix });
    expect(out.map((a) => a.title)).toEqual(['first', 'second', 'third']);
  });

  it('入力の配列を並べ替えない', () => {
    const input = [art('News', 1), art('E-feed', 2)];
    selectForDigest(input, { limit: 10, tierOf: tierByPrefix });
    expect(input.map((a) => a.sourceName)).toEqual(['News', 'E-feed']);
  });
});

describe('buildTierOf', () => {
  const tierOf = buildTierOf(RSS_FEEDS, HN_QUERIES);

  it('英語の RSS と Hacker News は段1', () => {
    expect(tierOf(art('OpenAI Blog', 0))).toBe(1);
    expect(tierOf(art('Anthropic Blog', 0))).toBe(1);
    expect(tierOf(art('Hacker News (LLM)', 0))).toBe(1);
    expect(tierOf(art('Hacker News (Grok/xAI)', 0))).toBe(1);
  });

  it('日本語の RSS は段2', () => {
    expect(tierOf(art('Publickey', 0))).toBe(2);
    expect(tierOf(art('@IT', 0))).toBe(2);
    expect(tierOf(art('ITmedia AI+', 0))).toBe(2);
  });

  it('表に無い取得元（NewsData.io の媒体名）は段3', () => {
    expect(tierOf(art('techcrunch', 0))).toBe(3);
  });
});

describe('countByTier', () => {
  it('段ごとの件数を数える（落とした件数のログに使う）', () => {
    const input = [art('E-a', 0), art('J-a', 0), art('J-b', 0), art('X', 0)];
    expect(countByTier(input, tierByPrefix)).toEqual({ 1: 1, 2: 2, 3: 1 });
  });
});
