import { describe, it, expect } from 'vitest';
import { RSS_FEEDS } from '../../src/config/feeds.js';

/** 名前でフィードを引く。無ければテストを落とす */
function feed(name: string) {
  const f = RSS_FEEDS.find((s) => s.name === name);
  if (!f) throw new Error(`${name} が RSS_FEEDS にありません`);
  return f;
}

describe('RSS_FEEDS（2026-09-29 の実測で差し替えた取得元）', () => {
  it('10 本で、名前が重ならない', () => {
    expect(RSS_FEEDS).toHaveLength(10);
    expect(new Set(RSS_FEEDS.map((s) => s.name)).size).toBe(10);
  });

  it('Google DeepMind は deepmind.google の RSS を読む（blog.google 側は 09-09 以降更新が無い）', () => {
    expect(feed('Google DeepMind').url).toBe('https://deepmind.google/blog/rss.xml');
  });

  it('Anthropic は Olshansk の第三者フィードを読む（conoro 版は 2025-11-24 で止まっていた）', () => {
    expect(feed('Anthropic Blog').url).toBe(
      'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml'
    );
  });

  it('@IT と ITmedia AI+ を日本語の取得元として 5 件ずつ読む', () => {
    expect(feed('@IT')).toEqual({
      name: '@IT',
      url: 'https://rss.itmedia.co.jp/rss/2.0/ait.xml',
      category: 'Development',
      language: 'ja',
      maxItems: 5,
    });
    expect(feed('ITmedia AI+')).toEqual({
      name: 'ITmedia AI+',
      url: 'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml',
      category: 'AI/LLM',
      language: 'ja',
      maxItems: 5,
    });
  });
});
