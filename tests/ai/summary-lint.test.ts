import { describe, it, expect } from 'vitest';
import { findSummaryIssues, SUMMARY_FIELD_MAX } from '../../src/ai/summary-lint.js';

const ok = { what: 'OpenAI が gpt-oss-120b を公開した。', change: 'パラメータ数は 117B、80GB の GPU 1 枚で動く。', tryIt: 'Hugging Face の openai/gpt-oss-120b' };

describe('findSummaryIssues', () => {
  it('問題の無い要約は空を返す', () => {
    expect(findSummaryIssues(ok)).toEqual([]);
  });

  it('誇張の語を見つける', () => {
    const issues = findSummaryIssues({ ...ok, change: '性能が大幅に向上し、革命的な変化をもたらす。' });
    expect(issues).toEqual(expect.arrayContaining(['change に誇張の語「大幅」', 'change に誇張の語「革命的」']));
  });

  it('what が空なら指摘する。change と tryIt は null でよい', () => {
    expect(findSummaryIssues({ what: ' ', change: null, tryIt: null })).toEqual(['what が空']);
  });

  it(`各欄は ${SUMMARY_FIELD_MAX} 文字まで`, () => {
    expect(SUMMARY_FIELD_MAX).toBe(120);
    expect(findSummaryIssues({ ...ok, what: 'あ'.repeat(121) })).toEqual(['what が 121 文字（上限 120）']);
    expect(findSummaryIssues({ ...ok, what: 'あ'.repeat(120) })).toEqual([]);
  });
});
