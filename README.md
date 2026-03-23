# ai-news — AI ニュース自動配信システム

毎朝 JST 09:00 に GitHub Actions から自動実行し、AI/テック系ニュースを収集・要約してGmail でダイジストメールを配信するシステムです。

> **注意**: GitHub Actions の cron スケジュールは最大 15 分程度の遅延が発生する場合があります。厳密な 9:00 送信は保証されません。

## 機能

- **RSS フィード取得**: OpenAI, Anthropic, Google AI, Hugging Face, TechCrunch など 10 ソース
- **News API 補完**: NewsData.io API で RSS をカバーしきれないニュースを補完
- **AI 要約・分類**: Gemini API (無料枠) で各記事を日本語で 2〜3 文に要約
- **トレンド分析**: その日のニュース全体から主要トレンドを 3〜5 点で抽出
- **HTML メール**: カテゴリ別・読みやすいレイアウトでGmail に配信

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <your-repo-url>
cd ai-news
pnpm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して以下を設定します:

| 変数名 | 取得方法 |
|--------|---------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) で無料発行（クレジットカード不要） |
| `NEWS_API_KEY` | [NewsData.io](https://newsdata.io/api-key) で無料発行 |
| `GMAIL_USER` | 送信元の Gmail アドレス |
| `GMAIL_APP_PASSWORD` | Google アカウント > セキュリティ > 2段階認証 > **アプリパスワード** で生成した 16 文字のパスワード |
| `RECIPIENT_EMAIL` | 配信先メールアドレス（自分自身でも可） |

### 3. ローカル実行テスト

```bash
pnpm start
```

### 4. GitHub Actions の設定

1. GitHub でリポジトリを作成してプッシュ
2. **Settings > Secrets and variables > Actions** で以下のシークレットを追加:
   - `GEMINI_API_KEY`
   - `NEWS_API_KEY`
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
   - `RECIPIENT_EMAIL`
3. **Actions タブ** から `Daily AI News Digest` ワークフローを手動実行してテスト

## 開発

```bash
pnpm test           # テスト実行
pnpm test:coverage  # カバレッジ付き
pnpm typecheck      # 型チェック
```

## コスト

すべて **無料枠のみ** で運用可能です:

| サービス | 無料枠 | 実際の消費量 |
|---------|--------|------------|
| Gemini API (gemini-2.5-flash) | 250 RPD | 約 20 RPD/日 |
| NewsData.io | 200 credits/日 | 約 3 credits/日 |
| GitHub Actions | 2,000 分/月 (public repo は無制限) | 約 5〜10 分/日 |
| Gmail SMTP | 制限なし | 1通/日 |

> Gemini API の無料枠ではプロンプトとレスポンスが Google の品質改善に使用される可能性があります。詳細は [Google AI Studio 利用規約](https://ai.google.dev/gemini-api/terms) を確認してください。

## アーキテクチャ

```
GitHub Actions (cron: 0 0 * * *)
    └─ pnpm start → src/index.ts
         ├─ src/feeds/      RSS フィード並列取得 (p-limit で同時5接続)
         ├─ src/news-api/   NewsData.io API 取得
         ├─ src/categorizer/ 重複排除 + キーワード分類
         ├─ src/ai/         Gemini API バッチ要約・トレンド分析
         └─ src/mail/       HTML メール生成・Gmail 送信
```

## トラブルシューティング

**メールが届かない場合**
- Gmail のアプリパスワードが正しく設定されているか確認
- Gmail アカウントで 2 段階認証が有効になっているか確認
- 迷惑メールフォルダを確認

**Gemini API エラーの場合**
- API キーが有効か [Google AI Studio](https://aistudio.google.com/) で確認
- フォールバック機能により、Gemini が利用不可でも AI 要約なしでメールは送信されます

**記事が 0 件の場合**
- GitHub Actions の実行ログを確認
- 特定の RSS フィードが一時的に利用不可の場合があります（自動でスキップされます）
