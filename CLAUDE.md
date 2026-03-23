# ai-news 開発ガイド

## プロジェクト概要
毎朝 JST 09:00 に GitHub Actions で実行される AI/テックニュース自動配信システム。
RSS フィードと NewsData.io API でニュースを収集し、Gemini API で要約・分類してGmail で配信する。

## 技術スタック
- TypeScript (Node.js 20 LTS) + ESM (`"type": "module"`)
- pnpm パッケージマネージャ
- Gemini API (`@google/generative-ai`) — 要約・分類・トレンド分析
- NewsData.io API — RSS を補完するニュース取得
- nodemailer + Gmail SMTP — メール送信
- Handlebars — HTML メールテンプレート
- Zod — 環境変数・APIレスポンスのバリデーション
- vitest — テストフレームワーク

## ディレクトリ構成
```
src/
  config/       # env.ts (Zod バリデーション), feeds.ts (RSS一覧), categories.ts (カテゴリ定義)
  feeds/        # types.ts (共通型), fetcher.ts (並列RSS取得), normalizer.ts (正規化)
  news-api/     # client.ts (NewsData.io), types.ts (Zod スキーマ)
  categorizer/  # deduplicator.ts (重複排除), classifier.ts (キーワード分類)
  ai/           # client.ts (Gemini+バックオフ), summarizer.ts (バッチ要約),
                # trend-analyzer.ts (トレンド), fallback.ts (フォールバック要約)
  mail/         # types.ts, template-engine.ts (Handlebars), sender.ts (Gmail送信)
  templates/    # digest.hbs (HTML), digest-text.hbs (プレーンテキスト)
  index.ts      # パイプラインエントリーポイント
```

## 開発コマンド
```bash
pnpm start          # 実行 (.env が必要)
pnpm test           # テスト実行
pnpm test:watch     # テストウォッチモード
pnpm test:coverage  # カバレッジ付きテスト
pnpm typecheck      # 型チェックのみ
pnpm build          # tsc ビルド
```

## 環境変数
`.env.example` をコピーして `.env` を作成し、以下を設定する:
| 変数名 | 用途 | 取得方法 |
|--------|------|---------|
| `GEMINI_API_KEY` | Gemini API キー | https://aistudio.google.com/app/apikey |
| `NEWS_API_KEY` | NewsData.io API キー | https://newsdata.io/api-key |
| `GMAIL_USER` | 送信元 Gmail アドレス | — |
| `GMAIL_APP_PASSWORD` | Gmail アプリパスワード | Googleアカウント > セキュリティ > 2段階認証 > アプリパスワード |
| `RECIPIENT_EMAIL` | 配信先メールアドレス | — |

## アーキテクチャ上の決定事項
- **ESM モジュール** (`"type": "module"`) を採用: `p-limit` v6+ が ESM only
- **tsx で直接実行**: `tsc` ビルドステップを省略し GitHub Actions をシンプルに保つ
- **handlebars** を mjml より優先: バンドルサイズと柔軟性のバランス
- **パイプラインを止めない設計**: 各フィード/API 取得エラーはスキップし、Gemini 失敗時はフォールバック要約でメール送信を継続
- **Gemini バッチ処理**: 5記事/リクエストで RPD 消費を最小化（250 RPD 無料枠内）
- **Gmail App Password**: OAuth2 より設定が簡単で GitHub Actions に適している

## コーディング規約
- 全ての公開関数に JSDoc コメントを付与する
- エラーハンドリング: パイプラインを止めないことを優先、メール送信失敗時のみ `process.exit(1)`
- ログ: `console.log` (正常系), `console.warn` (部分的失敗), `console.error` (重大エラー)
- 型: `unknown` を優先し `any` は使用しない
- インポートパス: ESM 規則に従い `.js` 拡張子を明示する
