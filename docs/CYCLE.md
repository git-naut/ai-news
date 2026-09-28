# 開発サイクル

緑で始めて緑で終える。赤いまま次の作業に入らない。1周は、変更、検査、逆テストの3段で回す。
周を閉じてよいのは、escaped 0、false_positive 0、素通り（LOOP-3）0 がそろったときだけ。

## 1周の手順

```bash
pnpm test && pnpm typecheck     # 実装そのもの
pnpm check --all                # 全系統。.state/gate.json を書く
pnpm check --mutate -j 8        # 逆テスト。.state/gaps.json を書く
pnpm check --all                # gaps.json を読んだ loop 系統まで緑か
```

`pnpm check` だけなら speed が fast の系統を回す。`--only sec,loop` で系統を絞れる。
`--json` は報告を JSON で出し、`--no-write` は gate.json を書かない。終了コードは
0 が緑、1 が赤、2 が使い方の誤り。

`--mutate` と `--all` は同時に走らせない。どちらも .state/ に書き、loop 系統は
書きかけの gaps.json を読むことになる。1回の呼び出しで両方を指定すると 2 で止まる。
別の端末で逆テストが走っているあいだは、.state/mutate.lock を見て書き込みつきの検査も
2 で止まる。

## 逆テストの中身

`--mutate` は作業ツリーのファイル一覧を os.tmpdir() の下のサンドボックスへ複製する。
一覧は `git ls-files --cached --others --exclude-standard` で取る。node_modules は
元の場所を symlink で借りる。
/mnt/c の下には作らない。複製が遅く、変異ごとの作り直しが所要の大半になる。

まず系統ごとに1回、壊していない複製で検査を走らせる。これが基準。次に変異ごとに
基準を複製し直して1か所だけ壊し、その変異の系統を走らせる。判定は検査 ID ごとの
不合格件数の増分で見る。

判定は5つある。caught は期待した検査が増えたこと。期待が `NONE` の変異なら、どの検査も
増えなかったことを指す。escaped は期待した検査が増えなかったこと。false_positive は
`NONE` の変異でどれかの検査が増えたことで、検査が過敏という意味になる。na は変異を
当てる対象が無かったことで、捕捉とすり抜けのどちらにも数えない。error は変異の適用か検査の
実行が落ちたことで、すり抜けとは分けて出す。

escaped、false_positive、error のうち、tools/check/policy.json で取り下げていないものが
.state/gaps.json に残る。このとき終了コードは 1 になる。次の `pnpm check --all` では
LOOP-2 が赤にする。

## 赤いときの読み方

出力の `→` が直し方。検査 ID で docs/LESSONS.md を引くと、なぜその検査があるのかが
書いてある。`SEC-X` のように末尾が X の不合格は、検査そのものが落ちている。
歯が無いのではなく動いていないので、検査のコードを直す。

## すり抜けか誤検知が出たとき

順番を守る。

1. まず基準を疑う。狙いの検査が基準で既に赤いと、増分 0 の「反応なし」に見える。
   逆テストの reason に「基準で既に … 件赤い」と出ていたら、基準の赤を先に片づける。
2. docs/LESSONS.md に節を足す。頭に `<!-- L:XXX-NNN family=... check=... mutation=... -->` を置く。
3. 検査を tools/check/families/ に足すか、直す。
4. 変異を対で足す。1本は捕まえるべき壊し方で、期待にその検査 ID を書く。
   もう1本は `NONE` で、その検査が見ていない軸を動かす。同じ軸で書くと単なる境界値になり、
   過敏さを測れない。
5. `pnpm check --mutate -j 8` を回し直し、escaped と false_positive が 0 になるまで繰り返す。

どうしても塞がない穴は取り下げる。tools/check/policy.json の `mutations.accepted` に
変異 ID と理由を書く。その変異を参照する節も docs/LESSONS.md に足す。理由が空なら LES-5、節が無ければ
LES-6 で落ちる。

## 変異の表を腐らせない

tests/tools/mutations-table.test.ts が `pnpm test` のたびに表を見る。見るのは ID の重複、
実在しない期待、前提ファイルの欠けの3つ。加えて、系統ごとに捕まえる変異と `NONE` の変異が
1本ずつそろっているかを見る。逆テストを回さなくても、表とコードのずれはここで分かる。
