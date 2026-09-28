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
