import { describe, it, expect } from 'vitest';
import { classifyArticle, buildSourceCategoryMap } from '../../src/categorizer/classifier.js';
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
