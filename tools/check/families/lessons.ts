/**
 * lessons 系統 — 教訓と検査と変異が食い違っていないか。
 *
 * 正本は docs/LESSONS.md の散文と tools/check/policy.json の値の2本。役割が違うので
 * 分けてある。分けた以上、片方だけ直したときに気づく必要がある。この系統が
 * 相互参照を突き合わせる。書き写しを禁じるのではなく、食い違った瞬間に落とす。
 */

import { readdir } from 'node:fs/promises';
import { POLICY_PATH, type Context } from '../context.js';
import { makeResult, type Failure, type Result } from '../result.js';

export const ID = 'lessons';
export const TITLE = '教訓の整合';
export const speed = 'fast' as const;

export const LESSONS_PATH = 'docs/LESSONS.md';

/** `<!-- L:SEC-001 family=sec check=SEC-2 mutation=m_sec_001 -->` の形。 */
const MARKER = /<!--\s*L:(?<lid>[A-Z]+-\d+)(?<attrs>[^>]*?)-->/g;
/** 属性の値に使える文字。カンマは入らないので、1つの印に検査は1つだけ書く。 */
const ATTR = /(\w+)=([A-Za-z0-9_.-]+)/g;
/** 検査コードに直書きされた検査 ID。二重引用符と一重引用符の両方を拾う。 */
const CHECK_LITERAL = /["']([A-Z]{2,6}-\d+)["']/g;
/** 変異モジュールの `id: 'm_sec_001'`。 */
const MUTATION_ID = /\bid:\s*["']([^"']+)["']/;

/** 教訓の印1つ。 */
export interface LessonMarker {
  id: string;
  line: number;
  attrs: Record<string, string>;
}

/**
 * LESSONS.md から教訓の印を拾う。
 * @param text LESSONS.md の本文
 * @returns 出てきた順の印
 */
export function parseMarkers(text: string): LessonMarker[] {
  const out: LessonMarker[] = [];
  for (const m of text.matchAll(MARKER)) {
    const attrs: Record<string, string> = {};
    for (const a of (m.groups?.['attrs'] ?? '').matchAll(ATTR)) {
      if (a[1] !== undefined && a[2] !== undefined) attrs[a[1]] = a[2];
    }
    out.push({
      id: m.groups?.['lid'] ?? '',
      line: text.slice(0, m.index ?? 0).split('\n').length,
      attrs,
    });
  }
  return out;
}

/**
 * ディレクトリ直下の .ts を名前順に返す。無ければ空。
 * @param ctx 文脈
 * @param dir root からの相対パス
 * @returns root からの相対パス
 */
async function tsFiles(ctx: Context, dir: string): Promise<string[]> {
  try {
    const names = await readdir(ctx.path(dir));
    return names.filter((n) => n.endsWith('.ts')).sort().map((n) => `${dir}/${n}`);
  } catch {
    return [];
  }
}

/**
 * 検査コードに実在する検査 ID を集める。
 *
 * 見るのは families/*.ts と runner.ts（LOOP-3 はそこで組み立てる）。変異のファイルは
 * 見ない。見ると、実在しない検査を期待する変異がその ID を「実在」にしてしまう。
 * @param ctx 文脈
 * @returns 検査 ID の集合
 */
export async function collectCheckIds(ctx: Context): Promise<Set<string>> {
  const srcs = [...(await tsFiles(ctx, 'tools/check/families')), 'tools/check/runner.ts'];
  const ids = new Set<string>();
  for (const rel of srcs) {
    if (!ctx.exists(rel)) continue;
    for (const m of (await ctx.read(rel)).matchAll(CHECK_LITERAL)) {
      if (m[1] !== undefined) ids.add(m[1]);
    }
  }
  return ids;
}

/**
 * 変異の ID を集める。
 * @param ctx 文脈
 * @returns 変異 ID の集合
 */
export async function collectMutationIds(ctx: Context): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const rel of await tsFiles(ctx, 'tools/check/mutations')) {
    if (!rel.slice(rel.lastIndexOf('/') + 1).startsWith('m_')) continue;
    const m = MUTATION_ID.exec(await ctx.read(rel));
    if (m?.[1] !== undefined) ids.add(m[1]);
  }
  return ids;
}

/**
 * 教訓の整合を調べる。
 * @param ctx 作業ツリーを読むための文脈
 * @returns LES-1〜LES-6 をまとめた結果
 */
export async function run(ctx: Context): Promise<Result[]> {
  if (!ctx.exists(LESSONS_PATH)) {
    return [
      makeResult({
        check: 'LES',
        failures: [
          {
            check: 'LES-1',
            message: `${LESSONS_PATH} がありません`,
            remedy: '教訓の正本です。見出しだけでも置いてください。',
          },
        ],
        surveyed: { 教訓: 0 },
      }),
    ];
  }

  const failures: Failure[] = [];
  const markers = parseMarkers(await ctx.read(LESSONS_PATH));
  const [knownChecks, knownMuts] = await Promise.all([collectCheckIds(ctx), collectMutationIds(ctx)]);

  const seen = new Map<string, number>();
  const referencedMuts = new Set<string>();
  for (const m of markers) {
    const where = `${LESSONS_PATH}:${m.line}`;
    const first = seen.get(m.id);
    if (first !== undefined) {
      failures.push({
        check: 'LES-2',
        message: `教訓 ID ${m.id} が重複しています（先は ${first} 行目）`,
        where,
        remedy: '後から足した方に新しい番号を振ってください。',
      });
    } else {
      seen.set(m.id, m.line);
    }

    const cid = m.attrs['check'];
    if (cid !== undefined && !knownChecks.has(cid)) {
      failures.push({
        check: 'LES-3',
        message: `${m.id} が参照する検査 ${cid} は実在しません`,
        where,
        remedy: '検査を作るか、参照を実在する ID に直してください。',
      });
    }

    const mid = m.attrs['mutation'];
    if (mid !== undefined) {
      referencedMuts.add(mid);
      // 変異が1本も無くても素通りさせない。無いのに教訓が変異を主張している状態が食い違い。
      if (!knownMuts.has(mid)) {
        failures.push({
          check: 'LES-4',
          message: `${m.id} が参照する変異 ${mid} は実在しません`,
          where,
          remedy: 'tools/check/mutations/ に足すか、参照を直してください。',
        });
      }
    }
  }

  // 取り下げた変異には、理由と、対応する教訓の両方が要る
  const accepted = (await ctx.policy()).mutations.accepted;
  for (const [mid, reason] of Object.entries(accepted)) {
    if (typeof reason !== 'string' || reason.trim() === '') {
      failures.push({
        check: 'LES-5',
        message: `取り下げた変異 ${mid} に理由が書かれていません`,
        where: POLICY_PATH,
        remedy: '"変異 ID": "取り下げる理由" の形で書いてください。',
      });
    }
    if (!referencedMuts.has(mid)) {
      failures.push({
        check: 'LES-6',
        message: `変異 ${mid} を取り下げたのに、対応する教訓が LESSONS.md にありません`,
        where: POLICY_PATH,
        remedy: `${LESSONS_PATH} に <!-- L:XXX-NNN mutation=${mid} --> を持つ節を書いてください。`,
      });
    }
  }

  return [
    makeResult({
      check: 'LES',
      failures,
      surveyed: {
        教訓: markers.length,
        検査ID: knownChecks.size,
        変異ID: knownMuts.size,
        取り下げ: Object.keys(accepted).length,
      },
      primary: '教訓',
    }),
  ];
}
