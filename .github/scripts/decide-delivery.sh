#!/usr/bin/env bash
# 配信の種類と、送るかどうか、送信時刻を決めて GITHUB_OUTPUT に書く。
#
#   primary : cron-job.org の dispatch（immediate=false）。UTC 00:00 (JST 09:00) まで待って送る
#   manual  : 手動の dispatch（immediate=true）。即時に送る
#   backup  : GitHub の schedule（または simulate_schedule=true）。直近の primary 枠以降に
#             primary の送信ジョブが success していなければ即時に送る
#
# 入力（環境変数）: EVENT_NAME, INPUT_IMMEDIATE, INPUT_SIMULATE_SCHEDULE, GITHUB_REPOSITORY,
#                   GITHUB_OUTPUT, NOW_EPOCH（テスト用。未指定なら現在時刻）
# 出力: kind, should_send, send_at_utc
#
# schedule は実測で 2〜12 時間遅れる。起点は「現在以前で最も新しい予定時刻 UTC 04:00」の前夜 23:35 に置く。
# schedule は予定時刻より前には動かないので、遅れが 24 時間未満なら必ず正しい夜の primary を見る。
# 旧実装は「現在以前で最も新しい 23:35」を起点にしたので、19 時間 35 分以上遅れると翌朝の primary を探して
# 予備配信を誤って送った。
set -uo pipefail

emit() {
  {
    echo "kind=$1"
    echo "should_send=$2"
    echo "send_at_utc=$3"
  } >> "$GITHUB_OUTPUT"
}

if [ "${EVENT_NAME:-}" = "schedule" ] || [ "${INPUT_SIMULATE_SCHEDULE:-false}" = "true" ]; then
  KIND=backup
elif [ "${INPUT_IMMEDIATE:-false}" = "true" ]; then
  KIND=manual
else
  KIND=primary
fi

case "$KIND" in
  primary)
    echo "primary: UTC 00:00 (JST 09:00) まで待って送信します。"
    emit primary true "00:00"
    exit 0
    ;;
  manual)
    echo "manual: 即時に送信します。"
    emit manual true ""
    exit 0
    ;;
esac

NOW="${NOW_EPOCH:-$(date -u +%s)}"
TODAY=$(date -u -d "@$NOW" +%Y-%m-%d)
SCHEDULED=$(date -u -d "$TODAY 04:00:00" +%s)
if [ "$SCHEDULED" -gt "$NOW" ]; then
  SCHEDULED=$((SCHEDULED - 86400))
fi
# 予定時刻 04:00 の 4 時間 25 分前 = 前夜の 23:35
SLOT=$((SCHEDULED - 4 * 3600 - 25 * 60))
SINCE=$(date -u -d "@$SLOT" +%Y-%m-%dT%H:%M:%SZ)
echo "backup: $SINCE 以降に primary の送信が成功しているか確認します。"

# 一覧か jobs の取得に失敗したら送る側に倒す（重複より欠配のほうが悪い）
if ! RUNS=$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/daily-news.yml/runs?created=%3E%3D$SINCE&per_page=50"); then
  echo "::warning::実行履歴を取得できませんでした。予備配信を送ります。"
  emit backup true ""
  exit 0
fi

IDS=$(printf '%s' "$RUNS" | python3 -c 'import json,sys; [print(r["id"]) for r in json.load(sys.stdin).get("workflow_runs", [])]')

for ID in $IDS; do
  if ! JOBS=$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$ID/jobs"); then
    echo "::warning::run $ID のジョブを取得できませんでした。予備配信を送ります。"
    emit backup true ""
    exit 0
  fi
  HIT=$(printf '%s' "$JOBS" | python3 -c 'import json,sys; print(any(j.get("name") == "send-digest (primary)" and j.get("conclusion") == "success" for j in json.load(sys.stdin).get("jobs", [])))')
  if [ "$HIT" = "True" ]; then
    echo "run $ID で primary の送信が成功済みです。予備配信はスキップします。"
    emit backup false ""
    exit 0
  fi
done

echo "::warning::primary の送信が見つかりません。予備配信を即時に送ります。"
emit backup true ""
