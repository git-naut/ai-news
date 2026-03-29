import Handlebars from 'handlebars';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import type { DigestTemplateData, ArticlePair, ArticleTemplateData } from './types.js';
import type { Article } from '../feeds/types.js';
import type { Trend } from '../ai/trend-analyzer.js';
import type { Category } from '../config/categories.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Handlebars ヘルパーの登録
Handlebars.registerHelper('truncate', (str: string, len: number) => {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
});

/** 日本時間でフォーマットされた現在時刻を返す */
export function formatJstDate(date: Date): string {
  const jstDate = toZonedTime(date, 'Asia/Tokyo');
  return format(jstDate, 'yyyy年MM月dd日 HH:mm', { locale: ja }) + ' JST';
}

/** テンプレートキャッシュ */
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Handlebars テンプレートをコンパイルして返す（キャッシュあり）。
 */
function getTemplate(templateName: string): HandlebarsTemplateDelegate {
  const cached = templateCache.get(templateName);
  if (cached) return cached;

  const templatePath = join(__dirname, '../templates', `${templateName}.hbs`);
  const source = readFileSync(templatePath, 'utf-8');
  const compiled = Handlebars.compile(source);
  templateCache.set(templateName, compiled);
  return compiled;
}

/** カテゴリの表示順 */
const CATEGORY_ORDER: Category[] = ['AI/LLM', 'Development', 'Tech', 'Japan'];

/** カテゴリ → Unicode 記号のマッピング（フォント依存なし、全メールクライアント対応） */
const CATEGORY_ICONS: Record<Category, string> = {
  'AI/LLM': '◇',
  'Development': '◈',
  'Tech': '◉',
  'Japan': '◎',
};

/**
 * 記事の本文から最初の GitHub URL を抽出する。
 * 見つからない場合は null を返す。
 */
function extractGithubUrl(content: string | null): string | null {
  if (!content) return null;
  const match = content.match(/https?:\/\/github\.com\/[^\s"'<>)]+/);
  return match?.[0] ?? null;
}

/** 記事配列を2件ずつのペアに分割する（2カラムレイアウト用） */
function pairArticles(articles: ArticleTemplateData[]): ArticlePair[] {
  const pairs: ArticlePair[] = [];
  for (let i = 0; i < articles.length; i += 2) {
    pairs.push({ left: articles[i]!, right: articles[i + 1] ?? null });
  }
  return pairs;
}

/**
 * Article の配列と Trend 配列から DigestTemplateData を構築する。
 */
export function buildTemplateData(
  articles: Article[],
  trends: Trend[],
  deliveryDate: string
): DigestTemplateData {
  // カテゴリ別にグループ化
  const grouped = new Map<Category, Article[]>();
  for (const article of articles) {
    const list = grouped.get(article.category) ?? [];
    list.push(article);
    grouped.set(article.category, list);
  }

  const categories = CATEGORY_ORDER
    .filter((cat) => grouped.has(cat))
    .map((cat) => ({
      name: cat,
      icon: CATEGORY_ICONS[cat],
      ...((): { articles: ArticleTemplateData[]; articlePairs: ArticlePair[] } => {
        const articles = (grouped.get(cat) ?? []).map((a): ArticleTemplateData => ({
          title: a.title,
          url: a.url,
          sourceName: a.sourceName,
          summary: a.summary ?? a.content?.slice(0, 150) ?? '（要約なし）',
          publishedAt: format(toZonedTime(a.publishedAt, 'Asia/Tokyo'), 'MM/dd HH:mm'),
          githubUrl: extractGithubUrl(a.content),
        }));
        return { articles, articlePairs: pairArticles(articles) };
      })(),
    }));

  return {
    deliveryDate,
    totalCount: articles.length,
    categories,
    trends,
    hasTrends: trends.length > 0,
  };
}

/**
 * 指定したテンプレートにデータを流し込んでレンダリングする。
 * @param templateName テンプレートファイル名（拡張子なし）
 * @param data テンプレートデータ
 */
export function renderTemplate(
  templateName: string,
  data: DigestTemplateData
): string {
  const template = getTemplate(templateName);
  return template(data);
}
