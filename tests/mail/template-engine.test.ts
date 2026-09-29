import { describe, it, expect } from 'vitest';
import { buildTemplateData, renderTemplate, formatJstDate } from '../../src/mail/template-engine.js';
import type { Article } from '../../src/feeds/types.js';
import type { Trend } from '../../src/ai/trend-analyzer.js';

const mockArticles: Article[] = [
  {
    id: 'abc123',
    title: 'GPT-5 Released by OpenAI',
    url: 'https://openai.com/gpt-5',
    publishedAt: new Date('2026-03-23T01:00:00Z'),
    sourceName: 'OpenAI Blog',
    sourceUrl: 'https://openai.com',
    content: 'OpenAI has released GPT-5. Code at https://github.com/openai/gpt-5-examples today.',
    language: 'en',
    category: 'AI/LLM',
    summary: {
      what: 'OpenAI が GPT-5 を公開した。',
      change: 'SWE-bench で 74.9%（前世代は 69.1%）。',
      tryIt: 'API の gpt-5 モデル',
    },
  },
  {
    id: 'def456',
    title: 'TypeScript 6.0 Released',
    url: 'https://devblog.example.com/ts6',
    publishedAt: new Date('2026-03-23T02:00:00Z'),
    sourceName: 'Dev Blog',
    sourceUrl: 'https://devblog.example.com',
    content: 'TypeScript 6.0 brings new features.',
    language: 'en',
    category: 'Development',
    summary: null,
  },
  {
    id: 'ghi789',
    title: 'Zenn: pnpm 11 の lockfile',
    url: 'https://zenn.dev/x/articles/pnpm11',
    publishedAt: new Date('2026-03-23T03:00:00Z'),
    sourceName: 'Zenn トレンド',
    sourceUrl: 'https://zenn.dev',
    content: null,
    language: 'ja',
    category: 'Development',
    summary: { what: 'pnpm 11 の lockfile の変更点の解説。', change: 'devEngines が packageManager より優先される。', tryIt: null },
  },
];

const mockTrends: Trend[] = [
  { trend: 'GPT-5 登場', description: 'OpenAI が GPT-5 を公開した。', action: 'gpt-5 を API で試す' },
];
const DATE = '2026年03月23日 09:00 JST';

describe('buildTemplateData', () => {
  it('カテゴリ別にグループ化し、総数を数える', () => {
    const data = buildTemplateData(mockArticles, [], DATE);
    expect(data.categories.map((c) => c.name)).toEqual(['AI/LLM', 'Development']);
    expect(data.totalCount).toBe(3);
  });

  it('要約は 3 欄のまま渡し、試せるものが無い記事は tryIt を null にする', () => {
    const data = buildTemplateData(mockArticles, [], DATE);
    const [gpt] = data.categories[0]?.articles ?? [];
    expect(gpt?.summary).toEqual({ what: 'OpenAI が GPT-5 を公開した。', change: 'SWE-bench で 74.9%（前世代は 69.1%）。', tryIt: 'API の gpt-5 モデル' });
    const zenn = data.categories[1]?.articles.find((a) => a.title.startsWith('Zenn'));
    expect(zenn?.summary?.tryIt).toBeNull();
  });

  it('要約が無い記事は summary を null にし、本文の抜粋を excerpt に入れる', () => {
    const data = buildTemplateData(mockArticles, [], DATE);
    const ts = data.categories[1]?.articles.find((a) => a.title.startsWith('TypeScript'));
    expect(ts?.summary).toBeNull();
    expect(ts?.excerpt).toBe('TypeScript 6.0 brings new features.');
  });

  it('要約がある記事の excerpt は null（抜粋と要約を二重に出さない）', () => {
    const data = buildTemplateData(mockArticles, [], DATE);
    expect(data.categories[0]?.articles[0]?.excerpt).toBeNull();
  });

  it('本文も要約も無い記事の excerpt は「（要約なし）」', () => {
    const bare: Article = { ...mockArticles[2]!, summary: null, content: null };
    const data = buildTemplateData([bare], [], DATE);
    expect(data.categories[0]?.articles[0]?.excerpt).toBe('（要約なし）');
  });

  it('本文中の GitHub の URL を拾う', () => {
    const data = buildTemplateData(mockArticles, [], DATE);
    expect(data.categories[0]?.articles[0]?.githubUrl).toBe('https://github.com/openai/gpt-5-examples');
  });

  it('トレンドの有無を hasTrends で渡す', () => {
    expect(buildTemplateData(mockArticles, mockTrends, DATE).hasTrends).toBe(true);
    expect(buildTemplateData(mockArticles, [], DATE).hasTrends).toBe(false);
  });
});

describe('renderTemplate（テキスト）', () => {
  const text = renderTemplate('digest-text', buildTemplateData(mockArticles, mockTrends, DATE));

  it('要約を「何が」「差分」「試す」の 3 行で出す', () => {
    expect(text).toContain('  何が: OpenAI が GPT-5 を公開した。');
    expect(text).toContain('  差分: SWE-bench で 74.9%（前世代は 69.1%）。');
    expect(text).toContain('  試す: API の gpt-5 モデル');
  });

  it('試せるものが無い記事には「試す」の行を出さない', () => {
    const block = text.slice(text.indexOf('■ Zenn'), text.indexOf('[Zenn トレンド'));
    expect(block).toContain('何が: pnpm 11');
    expect(block).not.toContain('試す:');
  });

  it('要約が無い記事は抜粋を 1 行で出す', () => {
    const block = text.slice(text.indexOf('■ TypeScript'), text.indexOf('[Dev Blog'));
    expect(block).toContain('  TypeScript 6.0 brings new features.');
    expect(block).not.toContain('何が:');
  });

  it('トレンドを記事より前に出す', () => {
    expect(text.indexOf('GPT-5 登場')).toBeLessThan(text.indexOf('■ '));
  });

  it('記号をエスケープせずそのまま出す', () => {
    const special: Article = {
      ...mockArticles[0]!,
      title: `AT&T's "GPT" <beta>`,
      summary: { what: `要約 A&B <tag> "引用" 'x'`, change: '差', tryIt: null },
    };
    const t = renderTemplate('digest-text', buildTemplateData([special], [], DATE));
    expect(t).toContain(`■ AT&T's "GPT" <beta>`);
    expect(t).toContain(`何が: 要約 A&B <tag> "引用" 'x'`);
    expect(t).not.toMatch(/&(amp|lt|gt|quot|#x27|#39|#x60|#x3D);/);
  });
});

describe('renderTemplate（HTML）', () => {
  const html = renderTemplate('digest', buildTemplateData(mockArticles, mockTrends, DATE));

  it('見出し・記事・トレンドを出す', () => {
    expect(html).toContain('AI News Digest');
    expect(html).toContain('GPT-5 Released by OpenAI');
    expect(html).toContain('GPT-5 登場');
  });

  it('1 カラムで、各記事を 1 回ずつ出す（2 カラムの固定幅のセルが無い）', () => {
    expect(html).not.toContain('width="260"');
    for (const a of mockArticles) {
      expect(html).toContain(`href="${a.url}"`);
      expect(html).toContain(a.title);
    }
  });

  it('要約の 3 欄をそれぞれ出し、試せるものが無ければその欄を出さない', () => {
    expect(html).toContain('SWE-bench で 74.9%（前世代は 69.1%）。');
    expect(html).toContain('API の gpt-5 モデル');
    const zenn = html.slice(html.indexOf('Zenn: pnpm 11'), html.indexOf('Zenn トレンド'));
    expect(zenn).toContain('devEngines');
    expect(zenn).not.toContain('試す');
  });

  it('トレンドを記事より前に出す', () => {
    expect(html.indexOf('GPT-5 登場')).toBeLessThan(html.indexOf('GPT-5 Released by OpenAI'));
  });

  it('記事タイトルの <script> をエスケープしたままにする', () => {
    const evil: Article = { ...mockArticles[0]!, title: '<script>alert(1)</script>' };
    const h = renderTemplate('digest', buildTemplateData([evil], [], DATE));
    expect(h).not.toContain('<script>alert(1)</script>');
    expect(h).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('formatJstDate', () => {
  it('UTC 時刻を JST にフォーマットする', () => {
    expect(formatJstDate(new Date('2026-03-23T00:00:00Z'))).toBe('2026年03月23日 09:00 JST');
  });
});

describe('取得元の状態', () => {
  const health = {
    stale: [
      { name: 'Anthropic Blog', newest: new Date('2025-11-24T00:00:00Z') },
      { name: 'Empty Feed', newest: null },
    ],
    failed: ['Hugging Face Blog'],
  };

  it('止まった取得元と失敗した取得元を、名前と最終更新日つきの行にする', () => {
    const data = buildTemplateData(mockArticles, [], DATE, health);
    expect(data.sourceNotes).toEqual([
      'Anthropic Blog は 2025年11月24日 から更新がありません',
      'Empty Feed は記事がありません',
      'Hugging Face Blog は取得に失敗しました',
    ]);
  });

  it('テキストと HTML の両方のフッターに出す', () => {
    const data = buildTemplateData(mockArticles, [], DATE, health);
    for (const name of ['digest-text', 'digest']) {
      const out = renderTemplate(name, data);
      expect(out).toContain('取得元の状態');
      expect(out).toContain('Anthropic Blog は 2025年11月24日 から更新がありません');
    }
  });

  it('問題の無い日はフッターに何も出さない', () => {
    const data = buildTemplateData(mockArticles, [], DATE);
    expect(data.sourceNotes).toEqual([]);
    for (const name of ['digest-text', 'digest']) expect(renderTemplate(name, data)).not.toContain('取得元の状態');
  });
});

describe('差分の無い要約', () => {
  const noChange: Article = { ...mockArticles[2]!, summary: { what: 'pnpm 11 の解説記事。', change: null, tryIt: null } };

  it('テキストでも HTML でも「差分」の行を出さない', () => {
    const data = buildTemplateData([noChange], [], DATE);
    const text = renderTemplate('digest-text', data);
    const html = renderTemplate('digest', data);
    expect(text).toContain('何が: pnpm 11 の解説記事。');
    expect(text).not.toContain('差分:');
    expect(html).toContain('pnpm 11 の解説記事。');
    expect(html).not.toContain('>差分<');
  });
});
