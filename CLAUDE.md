# ai-news 開発ガイド

## このリポジトリ
毎朝 JST 09:00 に GitHub Actions で実行する AI/テックニュースの自動配信システム。
RSS 10 本・Hacker News の検索 5 本・NewsData.io でニュースを集め、BytePlus ModelArk の LLM で要約して Gmail で送る。
起動の仕組み（cron-job.org の primary と GitHub schedule の backup）と検査の回し方は README.md が正本。
踏んだ罠は docs/LESSONS.md、1 周の回し方は docs/CYCLE.md にある。

## 技術スタック
- TypeScript + ESM（`"type": "module"`）。CI は Node.js 24、手元は 22 で、`engines.node` は `>=22`
- pnpm は `packageManager: pnpm@10.34.5` で固定する。CI の pnpm/action-setup には with.version を書かない
- LLM は BytePlus ModelArk。OpenAI 互換の REST を fetch で直接呼ぶ
  - 主は `seed-2-0-lite-260428`、予備は `seed-2-0-lite-260228`
- Hacker News は公式の検索 API（Algolia）で取る
- NewsData.io は RSS を補う
- nodemailer と Gmail SMTP で送り、本文は Handlebars で組む
- 環境変数と API の応答は Zod で検証し、テストは vitest で書く

## ディレクトリ構成
```
src/
  config/       # env.ts (Zod), feeds.ts (RSS 一覧), categories.ts, lookback.ts (取得窓 36h を共有), digest.ts (1 通の上限 30 件)
  feeds/        # types.ts, fetcher.ts (並列 RSS 取得・止まったフィードの検知), normalizer.ts (正規化)
  hn/           # client.ts (HN Algolia 検索)
  news-api/     # client.ts (NewsData.io), types.ts (Zod スキーマ)
  categorizer/  # deduplicator.ts (重複排除), classifier.ts (キーワード分類), selector.ts (上限までの選別)
  ai/           # client.ts (ModelArk・構造化出力・バックオフ), summarizer.ts, trend-analyzer.ts, fallback.ts
  schedule/     # send-delay.ts (待機の上限・送信予定時刻)
  mail/         # types.ts, template-engine.ts, sender.ts
  templates/    # digest.hbs (HTML), digest-text.hbs (プレーンテキスト)
  index.ts      # パイプラインの入口
tools/check/    # 検査と逆テスト
.github/scripts/decide-delivery.sh  # primary / backup / manual の判定
```

## 開発コマンド
```bash
pnpm start          # 実行（.env か環境変数が要る）
pnpm test           # vitest
pnpm typecheck      # src/・tools/check/・tests/ の3つに tsc
pnpm check          # 速い検査（sec / wf / dep / doc / lessons / loop）
pnpm check --all    # unit（vitest と tsc）を含む全検査
pnpm check --mutate -j 8  # 逆テスト（--all と同時に走らせない。手元で約 8 分）
```

直したら `pnpm check --all` と `pnpm check --mutate -j 8` をこの順で回す。
すり抜け・誤検知・素通りが 0 になるまで、docs/LESSONS.md に教訓を足して検査と変異を増やす。

## 環境変数
`.env.example` をコピーして `.env` を作る。ARK の2つは Windows のユーザー環境変数から WSLENV でも渡っている。

| 変数名 | 用途 | 取得方法 |
|--------|------|---------|
| `ARK_API_KEY` | ModelArk の API キー（ap-southeast-1。他リージョンの鍵は 401） | https://ai.byteplus.com/ark/region:ap-southeast-1/apikey |
| `ARK_BASE_URL` | ModelArk の呼び出し口 | `https://ark.ap-southeast.bytepluses.com/api/v3` |
| `NEWS_API_KEY` | NewsData.io の API キー | https://newsdata.io/api-key |
| `GMAIL_USER` | 送信元の Gmail アドレス | — |
| `GMAIL_APP_PASSWORD` | Gmail のアプリパスワード | Google アカウントの 2 段階認証の画面から |
| `RECIPIENT_EMAIL` | 配信先のメールアドレス | — |

## 設計上の決定
- ESM を使う。p-limit v6 以降が ESM だけのため
- tsx で直接実行し、tsc のビルドは挟まない。GitHub Actions の手順を短く保つ
- テンプレートは mjml ではなく Handlebars にした。依存の大きさと書きやすさの釣り合い
- パイプラインは止めない。取得元のエラーはその取得元だけ捨て、LLM が失敗したら本文の抜粋で送る
- LLM には 5 記事ずつ 6 秒間隔で直列に送る。失敗したバッチの記事だけ要約なしで残す
- Gmail はアプリパスワードで送る。OAuth2 より設定が短く、GitHub Actions で扱いやすい

## コーディング規約
- 公開関数には JSDoc を付ける
- パイプラインを止めないことを優先する。`process.exit(1)` はメール送信に失敗したときだけ
- 正常系は `console.log`、部分的な失敗は `console.warn`、重大なエラーは `console.error` に出す
- `any` は使わず `unknown` を使う
- import には ESM の規則どおり `.js` の拡張子を付ける

## 作業上の注意
- gh の有効アカウントは git-hub-nakano で、このリポジトリ（git-naut/ai-news）には書けない
  - `gh auth switch` はせず、コマンドの中だけ `GH_TOKEN=$(gh auth token -u git-naut)` を渡す
  - push は credential.helper を差し替える（docs/LESSONS.md の OPS-002）
- 並列の worktree エージェントが走っている間は、本体で `pnpm add` や `pnpm remove` をしない。node_modules を symlink で共有している
- 配信の確認は宛先の個人 Gmail で `in:anywhere subject:"AI News"` を探す。会社の Workspace の受信箱ではない
