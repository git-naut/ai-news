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

毎朝の配信は cron-job.org から GitHub Actions を起動している。2026-03-30 から 06-22 まで 85 日間は
欠けなく届き、06-23 から1本も届いていない。止まる前に失敗が続いた形跡は GitHub 側に無い。
GitHub から見えるのは届いた起動だけで、401 で拒まれた呼び出しは実行として残らない。
原因の確定は cron-job.org の履歴を見るまで保留している。

cron-job.org の既定では、失敗の通知も応答の本文の保存もオフで、失敗が 25 回を超えるとジョブを止める。
PAT が切れたなら、7 月中旬にジョブが黙って止まった形になる。気づけたのは受信箱にメールが無いことだけで、
backup が送れない欠陥（WF-001）と重なって 3 か月見過ごした。いまは backup が件名に印を付けて送るので、
primary が止まった翌日には気づける。

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

## ワークフローの版と実行環境

<!-- L:WF-013 family=wf check=WF-7 mutation=m_wf_009 -->
### 浮動タグ v4 は node20 のまま残っている

actions/checkout と setup-node は v5 から、pnpm/action-setup は v6 から node24 で動く。
pnpm/action-setup の v4.4.0 のリリースノートには「Node.js 24 へ更新」とある。それでも浮動タグ `v4` の
action.yml は node20 のままだった（2026-09-29 に gh api で確認）。リリースノートでなく
action.yml の `runs.using` を見て下限を決め、WF-7 に表として持たせた。

<!-- L:WF-014 family=wf check=WF-8 mutation=m_wf_010 -->
### ubuntu-latest は移行の時期を選ばせてくれない

2026-10-19 から 11-19 にかけて ubuntu-latest が 26.04 に切り替わる（runner-images #14748）。
全ジョブを ubuntu-24.04 に固定し、26.04 への移行は別の作業として自分で決める。WF-8 は
runs-on が `ubuntu-XX.YY` の形であることを見る。

<!-- L:WF-015 family=wf check=WF-9 mutation=m_wf_011 -->
### pnpm の版は packageManager に一本化する

pnpm/action-setup v6 は、with.version と package.json の packageManager が文字列で一致しないと
失敗する。`version: 10` と `pnpm@10.34.5` でも落ちる。with.version を外し、packageManager に
CI で解決されていた 10.34.5 を書いた。手元の pnpm 10.32.1 もこの指定を読んで 10.34.5 に切り替わった。

<!-- L:WF-016 family=wf mutation=m_none_010 -->
### ステップ名の言い換えで WF-7 と WF-9 が反応しないこと

見るのは uses と with だけ。表示名は人のためのもの。

## LLM（BytePlus ModelArk）

<!-- L:LLM-001 family=wf check=WF-10 mutation=m_wf_012 -->
### env.ts が必須にした変数は、ワークフローが渡さないと起動直後に落ちる

LLM を Gemini から ModelArk へ移すと、必須の変数が GEMINI_API_KEY から ARK_API_KEY と
ARK_BASE_URL に変わる。env.ts だけを直してワークフローを直し忘れると、import の時点で zod が
例外を投げ、その日は1通も送れない。vitest は env.ts を読み込まないので気づけない。
WF-10 は env.ts の `z.` で始まり default と optional を持たない鍵を集め、送信ステップの env に
すべてあることを見る。

<!-- L:LLM-002 family=wf check=WF-3 mutation=m_wf_013 -->
### ModelArk の鍵はリージョンで分かれている

ap-southeast-1 で発行した鍵を eu-west の呼び出し口に投げると 401 になる。呼び出し口は秘密ではないので
ワークフローに直接書き、WF-3 が ap-southeast の URL であることを見る。

<!-- L:LLM-003 family=unit check=UNIT-1 mutation=m_unit_005 -->
### 閉じた JSON でも finish_reason=length なら採らない

切れた応答の多くは JSON のパースで落ちるので、長さの判定を消してもテストは緑のままだった
（逆テストを書く前に、同じ経路で予備モデルへ回ることに気づいた）。上限でちょうど閉じた応答は
パースを通り、件数が足りないまま採られる。JSON として正しく閉じた応答に length を付けたテストを
足し、判定そのものに歯を立てた。

<!-- L:LLM-004 family=unit check=UNIT-1 mutation=m_unit_006 -->
### seed-2-0 系は思考を止めないと遅く高くなる

既定では思考が出力トークンに載る。`thinking: {type: "disabled"}` で止め、2026-09-29 の実測では
reasoning_tokens が 0、5 件の要約が 4.2 秒だった。

<!-- L:LLM-005 family=unit check=UNIT-1 mutation=m_unit_007 -->
### 1 バッチの失敗を全件に広げない

旧実装は `Promise.all` でバッチを並べたので、1 本が落ちると全件がフォールバックの抜粋になった。
いまは直列で回し、失敗したバッチの記事だけ summary を null のまま残す。

<!-- L:LLM-006 family=dep check=DEP-3 mutation=m_dep_004 -->
### サポートが終わった SDK を依存に戻さない

@google/generative-ai は 2025-11-30 にサポートが終わった。Gemini は新旧の SDK とも外した。
DEP-3 は入れない依存の表を持ち、package.json のどの区分にも無いことを見る。

<!-- L:LLM-007 family=unit mutation=m_none_011 -->
### ログの言い換えで unit が反応しないこと

テストはモデルと出力形式の並びを見る。ログの文面では赤くならない。

<!-- L:LLM-008 family=ops -->
### Gemini から離れた理由（2026-09-29 の実測）

手元のキーのプロジェクトは前払い課金の残高が 0 で、3.8 Flash と 3.5 Flash-Lite は 402 を返した。
2.5 系は素の REST なら 200 だったが、@google/genai 2.24.0 からは 404「新規ユーザーには提供しない」を
返した。送り先の URL は同じだった。違いを突き止める前に 429 で止まり、原因は確定していない。
短時間に 12 回ほど叩いたのが 429 の引き金と見ている。実機で確かめるときは間隔を空け、条件を
1 つずつ変える。ModelArk の lite-260428 と 260228 は構造化出力で 200 だった。

<!-- L:OPS-004 family=ops -->
### worktree のエージェントは本体の node_modules を共有している

並列の修正エージェントは node_modules を本体から symlink している。本体で `pnpm add` や
`pnpm remove` を打つと、別の worktree のテストと型検査から依存が消える。2026-09-29 に旧 SDK を
2 回消してしまい、その都度 lockfile から入れ直した。エージェントが走っている間は依存を変えない。

## 段3 の既知バグ（2026-09-29、並列の修正と敵対的な検証）

<!-- L:UNIT-101 family=unit check=UNIT-1 mutation=m_unit_101 -->
### 1記事の壊れたリンクがフィード全体を道連れにする

相対リンクや `http://[::1` のような壊れたリンクを1件含むフィードは、記事が1件も配信されなかった。normalizeItem の `new URL(url).origin` が例外を投げ、fetchFeed がそれをフィード単位の try/catch で受けて空配列を返していたのが原因。
記事単位の正規化関数は例外を投げない約束にした。resolveLink で `new URL(link, base)` を try/catch で包み、解決できないリンクと http(s) 以外のリンクはその記事だけ null にする。相対リンクは第3引数 baseUrl（省略時は source.url）で絶対 URL に直す。元から絶対 URL のものは記事 ID が変わらないよう表記をそのまま残す。
fetcher.ts のループ内に try/catch を足す案は採らなかった。呼び出し側ごとに守りを書くと、次に normalizeItem を使う箇所で同じ穴が開くため。

<!-- L:UNIT-102 family=unit mutation=m_none_101 -->
### normalizeItem のコメントは UNIT が見ない軸

UNIT はテストの合否と型だけを見る。相対リンクの説明コメントを言い換えても振る舞いは変わらないので、捕まらないのが正しい。

<!-- L:UNIT-111 family=unit check=UNIT-1 mutation=m_unit_111 -->
### テキストメールのテンプレートにも Handlebars の HTML エスケープがかかる

AT&T's "GPT" <beta> という題の記事が、テキストメールでは AT&amp;T&#x27;s &quot;GPT&quot; &lt;beta&gt; の形で届いていた。
digest-text.hbs も digest.hbs と同じ Handlebars.compile(source) で組まれていた。そのため {{ }} の既定のエスケープがプレーンテキストにもかかっていた。
直し方として、template-engine.ts の PLAIN_TEXT_TEMPLATES に名前を載せたテンプレートだけを noEscape: true で組むようにした。HTML 版は既定のエスケープのままで、<script> は実体参照で残る。これはテストで固定してある。
各変数を triple-stash {{{ }}} で書く案は採らなかった。テキスト側に項目を足すたびに書き忘れると同じ欠陥が戻り、その差分はレビューでも目に入りにくい。
名前の末尾が -text かどうかで決める案も見送った。HTML のテンプレートに誤ってその名前を付けただけで XSS 対策が外れてしまうので、明示した名前だけを外す形にしている。

<!-- L:UNIT-112 family=unit mutation=m_none_111 -->
### PLAIN_TEXT_TEMPLATES の説明コメントは UNIT の監視対象外

UNIT が見るのは vitest の合否と tsc の型だけで、JSDoc の文言が変わっても実行結果は同じになる。そのため、この変異を捕まえないのが正しい。

<!-- L:UNIT-121 family=unit check=UNIT-1 mutation=m_unit_121 -->
### URL の正規化でクエリを丸ごと捨てると別記事が1件に潰れる

`news.ycombinator.com/item?id=1` と `?id=2` が同じ記事として重複除去され、片方が配信から消えていた。normalizeUrl が utm を外すつもりで search を空にし、さらに URL 全体を小文字にしていたのが原因。HN の id や YouTube の v のように、クエリ自体が記事を識別するサイトがある。パスの大小を区別するサイトもある。
直し方として、小文字にするのはスキームとホストだけにした。クエリからは utm_* と fbclid、gclid、mc_cid、mc_eid、ref、ref_src だけを外し、残りはキー順に並べる。
逆に「残すパラメータ」を許可リストで持つ案は採らなかった。未知のサイトが来るたびに潰れる側へ倒れ、今回と同じ欠落を黙って起こすからだ。外す側を列挙すれば、漏れても重複が1件残るだけで済む。

<!-- L:UNIT-122 family=unit mutation=m_none_121 -->
### normalizeUrl のコメントは UNIT の見ていない軸

UNIT はテストの合否と型だけを見る。組み立て直前のコメントを言い換えても挙動は変わらないので、捕まえないのが正しい。

<!-- L:UNIT-131 family=unit check=UNIT-1 mutation=m_unit_131 -->
### 英字キーワードを includes() で探すと storage の中の rag を拾う

classifyArticle は小文字化した本文に includes() を当てていた。そのため storage や average の rag、google の go、rapid の api、iso3 の o3 がそれぞれカテゴリを決めていた。語の途中に同じ綴りが現れることを部分一致は区別できない。
ASCII だけのキーワードは前後が英数字でない位置でのみ一致させ、c++ や gpt-5 の記号は退避してから正規表現に埋め、末尾の複数形 s は許した。日本語を含むキーワードは語の境界が決まらないので部分一致のまま残している。
\b を使う案は採らなかった。c++ のように記号で終わるキーワードでは \b が効かず、日本語の直後に英字が続く「RAGを使う」でも境界の扱いが揺れるため、英数字の否定先読みと後読みで書いた。

<!-- L:UNIT-132 family=unit mutation=m_none_131 -->
### 退避処理のコメントは UNIT の見る軸ではない

UNIT はテストの合否と型だけを見る。matchesKeyword のコメントを言い換えても振る舞いは変わらないので、捕まえてはいけない。

<!-- L:UNIT-141 family=unit check=UNIT-1 mutation=m_unit_141 -->
### 配信時刻を起動時に決めると、待った分だけ件名の時刻がずれる

UTC 23:45 に起動して 00:00 まで待つ primary の件名と本文が、09:00 JST に届いたのに「08:45 JST」と表示していた。
src/index.ts が main の先頭で formatJstDate(new Date()) を呼んでおり、取得、要約、SEND_AT_UTC の待ちの前の時刻が残っていた。
修正では待ちを先に computeSendDelay で求め、plannedSendTime(now, delay) が返す時刻でテンプレートと件名を描く。plannedSendTime は純関数として切り出し、23:45:10Z に 14 分 50 秒を足すと 09:00 JST になることをテストで押さえた。
先に待ってから描画する案も考えたが、採らなかった。main の順番を入れ替えるだけでは単体テストに載らず、同じずれが戻っても誰も気づけない。

<!-- L:UNIT-142 family=unit mutation=m_none_141 -->
### plannedSendTime の説明コメントは UNIT の監視対象ではない

UNIT が見ているのはテストの合否と型だけで、JSDoc の言い回しを変えても挙動は変わらない。ここで検査が落ちたら、検査がコメントに依存しているということになる。

<!-- L:UNIT-151 family=unit check=UNIT-1 mutation=m_unit_151 -->
### 取得窓を取得元ごとに直書きすると片方だけ週末分を落とす

RSS は 36 時間、NewsData は 24 時間と別々に書かれていた。そのため月曜朝の配信では、NewsData から来た土日の記事だけが一件も残らなかった。
36 時間という値は週末の取りこぼしを防ぐために決めたもので、その理由は fetcher.ts のコメントにしか残っていなかった。client.ts を書いた側はこのコメントを見ていなかった。
src/config/lookback.ts に LOOKBACK_HOURS と isWithinLookback を置き、両方の取得元がこれを読むように変えた。テストでは 30 時間前の記事が両方で残り、40 時間前の記事が両方で落ちることを確かめる。
取得元ごとに窓の長さを引数で渡す案も考えたが採らなかった。値を分けられる形にすると、今回と同じずれを再び書けてしまうからだ。

<!-- L:UNIT-152 family=unit mutation=m_none_151 -->
### LOOKBACK_HOURS の説明コメントは UNIT の監視対象外

UNIT はテストの合否と型だけを見る。36 時間を選んだ理由を書いたコメントを言い換えても、どの結果も変わらない。

<!-- L:UNIT-161 family=unit check=UNIT-1 mutation=m_unit_161 -->
### 語の境界を厳密にすると、長い語の派生形を取りこぼす

storage の中の rag を拾わないよう、英字キーワードを語の境界で照合した。すると agentic・gpt4o・llama3・
llamaindex が agent・gpt・llama に当たらなくなった（検証役が見つけた）。4 文字以下の語は後ろに英字が
続けば一致させず、数字は許す。数字で終わる語（gpt-5、o3）は後ろの数字も許さない。英字で終わる
5 文字以上の語は前方一致にした。

<!-- L:UNIT-162 family=unit check=UNIT-1 mutation=m_unit_162 -->
### 相対リンクの基準は XML の置き場所ではなくサイトの link

normalizeItem に基準の引数を足しても、呼び出し側の fetcher が渡していなかった。Anthropic の
フィードは raw.githubusercontent.com にあり、そこを基準にすると存在しない URL になる。fetcher の
テストに、XML とサイトが別ホストのフィードを足してから直した。

<!-- L:UNIT-163 family=unit check=UNIT-1 mutation=m_unit_163 -->
### テキスト版のエスケープを外す修正は、HTML 側の歯も要る

HTML のエスケープを守るテストは修正前から緑なので、テキスト版の変異だけでは HTML 側の退行を
捕まえられるか分からない。平文のテンプレートの集合に digest を足す変異を置いた。

<!-- L:UNIT-164 family=unit check=UNIT-1 mutation=m_unit_164 -->
### 取得窓は境界の値で固定する

30 時間と 40 時間の記事だけで確かめていたので、31〜39 のどれにしてもテストが通った。36 時間
ちょうどを内側、1 ミリ秒古いものを外側とするテストで固定した。

<!-- L:UNIT-165 family=unit mutation=m_none_161 -->
### fetcher のコメントの言い換えで unit が反応しないこと

UNIT はテストの合否と型だけを見る。

## Hacker News（hnrss から Algolia へ）

<!-- L:HN-001 family=unit check=UNIT-1 mutation=m_unit_171 -->
### HN の検索はタイトルに限り、表記ゆれを許さない

Algolia の query は既定でタイトル・URL・本文・投稿者名に当たり、タイポも許す。2026-09-29 の実測では
LLM が「Have an LLC」に、Grok が無関係な記事に当たった。`restrictSearchableAttributes=title` と
`typoTolerance=false` を付けると、LLM の結果は正しい1件だけになった。

<!-- L:HN-002 family=unit check=UNIT-1 mutation=m_unit_172 -->
### Ask HN には url のキーが無い

値が無いときは null ではなくキーごと省かれる。url の無い投稿は `news.ycombinator.com/item?id=` の
ページを URL にし、story_text の HTML を剥がして本文にする。

<!-- L:HN-003 family=unit check=UNIT-1 mutation=m_unit_173 -->
### 1 本の検索の失敗を HN 全体に広げない

hnrss.org では 5 本中 4 本が 502 やタイムアウトになる日があった（同じ日に 200 を返したこともある）。
Algolia でも検索 1 本ごとに失敗を閉じ込め、他の検索の記事は残す。

<!-- L:HN-004 family=unit check=UNIT-1 mutation=m_unit_174 -->
### HN の取得窓も LOOKBACK_HOURS を読む

取得元ごとに窓を直書きすると、RSS と NewsData で起きた食い違いが HN でも起きる。
URL のテストで `created_at_i>` の値まで固定した。

<!-- L:HN-005 family=unit mutation=m_none_171 -->
### HN の失敗ログの言い換えで unit が反応しないこと

UNIT はテストの合否と型だけを見る。

<!-- L:HN-006 family=unit -->
### GET に body を付けると fetch が例外を投げる

HN のクライアントで、呼び出し口の型に合わせて GET に空文字の body を渡しかけた。本物の fetch は
GET や HEAD に body があると TypeError を投げるが、偽の fetch を使うテストは通ってしまう。型の body を
省略可能にし、GET では渡さない。型を変えたら、tests/ の型検査が偽の fetch のずれを捕まえた。

## 文書

<!-- L:DOC-001 family=doc check=DOC-1 mutation=m_doc_001 -->
### README の本数は取得元を足し引きしても追いつかない

3 月の README は「TechCrunch など 10 ソース」と書いたまま、実物は 13 本になっていた。そこに TechCrunch は無い。
DOC-1 は README の「RSS N 本」と「Hacker News の検索 N 本」を、feeds.ts と hn/client.ts の配列の件数と比べる。

<!-- L:DOC-002 family=doc check=DOC-1 mutation=m_doc_004 -->
### HN の本数も README と突き合わせる

hnrss から Algolia へ移したように、HN の検索は RSS と別の場所で増減する。

<!-- L:DOC-003 family=doc check=DOC-2 mutation=m_doc_002 -->
### モデルを替えたら README も替える

3 月の README は Gemini の無料枠を前提に書かれ、LLM を移した後も残っていた。DOC-2 は client.ts の
主と予備のモデル ID が README にあることを見る。

<!-- L:DOC-004 family=doc check=DOC-3 mutation=m_doc_003 -->
### README の Secrets の一覧はワークフローと集合で一致させる

一覧から漏れた Secret は登録し損ね、起動直後に zod が落ちる。逆に、使っていない Secret が残ると
消してよいかが分からない。DOC-3 は送信ジョブが読む `secrets.*` の集合と、README の一覧の集合を比べる。

<!-- L:DOC-005 family=doc mutation=m_none_012 -->
### Secrets の一覧の並び替えで DOC-3 が反応しないこと

DOC-3 は集合で比べる。並び順は見ていない軸。

<!-- L:CHK-016 family=unit check=UNIT-1 -->
### 変異の表の健全性テストは、変異が増えるほど遅くなる

beforeAll で変異のモジュールを全部読み込む。72 本のとき、単独では 3.6〜4.0 秒だった。unit 系統が
vitest と tsc 3 本を同時に走らせる中では、既定の 10 秒を超えて「テストファイルが読み込めません」になった。
テストの中身ではなく時間制限の問題なので、上限を 60 秒にした。単独で流して通るのに検査の中だけで
落ちるときは、まず負荷と時間制限を疑う。

<!-- L:OPS-005 family=ops -->
### 使わなくなった Secret は参照を全部調べてから消す

GEMINI_API_KEY を消す前に、残っている全リモートブランチの .github と src を git grep で調べた。
main と作業中のブランチは 0 件で、マージ済みの 2 本（feat/check-harness、fix/backup-send）に 4 件ずつ
残っていた。schedule と cron-job.org の起動は main からしか走らないので影響は無い。さらに、直前の実送信が
GEMINI を読まないコミットで成功していること、Environment の Secret が 0 件であることも確かめた。
キーそのものは Google 側で無効化していない。Windows の環境変数として他の作業場と共用している。

<!-- L:OPS-006 family=ops -->
### checkout を v7 に上げても keep-alive の push は通る

checkout は v6 から、認証情報を別のファイルに保存する。keep-alive は `git push` で空コミットを積む。
2026-09-29 に dispatch で1回動かし、push が通ることを確かめた（run 36499063838、e281c31 から e99f617）。


## 要約とメールの形（段4）

<!-- L:FMT-001 family=unit check=UNIT-1 mutation=m_unit_191 -->
### 試せるものが無い記事に空の「試す」行を出さない

要約を何が・差分・試すの 3 欄に分けた。試せるリポジトリや API が記事に無いことは多い。テンプレートで
欄の有無を見ないと、中身の無い「試す」の行が並ぶ。テキスト版と HTML 版の両方で、欄が空なら行ごと出さない。

<!-- L:FMT-002 family=unit check=UNIT-1 mutation=m_unit_192 -->
### strict の構造化出力は欄を省けないので、無いときは空文字で返る

json_schema の strict では required の欄を必ず埋めて返す。tryIt は「無ければ空文字」と指示し、受け取った
側で空白だけの値も null に直す。

<!-- L:FMT-003 family=unit check=UNIT-1 mutation=m_unit_193 -->
### 誇張の語はプロンプトで禁じ、受け取った後も数える

2026-09-29 の実機の要約に「最大の変更点」が出た。語の表を 1 か所（summary-lint.ts）に置き、プロンプトの
禁止と受け取った後の検査の両方が同じ表を読む。検査は配信を止めず、件数をログに出す。

<!-- L:FMT-004 family=unit check=UNIT-1 mutation=m_unit_194 -->
### 要約の 1 欄は 120 文字まで

1 カラムのメールで 2 行に収まる長さ。上限はプロンプトの指示と検査で同じ値を使う。

<!-- L:FMT-005 family=unit check=UNIT-1 mutation=m_unit_195 -->
### 見た目で隠れる二重持ちはテストで押さえる

要約がある記事にも抜粋を入れても、テンプレートの else で隠れて見た目は変わらない。変異を書く前に、
この形はどのテストにも捕まらないと気づき、要約のある記事の excerpt が null であるテストを足した。

<!-- L:FMT-006 family=unit mutation=m_none_191 -->
### HTML のコメントの言い換えで unit が反応しないこと

コメントは、メールの見た目とテストのどちらにも出ない。

<!-- L:CHK-017 family=ops -->
### 手の逆テストの道具が、本物の作業ツリーに変異を当てた

scratchpad の run.sh を相対パス（./run.sh）で呼んだ。複製先が相対パスになり、道具がリポジトリへ移った後の
`cd` が失敗した。そのまま本物のファイルに 6 本の変異を同時に書き込み、同じファイルに書いた 2 本は競合して
末尾に残りかすを残した。未コミットの作業があったので `git checkout` は使わず、変異を 1 本ずつ逆向きに戻した。
戻したことは、全変異の find の一意性の走査と全テストで確かめた。道具は複製先を絶対パスで決め、移動に失敗したら
止まり、/mnt/c の下では動かないようにした。実行の前後で作業ツリーのハッシュが同じことも確かめる。
本物の逆テスト（pnpm check --mutate）は最初から os.tmpdir() の下に作るので、この形は起きない。

## 取得元と 1 通の件数（段4）

<!-- L:SRC-101 family=unit check=UNIT-1 mutation=m_unit_181 -->
### 上限で切る前の並べ替えから段を外すと、新しいだけの記事が枠を埋める

1 通 30 件の選別は、段の順に並べてから公開日時の新しい順に並べる。段の比較を外しても関数は動き、
件数も 30 件のままなので、見た目では気づけない。実際には NewsData.io の直近の記事が英語の RSS と
Hacker News を押しのけ、公式ブログの発表が落ちる。テストでは段3 の記事を段1 より新しくして入れ、
段1 が先に残ることを確かめている。

<!-- L:SRC-102 family=unit check=UNIT-1 mutation=m_unit_182 -->
### 上限の slice は 1 つずれても誰も気づかない

slice(0, limit) の終わりが 1 つずれると、31 件目も要約に回る。LLM の呼び出しが 1 回増えるだけで、
ログと本文のどちらにも異常は出ない。35 件を入れて 30 件ちょうどが返ること、5 件なら 5 件のまま返ることの
両方をテストで固定した。

<!-- L:SRC-103 family=unit check=UNIT-1 mutation=m_unit_183 -->
### フィードの最新日時は取得窓で絞る前に取る

Anthropic の第三者フィードは 2025-11-24 で止まり、記事 0 件の日が 10 か月続いたが、配信は黙って続いた。
止まったフィードを見つけるには、各フィードの最新記事の日時を記録する。この日時を 36 時間の取得窓で
絞った後に取ると、週末に投稿が無いだけのフィードまで止まった扱いになり、警告が毎週出る。
fetcher.ts では取得窓の判定より前の行で最新日時を更新する。

<!-- L:SRC-104 family=unit check=UNIT-1 mutation=m_unit_184 -->
### 上限の値は関数のテストでは守れない

selectForDigest は上限を引数で受けるので、関数のテストは DIGEST_LIMIT が 30 でも 40 でも通る。
2026-09-29 に決めた 30 件は、src/config/digest.ts の定数を直接読むテストで固定した。
値を変えるときは、このテストを直すことが決定の記録になる。

<!-- L:SRC-105 family=unit mutation=m_none_181 -->
### 選別の段の説明コメントを言い換えても unit は反応しないこと

UNIT はテストの合否と型だけを見る。反応したら、テストがソースの文面を読んでいる過敏さを疑う。

<!-- L:SRC-106 family=unit check=UNIT-1 mutation=m_unit_196 -->
### 止まった取得元と失敗した取得元は受信箱で分かるようにする

取得元の状態をログに出すだけでは、誰も Actions のログを毎日は読まない。メールのフッターに
「取得元の状態」として、更新が止まった取得元（14 日以上）と取得に失敗した取得元を名前つきで出す。
問題の無い日は何も出さない。

<!-- L:SRC-107 family=unit mutation=m_none_192 -->
### 取得元の状態の説明コメントの言い換えで unit が反応しないこと

UNIT はテストの合否と型だけを見る。

<!-- L:FMT-007 family=unit check=UNIT-1 mutation=m_unit_198 -->
### 欄の空はバッチ単位でなく記事単位で扱う

zod で各欄を min(1) に縛っていたので、5 件のうち 1 件の change が空なだけでバッチ全体が検証に落ち、
予備モデルで 5 件を作り直していた。2026-09-29 の見本づくりで、2 回とも 1 バッチずつ起きた。
差として書けることが無い記事は実際にある。欄の空は記事ごとに読み、差分が空なら null にして行を出さない。

<!-- L:FMT-008 family=unit check=UNIT-1 mutation=m_unit_197 -->
### 何がの欄が空の記事は要約なしにする

何がの欄が空のまま要約ありとして残すと、中身の無いカードが並ぶ。その記事だけ要約なしにし、本文の
抜粋を出す。同じバッチの他の記事の要約は残す。

<!-- L:FMT-009 family=unit check=UNIT-1 mutation=m_unit_199 -->
### 差分の行も欄の有無を見て出す

試すの行と同じく、差分が null の記事では行ごと出さない。テキスト版と HTML 版の両方で見る。
