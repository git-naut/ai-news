/**
 * doc 系統 — README に書いた事実とコードの一致。
 *
 * 2026-09-29 まで README は 3 月の姿のままだった。「TechCrunch など 10 ソース」「Gemini の無料枠」
 * 「cron 0 0 * * *」のどれも実物と違い、読んだ人が Secrets を登録し損ねる形になっていた。
 * ここでは数と名前だけを、コードから取り出した値と突き合わせる。文面の言い回しは見ない。
 */

import type { Context } from '../context.js';
import { makeResult, type Failure, type Result } from '../result.js';

export const ID = 'doc';
export const TITLE = '文書と実物の一致';
export const speed = 'fast' as const;

const README = 'README.md';
const FEEDS = 'src/config/feeds.ts';
const HN = 'src/hn/client.ts';
const AI = 'src/ai/client.ts';
const DAILY = '.github/workflows/daily-news.yml';

/**
 * 正規表現の最初の捕獲を返す。無ければ例外（系統ごと DOC-X にする。黙って 0 件の緑にしない）。
 * @param text 本文
 * @param re 捕獲を1つ持つ正規表現
 * @param what 何を探していたか（例外の文面に使う）
 */
function capture(text: string, re: RegExp, what: string): string {
  const m = re.exec(text);
  if (!m?.[1]) throw new Error(`${what} が見つかりません`);
  return m[1];
}

/**
 * README とコードの一致を調べる。
 * @param ctx 作業ツリーを読むための文脈
 * @returns DOC-1〜DOC-3 の結果
 */
export async function run(ctx: Context): Promise<Result[]> {
  const readme = await ctx.read(README);

  // DOC-1: 取得元の本数
  const countFails: Failure[] = [];
  const feedsText = await ctx.read(FEEDS);
  const rssBody = capture(feedsText, /export const RSS_FEEDS[^=]*=\s*\[([\s\S]*?)\n\];/, 'RSS_FEEDS の配列');
  const rssCount = [...rssBody.matchAll(/^\s+name:\s*'/gm)].length;
  const hnBody = capture(await ctx.read(HN), /export const HN_QUERIES[^=]*=\s*\[([\s\S]*?)\n\];/, 'HN_QUERIES の配列');
  const hnCount = [...hnBody.matchAll(/\{\s*name:\s*'/g)].length;
  const claims: { label: string; re: RegExp; actual: number; where: string }[] = [
    { label: 'RSS の本数', re: /RSS (\d+) 本/g, actual: rssCount, where: FEEDS },
    { label: 'Hacker News の検索の本数', re: /Hacker News の検索 (\d+) 本/g, actual: hnCount, where: HN },
  ];
  let claimCount = 0;
  for (const c of claims) {
    const found = [...readme.matchAll(c.re)];
    if (found.length === 0) {
      countFails.push({ check: 'DOC-1', message: `README に「${c.label}」の記述がありません`, where: README });
    }
    for (const m of found) {
      claimCount++;
      if (Number(m[1]) !== c.actual) {
        countFails.push({
          check: 'DOC-1',
          message: `README の${c.label}は ${m[1]} 本ですが、${c.where} は ${c.actual} 本です`,
          where: README,
          remedy: '取得元を足し引きしたら README の本数も直してください。',
        });
      }
    }
  }

  // DOC-2: モデル ID
  const modelFails: Failure[] = [];
  const aiText = await ctx.read(AI);
  const models = [
    capture(aiText, /export const PRIMARY_MODEL = '([^']+)'/, 'PRIMARY_MODEL'),
    capture(aiText, /export const FALLBACK_MODEL = '([^']+)'/, 'FALLBACK_MODEL'),
  ];
  for (const m of models) {
    if (!readme.includes(`\`${m}\``)) {
      modelFails.push({
        check: 'DOC-2',
        message: `README に ${AI} のモデル ID \`${m}\` がありません`,
        where: README,
        remedy: 'モデルを替えたら README の要約の節も直してください。',
      });
    }
  }

  // DOC-3: Secrets の一覧（集合で比べる。並び順は見ない）
  const secretFails: Failure[] = [];
  const section = capture(readme, /## GitHub Actions の Secrets\n([\s\S]*?)(?:\n## |$)/, 'README の Secrets の節');
  const listed = new Set([...section.matchAll(/^- `([A-Z][A-Z0-9_]*)`$/gm)].map((m) => m[1] ?? ''));
  const used = new Set([...(await ctx.read(DAILY)).matchAll(/\$\{\{\s*secrets\.([A-Z][A-Z0-9_]*)\s*\}\}/g)].map((m) => m[1] ?? ''));
  for (const name of used) {
    if (!listed.has(name)) {
      secretFails.push({ check: 'DOC-3', message: `ワークフローが読む Secret ${name} が README の一覧にありません`, where: README });
    }
  }
  for (const name of listed) {
    if (!used.has(name)) {
      secretFails.push({ check: 'DOC-3', message: `README の Secret ${name} をワークフローは読んでいません`, where: README });
    }
  }

  return [
    makeResult({ check: 'DOC-1', failures: countFails, surveyed: { 記述: claimCount }, primary: '記述' }),
    makeResult({ check: 'DOC-2', failures: modelFails, surveyed: { モデル: models.length }, primary: 'モデル' }),
    makeResult({ check: 'DOC-3', failures: secretFails, surveyed: { Secret: used.size }, primary: 'Secret' }),
  ];
}
