---
id: T009
title: 数字「8」の書き順方向を反転補正する
status: done        # todo | in_progress | review | redo | done | blocked
assignee: implementer  # implementer | tester | reviewer | codex
attempts: 1
---

# T009: 数字「8」の書き順方向を反転補正する

## 目的

数字「8」のお手本アニメとなぞり判定の進行方向が、日本で一般的に教える書き方と逆になっている(ユーザー報告)。データ生成ツールに文字別の「ストローク反転」補正を追加し、「8」の1画目を逆走させて `src/data/strokes.json` を再生成する。

## 背景・コンテキスト

- このアプリは KanjiVG の SVG (`tools/kanjivg-cache/*.svg` にキャッシュ済み) を `tools/build-strokes.mjs` で変換し、`src/data/strokes.json` を生成する(`npm run data` で実行。キャッシュがあるのでネットワーク不要)。
- `strokes.json` は文字ごとに `strokes`(SVG パス `d` 文字列の配列。お手本アニメの描画に使用)と `medians`(各パスを等間隔 32 点でサンプリングした点列。判定エンジン `src/lib/matcher.ts` が「正解の始点・向き」として使用)を持つ。viewBox は `0 0 109 109`。
- `build-strokes.mjs` の構造: `extractStrokeDs()`(57-76 行付近)が SVG から `d` を文書順に抽出し、`sampleMedian()`(83-93 行付近)が `svg-path-properties` の `getPointAtLength` で `d` から medians を生成する。
- 調査の結果、「8」の逆回りは KanjiVG の元データ由来(変換バグではない)。`npm run data` を再実行しても直らないため、ビルド時の補正が必要。
- 現在の「8」(1画): `d` は `M82.19,31.68c...` で始まる相対 cubic (`c`) の連続。始点 (82.19, 31.68)・終点 (83.50, 37.32)。この軌跡は「右上→対角線で左下→下の弧→対角線で左上→上の弧→右上で閉じる」という順。**これを丸ごと逆走(終点だった (83.50, 37.32) から始めて始点だった (82.19, 31.68) で終わる)にすると、日本式の「右上から上のループを反時計回りに描き、中央を横切って下のループを時計回りに描いて戻る」書き方になる。**

## 変更対象

- `tools/build-strokes.mjs` — 文字別ストローク反転の補正処理を追加
- `src/data/strokes.json` — `npm run data` による再生成物(コミット対象)

## 要件

1. `tools/build-strokes.mjs` に、SVG パス `d` 文字列を逆走パスに変換する関数 `reversePathD(d)` を追加する。
   - 入力は `M x,y` の後に cubic ベジェコマンド(相対 `c` / 絶対 `C`、複数座標組の連続指定も可)が続く KanjiVG 形式のパス。
   - 実装方針: パスを絶対座標の cubic セグメント列 `[P0, C1, C2, P3]` にパースし、セグメント順を逆にして各セグメントの制御点を入れ替え(`[P3, C2, C1, P0]`)、絶対コマンド `M ... C ...` の文字列として組み立て直す。形状は完全に保存され、進行方向だけが逆になる。
   - `M`/`c`/`C` 以外のコマンド(`s`, `l` など)に遭遇した場合はエラーを投げる(KanjiVG のひらがな・数字データは M + cubic のみなので、静かに壊れるより明示的に落とす)。
2. 文字別の補正マップを定数として定義する: 例 `const REVERSE_STROKES = { '8': [0] };`(文字 → 反転するストロークのインデックス配列)。将来ほかの文字を足せる形にする。
3. 補正は `extractStrokeDs()` で抽出した直後・`sampleMedian()` の前に適用する。これにより `strokes`(描画用 `d`)と `medians`(判定用点列)の両方が自動的に逆走になる。
4. `tools/kanjivg-cache/` 配下の SVG は書き換えない(上流データは無加工のまま保つ)。
5. `npm run data` を実行して `src/data/strokes.json` を再生成する。
6. 再生成後、「8」以外の 55 文字のデータがバイト単位で変化していないことを確認する(`git diff` で確認。変わっていたら実装を見直す)。
7. 完了時にこのファイルの「作業ログ」に、実施内容・確認結果を追記する。**コミットはしない**(オーケストレーターが検証後に行う)。

## やらないこと(スコープ外)

- `src/lib/matcher.ts` など判定エンジンの改変(medians が正しくなれば判定は自動で追従する)
- 「8」以外の文字への補正適用(マップに '8' 以外を入れない)
- `tools/kanjivg-cache/` の SVG の編集・削除・再取得
- UI・アニメーション・練習フローの変更
- 新規テストファイルの追加(受け入れ基準のコマンド検証で代替する)

## 受け入れ基準(検証コマンド)

- [ ] `npm run data` がエラーなく完了する
- [ ] 次のコマンドが `OK` を出力する(「8」の始点・終点が入れ替わり、点数・範囲が妥当):
  ```
  node -e "const d=require('./src/data/strokes.json');const m=d.chars['8'].medians[0];const s=m[0],e=m[m.length-1];const near=(p,x,y)=>Math.abs(p[0]-x)<2&&Math.abs(p[1]-y)<2;const xs=m.map(p=>p[0]),ys=m.map(p=>p[1]);const inBox=Math.min(...xs)>20&&Math.max(...xs)<90&&Math.min(...ys)>10&&Math.max(...ys)<98;console.log(near(s,83.5,37.3)&&near(e,82.19,31.68)&&m.length>=16&&inBox?'OK':'NG: start='+s+' end='+e)"
  ```
- [ ] 次のコマンドが `OK` を出力する(描画用 `d` 文字列も逆走始点になっている):
  ```
  node -e "const d=require('./src/data/strokes.json');const p=d.chars['8'].strokes[0];const mm=p.match(/^M\s*([\d.]+)[,\s]([\d.]+)/);const ok=mm&&Math.abs(+mm[1]-83.5)<2&&Math.abs(+mm[2]-37.32)<2;console.log(ok?'OK':'NG: '+p.slice(0,40))"
  ```
- [ ] `git diff --stat src/data/strokes.json` の変更が strokes.json のみで、diff の内容が「8」のエントリに限られる(他の 55 文字のパス・medians に変化がない)
- [ ] `npm test` が全件パスする
- [ ] `npm run build` が成功する

## フィードバック(やり直し時にオーケストレーターが記入)

(なし)

## 作業ログ(担当エージェントが追記)

### 2026-08-03 implementer

**実施内容:**

1. `tools/build-strokes.mjs` に以下を追加:
   - `round2(n)`: 小数第2位に丸めるヘルパー
   - `REVERSE_STROKES = { '8': [0] }`: 文字別ストローク反転補正マップ
   - `parsePathSegments(d)`: KanjiVG 形式のパス `d`(`M x,y` + 相対 `c` / 絶対 `C` の連続、複数座標組の連続指定も対応)を絶対座標の cubic セグメント列 `{ p0, c1, c2, p3 }[]` にパースする関数。`M`/`c`/`C` 以外のコマンドに遭遇した場合はエラーを投げる。
   - `reversePathD(d)`: `parsePathSegments` の結果を使い、セグメント順を逆にし各セグメントの制御点を `[p3, c2, c1, p0]` の順で組み立て直し、絶対コマンド `M...C...` の文字列として返す(形状保存・進行方向のみ反転)。
   - `buildChar()` で `extractStrokeDs()` 直後・`sampleMedian()` 適用前に `REVERSE_STROKES[ch]` に含まれるインデックスのストロークへ `reversePathD` を適用するよう変更。
2. `npm run data` を実行し `src/data/strokes.json` を再生成(ネットワークアクセスなし、キャッシュ使用)。
3. `tools/kanjivg-cache/` は変更していないことを確認(`git status --short` に該当ファイルなし)。

**確認結果:**

- `npm run data` → エラーなく完了(`generated: src\data\strokes.json (56 chars)`)。
- `git diff --stat src/data/strokes.json` → 1 ファイルのみ変更、変更ハンクは 1 箇所のみで `"8"` エントリ(`strokes[0]` と `medians[0]`)に限定されていることを diff の内容で確認済み。他 55 文字は無変化。
- 受け入れ基準コマンド1(medians の始点・終点・点数・範囲チェック)→ `OK`
- 受け入れ基準コマンド2(strokes[0] の `d` 文字列の始点チェック)→ `OK`
- `npm test` → 6 ファイル / 115 テスト全件 pass
- `npm run build` → `tsc --noEmit && vite build` 成功、PWA プリキャッシュ生成も正常完了

**判断に迷った点:** なし。仕様どおり実装。座標の丸めは `round2`(小数第2位)を採用したが、これは元データの精度(小数2桁)に合わせたもので、許容誤差(<2)には十分収まっている。

コミットは行っていない(オーケストレーターの検証待ち)。

### 2026-08-03 verifier

**実行内容と結果:**

1. `npm run data` → エラーなく完了(`generated: src\data\strokes.json (56 chars)`)。→ 合格
2. medians チェックコマンド → `OK` → 合格
3. strokes[0] の `d` 文字列チェックコマンド → `OK` → 合格
4. `git diff --stat src/data/strokes.json` → `1 file changed, 63 insertions(+), 63 deletions(-)`。`git diff` full 出力を確認し、変更ハンクは `"8"` エントリの `strokes[0]` と `medians[0]` のみに限定されていることを確認(他 55 文字への変化なし)。`tools/kanjivg-cache/` は `git status --short` で無変更を確認。→ 合格
5. `npm test` → `Test Files 6 passed (6)` / `Tests 115 passed (115)` → 合格
6. `npm run build` → `tsc --noEmit && vite build` 成功、PWA プリキャッシュ生成も正常完了 → 合格

**総合判定: 合格**。受け入れ基準の全 6 項目をパス。implementer の作業ログの記述内容と実際の再実行結果が一致している。
