# AI ニュース自動配信システム (ai-news) 実装計画書

## 概要

毎朝 JST 09:00 に GitHub Actions から起動し、AI/テック系ニュースを収集→Gemini API で分析→Gmail でダイジストメールを送信するシステムを構築する。

---

## 1. 技術スタック選定

### 言語・ランタイム
| 選定 | 理由 |
|------|------|
| TypeScript (Node.js 20 LTS) | 型安全・Gemini SDK 公式サポート・エコシステムが充実 |
| ESM (`"type": "module"`) | `p-limit` v6+ が ESM only のため必須 |
| pnpm | `pnpm-lock.yaml` で CI 再現性確保、インストール高速 |
| tsx | tsc ビルドステップ不要で GitHub Actions をシンプルに保てる |

### 主要ライブラリ
| パッケージ | 用途 |
|-----------|------|
| `rss-parser ^3.13.0` | RSS/Atom フィード解析（`content:encoded` カスタムフィールド対応） |
| `axios ^1.7.9` | NewsData.io API 呼び出し |
| `@google/generative-ai ^0.24.1` | Gemini API クライアント |
| `nodemailer ^6.9.16` | Gmail SMTP 送信（App Password 方式） |
| `handlebars ^4.7.8` | HTML メールテンプレート（mjml より軽量） |
| `zod ^3.23.8` | 環境変数・APIレスポンスの起動時バリデーション |
| `date-fns ^4.1.0` + `date-fns-tz ^3.2.0` | JST 変換・日付フォーマット |
| `p-limit ^6.1.0` | RSS 並列取得の同時接続数制限 |
| `vitest ^2.1.8` | テストフレームワーク（ESM 対応・高速） |

---

## 2. ニュースソース

### RSS フィード（10ソース）
| ソース | カテゴリ | 言語 |
|--------|----------|------|
| OpenAI Blog | AI/LLM | en |
| Anthropic Engineering | AI/LLM | en |
| Google AI Blog | AI/LLM | en |
| Hugging Face Blog | AI/LLM | en |
| Hacker News (AI filter, points≥50) | Tech | en |
| TechCrunch | Tech | en |
| The Verge | Tech | en |
| Publickey | Development | ja |
| Zenn トレンド | Development | ja |
| Qiita 人気記事 | Development | ja |

### News API — NewsData.io を採用

| API | 無料枠 | 商用利用 | 採用 |
|-----|--------|---------|------|
| **NewsData.io** | 200 credits/日 | **可** | **採用** |
| GNews | 100 req/日 | 不可 | 不採用 |
| NewsAPI.org | localhost のみ | 不可 | 不採用 |
| Mediastack | 100 req/月 | 不可 | 不採用 |

採用理由: 唯一商用利用が許可されており、1日3クエリ（3 credits）で十分な記事数を確保できる。

---

## 3. Gemini API 設計

- **プライマリ**: `gemini-2.5-flash` (10 RPM, 250 RPD)
- **フォールバック**: `gemini-2.5-flash-lite` (15 RPM, 1000 RPD)
- **バッチサイズ**: 5記事/リクエスト → 100記事でも約20 RPD（無料枠内）
- **レート制限対策**: exponential backoff + jitter、pLimit(2) で同時2リクエスト
- **フォールバック設計**: Gemini 失敗時はコンテンツ先頭150文字を要約代わりにして配信継続

---

## 4. セキュリティ設計

- `GEMINI_API_KEY`, `NEWS_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `RECIPIENT_EMAIL` を GitHub Secrets に格納
- `.env.example` には変数名のみ記載
- Gmail: OAuth2 より設定が簡単な App Password 方式を採用
- `.gitignore` に `.env`, `node_modules/`, `dist/` を含める

---

## 5. GitHub Actions スケジュール

```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # UTC 00:00 = JST 09:00
  workflow_dispatch:       # 手動実行
```

**注意**: GitHub Actions の cron は最大15分の遅延が発生する場合があります。

---

## 6. エラーハンドリング方針

パイプラインを止めないことを最優先とする:

| 失敗箇所 | 対処 |
|---------|------|
| 個別 RSS フィード取得失敗 | warn ログ → スキップ |
| NewsData.io API 失敗 | warn ログ → RSS のみで続行 |
| Gemini API 失敗 | フォールバック要約 → AI なしでメール送信 |
| メール送信失敗 | error ログ → `process.exit(1)` |
| 記事0件 | 空のダイジストを送信 |

---

## 7. 将来の拡張候補（v1.0 スコープ外）

- 配信先の複数化（購読者リスト管理）
- Slack / LINE Notify への配信チャンネル追加
- 記事の既読管理（GitHub Actions Artifact に URL ハッシュを保存）
- Web UI でのアーカイブ閲覧
- Gmail OAuth2 認証への移行
- ITmedia AI+ の RSS フィード追加（要 URL 確認）
