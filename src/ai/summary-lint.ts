import type { DigestSummary } from '../feeds/types.js';

/** 要約の 1 欄の上限（文字数）。1 カラムのメールで 2 行に収まる長さ */
export const SUMMARY_FIELD_MAX = 120;

/**
 * 要約に書かせない誇張の語。数字か事実に置き換えさせる。
 * 2026-09-29 の実機の要約に「最大の変更点」が出た。
 */
export const HYPE_WORDS: readonly string[] = [
  '大幅', '劇的', '革命的', '画期的', '圧倒的', '飛躍的', '究極', '最大の', '非常に', '極めて', '著しく',
];

/**
 * 要約 1 件の問題を探す。空の欄、長すぎる欄、誇張の語を見つける。
 * パイプラインは止めず、件数をログに出して監視に使う。
 * @param s 要約
 * @returns 見つかった問題の説明。無ければ空
 */
export function findSummaryIssues(s: DigestSummary): string[] {
  const issues: string[] = [];
  const fields: [keyof DigestSummary, string | null][] = [
    ['what', s.what],
    ['change', s.change],
    ['tryIt', s.tryIt],
  ];
  for (const [name, value] of fields) {
    if (value === null) continue;
    if (value.trim() === '') {
      if (name === 'what') issues.push(`${name} が空`);
      continue;
    }
    const len = [...value].length;
    if (len > SUMMARY_FIELD_MAX) issues.push(`${name} が ${len} 文字（上限 ${SUMMARY_FIELD_MAX}）`);
    for (const word of HYPE_WORDS) {
      if (value.includes(word)) issues.push(`${name} に誇張の語「${word}」`);
    }
  }
  return issues;
}
