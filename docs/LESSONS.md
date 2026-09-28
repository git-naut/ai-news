# 教訓

踏んだ罠を1節ずつ書く。節の頭の印（HTML コメント）は `pnpm check` の lessons 系統が読む。
形は `<!-- L:系統略号-3桁 family=系統 check=検査ID mutation=変異ID -->` で、`check` と
`mutation` は省略できる。値にカンマは入らない。1つの印に検査は1つだけ書く。

印の `check` が tools/check/families/ と runner.ts に実在しなければ LES-3 で落ちる。
`mutation` が tools/check/mutations/ に実在しなければ LES-4 で落ちる。
変異を取り下げるときは tools/check/policy.json に理由を書き、この文書にその変異を
参照する節を足す（LES-5、LES-6）。

## 運用

<!-- L:OPS-001 family=ops -->
### cron-job.org からの起動が 2026-06-23 から途絶（原因は段0で確定）

毎朝の配信は cron-job.org から GitHub Actions を起動している。2026-06-23 を最後に
起動が届いていない。原因は段0の調査が確定させる。まだ検査は無い。確定したら
検査と変異をこの節の印に足す。

<!-- L:OPS-002 family=ops -->
### gh の有効アカウントは git-hub-nakano で、このリポジトリには書けない

手元の gh には git-hub-nakano と git-naut の2つがログインしていて、有効なのは前者。
`git push` と `gh pr create` は 403 で落ちる。`gh auth switch` は他の作業場にも効くので使わず、
コマンドの中だけ `GH_TOKEN=$(gh auth token -u git-naut)` を渡す。git の push は
`-c credential.helper=` で既存の資格情報を外し、同じトークンを返す helper を1回だけ挟む。

## ワークフロー

<!-- L:WF-001 family=wf check=WF-3 mutation=m_wf_003 -->
### backup は 20 分の timeout より長く待ち、3 か月一度も送れなかった

schedule 起動では `inputs.immediate` が空なので、旧コードは `SEND_AT_UTC=00:00` を入れた。
`src/index.ts` は目標を過ぎていたら翌日へ繰り越した。UTC 10 時に起動した backup は
約 14 時間待とうとし、`timeout-minutes: 20` で cancelled になった（9/28 の実行は 49302 秒）。
それ以前の success は、重複チェックでスキップしただけの 6〜10 秒の実行だった。

直したのは3か所。待機は `computeSendDelay` が上限（既定 20 分）を超える待ちを即時送信に
変え、翌日へは繰り越さない。backup は判定スクリプトが送信時刻を空にする。WF-3 は
送信ステップに `SEND_AT_UTC` と `SEND_MAX_WAIT_MINUTES` が渡っていることと、
timeout が上限に余裕 10 分を足した長さ以上であることを見る。取らなかった案は timeout を
延ばすだけの修正で、待ちが 14 時間あれば何分にしても足りない。

<!-- L:WF-002 family=wf check=WF-3 mutation=m_wf_004 -->
### 待機の受け渡しが消えても vitest は気づかない

`computeSendDelay` のテストは関数を直接呼ぶ。ワークフローの env から `SEND_AT_UTC` が
消えると、primary は待機を飛ばして 08:45 JST に届く。vitest は YAML を読まないので緑のまま。
配線は WF 系統で見る。

<!-- L:WF-003 family=wf check=WF-2 mutation=m_wf_002 -->
### 重複判定はジョブ名の文字列で primary の送信を探している

判定スクリプトは `send-digest (primary)` という名前のジョブが success かを見る。
名前はワークフローの `name: send-digest (${{ needs.check.outputs.kind }})` で決まる。
2つは別のファイルにあり、片方だけ直すと、primary が届いた日も backup が二通目を送る。
WF-2 は名前の形と、スクリプトの中でこの文字列を探す箇所がちょうど1か所であることを見る。

<!-- L:WF-004 family=wf check=WF-2 mutation=m_wf_008 -->
### 旧い重複判定は run の success を数えていた

run 単位の success には、重複チェックでスキップしただけの run も、手動のテスト送信も入る。
そのため「8 時間以内に success がある」は「送った」を意味しなかった。今は send-digest の
ジョブの conclusion を、primary の名前に限って見る。起点は現在以前で最も新しい UTC 23:35。
schedule は実測で 2〜12 時間遅れるので、固定の時間幅より起点のほうが外れない。

<!-- L:WF-005 family=wf check=WF-4 mutation=m_wf_005 -->
### GitHub Actions の式で空文字を返す `&& '' ||` は必ず右辺になる

2026-03-30 に `${{ inputs.immediate && '' || '00:00' }}` が常に `'00:00'` を返した。
`''` が falsy なため。WF-4 はワークフローの全ての式からこの形を探す。分岐はシェルか
ジョブの出力で行う。

<!-- L:WF-006 family=wf check=WF-1 mutation=m_wf_001 -->
### install で依存のスクリプトを走らせない

axios の乗っ取りを受けて `--ignore-scripts` を足した。CI と毎朝の実行の両方に要る。
WF-1 は全ワークフローの `pnpm install` に `--frozen-lockfile` と `--ignore-scripts` の
両方があることを見る。

<!-- L:WF-007 family=wf check=WF-5 mutation=m_wf_006 -->
### check ジョブの出力が空になると、種類も待機も黙って外れる

`needs.check.outputs.kind` が空だと、送信ジョブ名は `send-digest ()`、件名の印は既定の
manual になる。GitHub Actions は存在しないステップの出力を空文字で返し、エラーにしない。
WF-5 は3つの出力が `steps.decide.outputs.*` を指していることを見る。

<!-- L:WF-008 family=wf check=WF-6 mutation=m_wf_007 -->
### backup の分岐は simulate_schedule で手から通せる

schedule の実行を待つと、確かめるまでに半日かかる。`simulate_schedule=true` の dispatch は
判定スクリプトの backup の分岐を通る。2026-09-29 04:13 JST にこれで予備配信の実送信を確かめた
（run 36470686841、38 件、97.8 秒）。WF-6 は入力が消えていないことを見る。

<!-- L:WF-009 family=wf mutation=m_none_004 -->
### WF の捕まえてはいけない変異は、ステップ名・並び・説明文・ログの文面

WF-1 は run の中身、WF-3 は env の鍵、WF-6 は入力の有無と型、WF-2 は探す文字列の数を見る。
ステップ名、env の並び、入力の説明文、ログの文面はどれも見ていない軸なので、
m_none_004〜007 をそこに置いた。

<!-- L:WF-010 family=wf mutation=m_none_005 -->
### env の並び替えで WF-3 が反応しないこと

WF-3 は env を鍵で引く。並びを入れ替えて赤くなるなら、配列の添字で読んでいる。

<!-- L:WF-011 family=wf mutation=m_none_006 -->
### 入力の説明文の言い換えで WF-6 が反応しないこと

説明文は人が読むためのもの。WF-6 が文面に依存すると、表現を直すたびに赤くなる。

<!-- L:WF-012 family=wf mutation=m_none_007 -->
### 判定スクリプトのログの言い換えで WF-2 が反応しないこと

WF-2 はスクリプトの中の `"send-digest (primary)"` の数だけを数える。

## 依存

<!-- L:DEP-001 family=dep check=DEP-1 mutation=m_dep_002 -->
### package.json だけ版を固定すると frozen-lockfile で落ちる

2026-04-01 に axios を `1.13.6` に固定したが、lockfile の specifier は `^1.7.9` のまま
コミットされずに残っていた。scratchpad で `pnpm install --frozen-lockfile` を走らせると
`ERR_PNPM_OUTDATED_LOCKFILE` で exit 1。push していれば CI も毎朝の実行も落ちていた。
DEP-1 は pnpm を起動せず、区分ごとに名前の集合と specifier を突き合わせる。

<!-- L:DEP-002 family=dep check=DEP-1 mutation=m_dep_001 -->
### lockfile を作り直さずに package.json を触った状態

m_dep_002 と逆向きの食い違い。どちらの向きでも DEP-1 が落ちることを確かめる。

<!-- L:DEP-003 family=dep check=DEP-2 mutation=m_dep_003 -->
### 乗っ取り対策の固定は範囲指定に戻さない

`^1.13.6` は乗っ取られた新しい版を install で拾いうる。DEP-2 は固定しておく依存が
`x.y.z` の形であることを見る。変異は lockfile も揃えて書き換え、DEP-1 を巻き込まない。

<!-- L:DEP-004 family=dep mutation=m_none_008 -->
### dependencies の並び替えで DEP-1 が反応しないこと

pnpm は package.json の並びを保たないことがある。並びで赤くなる検査は使われなくなる。

## 秘密

<!-- L:SEC-001 family=sec check=SEC-2 mutation=m_sec_001 -->
### 鍵は .env 以外のファイルにも紛れ込む

README の設定例や、テストの fixture に本物の鍵を貼る事故がある。.env を無視しても
これは防げない。SEC-2 は次のコミットに入りうる全ファイルを読み、Google API キー
（`AIza` から始まる 39 文字）と GitHub のトークンの形を探す。

Gmail のアプリパスワードは英小文字4文字を空白区切りに4つ並べた形をしており、散文にも出る。
README に当てると誤検知が出るので、.env 系のファイルに限って探す。

変異 m_sec_001 は鍵の形を実行時に組み立てる。変異のファイルに直書きすると、そのファイル
自身が SEC-2 に当たり、基準の段階で赤くなる。

<!-- L:SEC-002 family=sec check=SEC-1 mutation=m_sec_002 -->
### .env を add すると、公開リポジトリでは数分で拾われる

.gitignore に書いてあっても `git add -f` や、.gitignore を書き換えた日の add で入る。
SEC-1 は .env、.env.local のような名前のファイルが一覧に入っていたら落とす。
.env.example のような空の雛形は許す。

逆テストのサンドボックスには .git が無い。一覧は木を歩いて作るので、置いたファイルが
そのまま「追跡される」扱いになる。m_sec_002 はこれを使って .env を置く。

## 検査そのもの

<!-- L:CHK-001 family=loop check=LOOP-3 mutation=m_les_006 -->
### 対象0件の緑は、検査が働いた結果ではない

dev/google の loop.py は primary を宣言しておらず、素通り判定が一度も効かなかった。
入口の数も定数で書いていて、実際に数えていなかった。同じ作業場の textlint の包みは
渡したファイルのうち1本目しか見ていなかった。どれも緑のまま気づけない形をしている。

ここでは各結果が `primary` を宣言し、その件数が 0 のまま緑なら runner が LOOP-3 を足す。
sec は読んだファイル数、lessons は教訓の数、loop は変異の本数を実際に数える。

<!-- L:CHK-002 family=sec mutation=m_sec_003 -->
### 落ちた検査を「歯が無い」と読まない

dev/google の gas.py は未束縛の変数で検査ごと落ちていた。逆テストはそれを「どの検査も
反応せず」と読み、すり抜けと誤診した。直す場所は検査の強さではなく、検査の不具合だった。

runner は系統が例外を投げたら `<接頭辞>-X` の不合格にする。系統は1本ずつ遅延 import
するので、構文エラーも同じ扱いになる。逆テストは、検査のプロセスが JSON を返さなければ
escaped ではなく error と判定する。m_sec_003 は sec の検査に例外を仕込み、SEC-X が
出ることを確かめる。

<!-- L:CHK-003 family=sec mutation=m_none_001 -->
### 過敏さも同時に測る

捕まえる力だけを上げると、意味を変えない書き換えでも赤が出る検査になる。直すたびに
赤が出れば、やがて誰も走らせない。明細管理システムの作業場で、捕まえてはいけない
変異（期待 `NONE`）を混ぜる形が入った。反応したら false_positive と判定する。

置き場所が要点。その検査が見ていない軸を動かす。sec は鍵の形を見るので、
.env.example のコメントの言い回しを変える。同じ軸で書くと単なる境界値になり、
過敏さを測れない。

<!-- L:CHK-013 family=lessons mutation=m_none_002 -->
### 印は散文から拾わない

lessons 系統が読むのは HTML コメントの印だけ。本文に `check=` のような語が出ても
印ではない。m_none_002 は印の属性に似た語を含む段落を足し、どの検査も反応しない
ことを確かめる。

<!-- L:CHK-004 family=lessons check=LES-2 mutation=m_les_001 -->
### 教訓の ID が重複すると、参照が別の節を指す

ID は `[A-Z]+-\d+` の形で、桁数は縛っていない。3桁で揃える。並べ替えたときに
順序が崩れないため。重複は LES-2 が落とす。

<!-- L:CHK-005 family=lessons check=LES-3 mutation=m_les_002 -->
### 検査を消すと、その検査を指す教訓が宙に浮く

実在する検査 ID は tools/check/families/*.ts と runner.ts の文字列リテラルから集める。
変異のファイルは数えない。数えると、実在しない検査を期待する変異がその ID を実在に
してしまう。

<!-- L:CHK-006 family=lessons check=LES-4 mutation=m_les_003 -->
### 変異を消すと、その変異を指す教訓が宙に浮く

変異 ID は tools/check/mutations/m_*.ts の `id:` から集める。変異が1本も無くても
LES-4 は素通りさせない。無いのに教訓が変異を主張している状態が食い違い。

<!-- L:CHK-007 family=lessons check=LES-5 mutation=m_les_004 -->
### 取り下げには理由が要る

すり抜けた変異を tools/check/policy.json の `mutations.accepted` に入れると、LOOP-2 は
その変異を数えなくなる。理由が空なら、後から誰も判断を見直せない。LES-5 が落とす。

<!-- L:CHK-008 family=lessons check=LES-6 mutation=m_les_005 -->
### 取り下げには教訓が要る

理由の一行だけでは、なぜその穴を塞がないのかが残らない。取り下げた変異を参照する節が
この文書に無ければ LES-6 が落とす。

<!-- L:CHK-009 family=loop check=LOOP-2 mutation=m_loop_001 -->
### すり抜けは gaps.json に残り、次の検査を赤にする

`pnpm check --mutate` は escaped、false_positive、error のうち取り下げていないものを
.state/gaps.json に書く。loop 系統はそれが1件でも残っていれば LOOP-2 で赤にする。
逆テストを回した直後だけでなく、次に `pnpm check --all` を回したときにも赤が見える。

<!-- L:CHK-010 family=loop mutation=m_none_003 -->
### gaps.json を書いた後の取り下げも効く

gaps.json は書いた時点の policy で絞ってある。その後に取り下げを足すこともあるので、
loop 系統は読むときにも policy で除く。m_none_003 は取り下げ済みの変異だけが残った
gaps.json を置き、LOOP-2 が反応しないことを確かめる。

<!-- L:CHK-011 family=loop -->
### すり抜けが出たら、まず基準を疑う

判定は基準実行からの増分で見る。狙いの検査が基準で既に赤いと、同じ場所を指す不合格が
1件にまとまる検査では、増分 0 の「反応なし」に見える。検査を強くする前に、基準の
件数を見る。逆テストの reason は、基準で既に赤い検査があればそう書く。

<!-- L:CHK-014 family=ops -->
### リポジトリの中の worktree のテストを vitest が拾う

サブエージェントの worktree は `.claude/worktrees/` に作られる。vitest の既定の除外は
`.claude/` を含まないので、本体の `pnpm test` が別ブランチのテストまで回し、11 ファイルの
はずが 19 ファイルと出た。件数が合わないことで気づいた。`vitest.config.ts` の `include` を
`tests/**/*.test.ts` に限り、`.gitignore` に `.claude/worktrees/` を足した。

<!-- L:CHK-015 family=ops -->
### 目標ちょうどの境界を動かす変異は等価で、すり抜けても穴ではない

`computeSendDelay` の `target < now` を `<=` にすると、目標ちょうどのとき翌日へ繰り越す。
待ちは 24 時間になり、上限（最大 60 分）を超えるので結果は 0 のまま。どの入力でも
挙動が同じ等価変異なので、手作業の逆テストで escaped と出ても検査は足さなかった。
等価かどうかは、上限が 24 時間未満であることに依存する。上限の範囲を広げるときは見直す。

## テストと型

<!-- L:UNIT-001 family=unit check=UNIT-1 mutation=m_unit_001 -->
### 待機の上限は、テストが落ちることで守る

`computeSendDelay` の上限を外すと、3 か月の欠配と同じ形に戻る。unit 系統は vitest を JSON で
走らせ、落ちたテスト1件を不合格1件として返す。終了コードではなく件数を返すので、
逆テストの増分判定がそのまま効く。1 回 35 秒前後かかるため slow 系統にした。

<!-- L:UNIT-002 family=unit check=UNIT-1 mutation=m_unit_002 -->
### 重複判定は、送信ジョブの結論まで見る

cancelled や skipped の primary を送信済みに数えると、欠配の日に予備が出ない。
判定スクリプトは偽の gh を PATH に置いたテストで分岐ごとに走らせている。

<!-- L:UNIT-003 family=unit check=UNIT-1 mutation=m_unit_003 -->
### 予備配信の印は件名のテストで守る

印が消えると、primary が届かなかった日を受信箱で見分けられない。
2026-09-29 の予備配信は、宛先の個人 Gmail に届いていた。

<!-- L:UNIT-004 family=unit check=UNIT-2 mutation=m_unit_004 -->
### tests/ の型は誰も検査していなかった

ルートの tsconfig.json は `include: ["src/**/*.ts"]` で、tests/ を除外していた。
tests/tsconfig.json を作って typecheck と unit 系統の両方にかけた。初回の型エラーは 0 件だった。
0 件が素通りでないことは `--listFilesOnly` で確かめた（src 19 本、tests 11 本）。

<!-- L:UNIT-005 family=unit mutation=m_none_009 -->
### コメントの言い換えで unit が反応しないこと

UNIT はテストの合否と型だけを見る。コメントや説明文で赤くなるなら、テストが文面に依存している。

<!-- L:OPS-003 family=ops -->
### 宛先は送信元と同じ個人の Gmail

.env では GMAIL_USER と RECIPIENT_EMAIL が同じ個人の @gmail.com になっている。
2026-09-29 に「届いていない」と見えたのは、別の受信箱（会社の Workspace）を探していたため。
配信の確認は宛先の受信箱で `in:anywhere subject:予備配信` のように探す。
