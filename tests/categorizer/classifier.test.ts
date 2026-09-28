import { describe, it, expect } from 'vitest';
import { classifyArticle, buildSourceCategoryMap, matchesKeyword } from '../../src/categorizer/classifier.js';
import type { RawArticle } from '../../src/feeds/types.js';
import type { FeedSource } from '../../src/config/feeds.js';

function makeArticle(title: string, content = ''): RawArticle {
  return {
    title,
    url: 'https://example.com/article',
    publishedAt: new Date(),
    sourceName: 'Test Source',
    sourceUrl: 'https://example.com',
    content: content || null,
    language: 'en',
  };
}

describe('classifyArticle', () => {
  it('LLM キーワードを含む記事を AI/LLM に分類する', () => {
    const article = makeArticle('New LLM model released by OpenAI');
    expect(classifyArticle(article, 'Tech')).toBe('AI/LLM');
  });

  it('GPT キーワードを含む記事を AI/LLM に分類する', () => {
    const article = makeArticle('ChatGPT gets a major update');
    expect(classifyArticle(article, 'Tech')).toBe('AI/LLM');
  });

  it('日本語キーワードを含む記事を Japan に分類する', () => {
    const article = makeArticle('日本のAI開発状況について', '国内のAI研究が進んでいます');
    // '日本', '国内' が Japan キーワードにマッチする（AI/LLM キーワードには '生成AI' 等が必要）
    expect(classifyArticle(article, 'Tech')).toBe('Japan');
  });

  it('生成AI キーワードを含む記事を AI/LLM に分類する', () => {
    const article = makeArticle('生成AIの最新トレンド', '大規模言語モデルが進化しています');
    expect(classifyArticle(article, 'Tech')).toBe('AI/LLM');
  });

  it('マッチしない場合はデフォルトカテゴリを返す', () => {
    const article = makeArticle('Sports news from around the world');
    expect(classifyArticle(article, 'Tech')).toBe('Tech');
  });

  it('TypeScript キーワードを含む記事を Development に分類する', () => {
    const article = makeArticle('TypeScript 6.0 released with new features');
    expect(classifyArticle(article, 'Tech')).toBe('Development');
  });
});

describe('classifyArticle の英字キーワードは語の境界で照合する', () => {
  it.each([
    ['rag が storage / average / coverage の中に現れても AI/LLM にしない', 'Average storage coverage report'],
    ['go が google / going の中に現れても Development にしない', 'Going to the google campus'],
    ['api が rapid の中に現れても Development にしない', 'Rapid growth in exports'],
    ['o3 が iso3 の中に現れても AI/LLM にしない', 'ISO3 country codes updated'],
  ])('%s', (_label, title) => {
    expect(classifyArticle(makeArticle(title), 'Japan')).toBe('Japan');
  });

  it.each([
    ['RAG pipeline in production', 'AI/LLM'],
    ['o3 benchmark results', 'AI/LLM'],
    ['GPT-5 launch event', 'AI/LLM'],
    ['LLMs are getting cheaper', 'AI/LLM'],
    ['Go 1.23 released', 'Development'],
    ['A new API for payments', 'Development'],
    ['RAGを使った検索', 'AI/LLM'],
  ] as const)('「%s」は %s に分類する', (title, expected) => {
    expect(classifyArticle(makeArticle(title), 'Japan')).toBe(expected);
  });

  it('日本語キーワードは部分一致のまま照合する', () => {
    expect(classifyArticle(makeArticle('最新の生成AIツール'), 'Japan')).toBe('AI/LLM');
  });
});

describe('matchesKeyword', () => {
  it('記号を含むキーワードを正規表現として誤解釈しない', () => {
    expect(matchesKeyword('learning c++ today', 'c++')).toBe(true);
    expect(matchesKeyword('learning cxx today', 'c++')).toBe(false);
    expect(matchesKeyword('ci/cd pipelines', 'ci/cd')).toBe(true);
    expect(matchesKeyword('gpt-5.4 is out', 'gpt-5')).toBe(true);
    expect(matchesKeyword('gpt-50 is out', 'gpt-5')).toBe(false);
  });
});

describe('buildSourceCategoryMap', () => {
  it('フィードソースからマップを正しく構築する', () => {
    const sources: FeedSource[] = [
      { name: 'OpenAI Blog', url: 'https://openai.com/feed', category: 'AI/LLM', language: 'en', maxItems: 5 },
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed', category: 'Tech', language: 'en', maxItems: 5 },
    ];
    const map = buildSourceCategoryMap(sources);
    expect(map.get('OpenAI Blog')).toBe('AI/LLM');
    expect(map.get('TechCrunch')).toBe('Tech');
  });
});
