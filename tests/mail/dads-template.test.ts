import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DADS_COLORS, DADS_FONT_WEIGHTS, DADS_FONT_FAMILY } from '../../src/mail/dads-palette.js';

const html = readFileSync('src/templates/digest.hbs', 'utf8');
const allowed = new Set(Object.values(DADS_COLORS).map((c) => c.toLowerCase()));

describe('HTML メールは DADS のトークンの値だけを使う', () => {
  it('色はすべて DADS の表にある', () => {
    const used = [...html.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)].map((m) => m[0].toLowerCase());
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((c) => !allowed.has(c))).toEqual([]);
  });

  it('rgb() などの色の書き方を使わない（表と突き合わせられないため）', () => {
    expect(html).not.toMatch(/\brgba?\(/);
  });

  it('字の太さは 400 か 700 だけ', () => {
    const weights = [...html.matchAll(/font-weight:\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(weights.length).toBeGreaterThan(0);
    expect(weights.filter((w) => !DADS_FONT_WEIGHTS.includes(w))).toEqual([]);
  });

  it('書体は --font-family-sans', () => {
    expect(html).toContain(`font-family:${DADS_FONT_FAMILY}`);
  });

  it('飾りの記号（◆▲◇◈◉◎）を使わない', () => {
    expect(html).not.toMatch(/[◆▲◇◈◉◎]/);
  });

  it('記事のタイトルのリンクに下線を付ける（押せることを見た目で分かるようにする）', () => {
    expect(html).toMatch(/<a href="\{\{url\}\}"[^>]*text-decoration:underline/);
  });
});
