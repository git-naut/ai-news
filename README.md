# ai-news

毎朝 JST 09:00 に、AI とソフトウェア開発のニュースを日本語の要約つきで Gmail に届けるシステムです。RSS 10 本、Hacker News の検索 5 本、NewsData.io の 3 クエリから直近 36 時間の記事を集めます。要約とトレンドは BytePlus ModelArk の LLM がまとめます。起動は GitHub Actions です。

## 届くまでの流れ

cron-job.org が UTC 23:45 に `workflow_dispatch` で primary を起動します。取得と要約を済ませ、UTC 00:00（JST 09:00）まで待ってから送ります。待ちの上限は 20 分です。起動が遅れて上限を超えそうなときは、翌日へ回さずにその場で送ります。

GitHub の schedule（UTC 04:00）が backup です。前夜の primary の送信ジョブ `send-digest (primary)` が成功していなければ即時に送り、件名の先頭に `[予備配信・primary 未着]` を付けます。この印の付いたメールが届いた日は、cron-job.org か PAT のどちらかが止まっています。schedule は実測で 2〜12 時間遅れるので、定時の配信には使っていません。

| 起動 | 種類 | 送る時刻 | 件名の印 |
|---|---|---|---|
| cron-job.org（UTC 23:45、`immediate=false`） | primary | UTC 00:00 まで待つ | なし |
| GitHub schedule（UTC 04:00） | backup | primary が未着なら即時 | `[予備配信・primary 未着]` |
| 手動の dispatch（`immediate=true`） | manual | 即時 | `[手動送信]` |
| 手動の dispatch（`simulate_schedule=true`） | backup | backup と同じ判定 | `[予備配信・primary 未着]` |

## 取得元

| 種類 | 取得元 | 取り方 |
|---|---|---|
| RSS（10 本） | OpenAI Blog、Anthropic Blog、Google DeepMind、Microsoft Research、Hugging Face Blog、Publickey、Zenn トレンド、Qiita 人気記事、@IT、ITmedia AI+ | `src/config/feeds.ts`。Anthropic は公式の RSS が無く、第三者（Olshansk/rss-feeds）のフィードを読む |
| Hacker News（5 本） | LLM、Llama、DeepSeek、Mistral、Grok をタイトルで検索 | 公式の Algolia API。`src/hn/client.ts` |
| NewsData.io（3 クエリ） | AI と LLM の英語・日本語ニュース | `src/news-api/client.ts` |

取得窓は 36 時間で、`src/config/lookback.ts` の 1 か所で決めています。月曜の配信で土日の記事を取りこぼさないための長さです。

## 要約

要約とトレンドは BytePlus ModelArk（ap-southeast-1）の `seed-2-0-lite-260428` で作ります。失敗したときは予備の `seed-2-0-lite-260228` を使います。構造化出力（json_schema）で受けて zod で検証し、1 バッチ 5 件を 6 秒間隔で直列に送ります。失敗したバッチの記事は、本文の抜粋を要約の代わりに載せます。

2026-09-29 に Gemini から移しました。前払い課金の残高が 0 のキーでは 3.x 系が 402 を返し、2.5 系は新しい SDK から 404 を返したためです。経緯は `docs/LESSONS.md` の LLM の節にあります。

## 手元で動かす

```bash
pnpm install --frozen-lockfile --ignore-scripts
cp .env.example .env   # NEWS_API_KEY と Gmail の3つを書く
pnpm start             # SEND_AT_UTC を空にすると即時に送る
```

`ARK_API_KEY` と `ARK_BASE_URL` は、Windows のユーザー環境変数から WSLENV で渡しています。`.env` に書いても動きます。

| 変数 | 中身 |
|---|---|
| `ARK_API_KEY` | ModelArk の API キー（ap-southeast-1 で発行。他リージョンの鍵は 401） |
| `ARK_BASE_URL` | `https://ark.ap-southeast.bytepluses.com/api/v3` |
| `NEWS_API_KEY` | NewsData.io の API キー |
| `GMAIL_USER` | 送信元の Gmail アドレス |
| `GMAIL_APP_PASSWORD` | Gmail のアプリパスワード（16 文字） |
| `RECIPIENT_EMAIL` | 配信先（いまは送信元と同じ個人の Gmail） |

## GitHub Actions の Secrets

送信ジョブが読む Secrets は次の 5 つです。`ARK_BASE_URL` は秘密ではないので、ワークフローに直接書いています。

- `ARK_API_KEY`
- `NEWS_API_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `RECIPIENT_EMAIL`

cron-job.org の設定は次のとおりです。PAT は Fine-grained token（Actions の read/write、期限なし、2026-09-29 に作り直した `ai-news`）です。2026-06-23 から呼び出しが失敗し続け、7/19 にジョブが自動で止まっていました（docs/LESSONS.md の OPS-001）。

| 項目 | 値 |
|---|---|
| URL | `https://api.github.com/repos/git-naut/ai-news/actions/workflows/daily-news.yml/dispatches` |
| スケジュール | 毎日 8:45（ジョブの時間帯は Asia/Tokyo。UTC の 23:45）、POST |
| Body | `{"ref":"main","inputs":{"immediate":"false"}}` |

cron-job.org の既定の設定では、失敗してもメールは来ず、応答の本文も残りません。失敗が 25 回を超えるとジョブは自動で止まり、履歴はジョブごとに直近 50 件だけ残ります。次の 3 つを必ず見直します。

| 設定 | 値 | 理由 |
|---|---|---|
| Notifications の「execution of the cronjob fails」と「the cronjob will be disabled because of too many failures」 | オン | 既定はどちらもオフ。3 か月気づけなかった原因の一つ |
| Save responses in job history | オン | オフだと GitHub の 401 の本文が残らず、原因を切り分けられない |
| Schedule expires | 期限なし | 期限を過ぎると失敗扱いにならず、黙って予定から外れる |

## 開発と検査

```bash
pnpm test                  # vitest
pnpm typecheck             # src/・tools/check/・tests/ の3つに tsc
pnpm check                 # 速い検査（秘密・ワークフロー・依存・教訓）
pnpm check --all           # vitest と tsc を含む全検査
pnpm check --mutate -j 8   # 逆テスト。--all と同時に走らせない
```

検査は `tools/check/`、踏んだ罠は `docs/LESSONS.md`、回し方は `docs/CYCLE.md` にあります。CI は push と PR のたびに、テストと型、全検査、逆テストをこの順で回します。

## メールが届かないとき

宛先の Gmail で `in:anywhere subject:"AI News"` を検索します。会社の Workspace の受信箱ではありません。見つからなければ、Actions の `Daily AI News Digest` の実行を開き、`send-digest` のログで `[mail] メール送信完了` の行を探します。

| 見えたもの | 原因の候補 |
|---|---|
| dispatch の実行が1件も無い | cron-job.org のジョブ停止か PAT の失効 |
| backup が `[予備配信・primary 未着]` で届く | 同上。primary だけが止まっている |
| 起動直後に zod のエラー | Secrets の登録漏れ（WF-10 が見ている形） |
| `[ai] プライマリモデル失敗` が続く | ModelArk の鍵かリージョンの誤り |
