import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // リポジトリ内の .claude/worktrees/ にある別ブランチのテストを拾わないよう、対象を tests/ に限る
    include: ['tests/**/*.test.ts'],
    // テストの上限は既定の 5 秒では足りない。DrvFs の上で動かし、逆テストでは全件を 8 並列で重ねるため、
    // ふだん 0.3 秒未満の変異の表のテストが 5 秒を超えて落ちた（2026-09-29、unit 系統の 1 回が 197 秒かかった回）。
    // 止まったテストは 30 秒で落ちる。unit 系統の子プロセスの上限（600 秒）にも収まる
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
