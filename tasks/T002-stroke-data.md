---
id: T002
title: KanjiVG 書き順データパイプライン (ひらがな46字 + 数字0-9)
status: todo
assignee: implementer
attempts: 0
---

# T002: KanjiVG 書き順データパイプライン (ひらがな46字 + 数字0-9)

## 目的
アプリが使う書き順データ (ストロークのSVGパス + 判定用サンプル点列) を KanjiVG から生成し、`src/data/strokes.json` としてコミットする。

## 背景・コンテキスト
- KanjiVG (https://github.com/KanjiVG/kanjivg, CC BY-SA 3.0, © Ulrich Apel) はひらがな・数字をカバー済み (確認済み)。
- ファイル名は Unicode コードポイント 5 桁 hex: あ (U+3042) → `kanji/03042.svg`、1 (U+0031) → `kanji/00031.svg`。
- 取得 URL: `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/<hex>.svg`
- SVG の viewBox は `0 0 109 109`。`<path>` 要素は文書順 = 書き順。各 path の `d` がストロークの中心線。
- T001 で `svg-path-properties` が devDependencies に入っている (Node からパス長・座標サンプリングが可能)。

## 変更対象
- `tools/build-strokes.mjs` — 本実装 (T001 の placeholder を置き換え)
- `tools/kanjivg-cache/` — ダウンロードした生 SVG (コミットする。再実行時はキャッシュ優先でネットワーク不要に)
- `tools/kanjivg-cache/LICENSE.txt` — KanjiVG のライセンス表記 (CC BY-SA 3.0 と出典 URL を明記)
- `src/data/strokes.json` — 生成物 (コミットする)
- `src/data/strokes.test.ts` — データ検証テスト

## 要件
1. 対象文字 (56字):
   - 数字: `0123456789`
   - ひらがな清音46字: `あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん`
2. `tools/build-strokes.mjs`:
   - 各文字の SVG を取得 (キャッシュがあればネットワークアクセスなし)。
   - `<path>` の `d` を文書順に抽出 (KanjiVG の path には `id="kvg:xxxxx-sN"` が付く。グループ構造は無視してよいが、StrokeNumbers グループ内の text 等は拾わないこと)。
   - `svg-path-properties` で各ストロークを **等間隔 32 点** にサンプリングし、小数 1 桁に丸める。
   - 出力形式:
     ```json
     {
       "version": 1,
       "source": "KanjiVG (CC BY-SA 3.0)",
       "viewBox": 109,
       "chars": {
         "あ": { "strokes": ["M31.5,26.7c...", "..."], "medians": [[[x,y], ...32点], ...] }
       }
     }
     ```
   - strokes と medians の要素数は必ず一致させる。
3. `src/data/strokes.test.ts` (Vitest):
   - 56 文字すべて存在する
   - 全文字: strokes.length === medians.length ≥ 1、各 median は 32 点、座標は 0〜109 の範囲
   - 既知の画数スポットチェック: あ=3, い=2, き=4, ん=1, 1=1, 2=1, 3=1
4. JSON は TypeScript から `import strokesData from '../data/strokes.json'` で読めること (tsconfig `resolveJsonModule` 有効化)。型定義 `src/data/types.ts` に `StrokeData` インターフェースを置く。

## やらないこと(スコープ外)
- 判定ロジック (T003)、描画 (T004)
- 濁音・半濁音・拗音 (将来拡張)

## 受け入れ基準(検証コマンド)
- [ ] `npm run data` が成功し `src/data/strokes.json` を再生成する (2回目はキャッシュのみで動く)
- [ ] `npm test` が全件パスする (strokes.test.ts 含む)
- [ ] `npm run build` が成功する
- [ ] `tools/kanjivg-cache/LICENSE.txt` に CC BY-SA 3.0 帰属表記がある

## フィードバック(やり直し時にオーケストレーターが記入)

(なし)

## 作業ログ(担当エージェントが追記)

### 2026-07-27 implementer

実施内容:
- `tools/build-strokes.mjs` を実装。数字0-9 + ひらがな清音46字(計56字)について、
  KanjiVG から SVG を取得(`tools/kanjivg-cache/<hex>.svg` にキャッシュ、既存キャッシュがあればネットワークアクセスなし)、
  `<g id="kvg:StrokePaths_...">` グループ内の `<path d="...">` を文書順に抽出し、
  `svg-path-properties` で各ストロークを等間隔32点(小数1桁丸め)にサンプリングして
  `src/data/strokes.json` を生成するようにした。
- `tools/kanjivg-cache/LICENSE.txt` を作成(CC BY-SA 3.0 と KanjiVG 出典 URL を明記)。
- `src/data/types.ts` に `StrokeData` / `CharStrokeData` 型を追加。
- `src/data/strokes.test.ts` を作成(56文字存在チェック、strokes/medians要素数一致・32点・座標範囲チェック、
  画数スポットチェック あ=3 い=2 き=4 ん=1 1=1 2=1 3=1)。
- `tsconfig.json` に `resolveJsonModule: true` を追記。

検証結果:
- `npm run data` → 初回56ファイルダウンロード成功、`src/data/strokes.json` 生成。
  2回目実行(json削除後)は "downloaded" ログなしでキャッシュのみから再生成できることを確認
  (`tools/kanjivg-cache` に SVG 56件 + LICENSE.txt = 57ファイル存在)。
- `npx vitest run src/data` → `src/data/strokes.test.ts` 65 tests 全件パス。
  (`npm test` 全体は T003 が `src/lib/` を同時編集中のため実行対象外とし、自分のテストファイルのみ実行した)
- `npm run build` (`tsc --noEmit && vite build`) → 成功。
  ※ `src/data/strokes.test.ts` の `strokesData as StrokeData` キャストで
  JSON推論型(`number[][][]`)とタプル型(`[number, number][][]`)の不一致による
  tsc エラーが出たため `as unknown as StrokeData` に修正して解消。
- `tools/kanjivg-cache/LICENSE.txt` に CC BY-SA 3.0 帰属表記あり(確認済み)。

変更対象外ファイルの混入なし(`src/lib/` は未変更、他ワーカーの `src/lib/geometry.ts` にも触れていない)。

### 2026-07-27 verifier

T002/T003 が揃った状態で受け入れ基準を検証(コード修正なし)。

- `npm run data` → 成功。`tools/kanjivg-cache` は実行前から56 SVG + LICENSE.txt = 57ファイルが揃っており、実行ログに `downloaded:` 行が一切出ず全56文字がキャッシュヒット(ネットワークアクセスなし)であることを確認。実行前後で `src/data/strokes.json` の MD5 (`c52f9ed28705de8c4aa23e079872a448`) が一致し、再生成が決定的であることも確認。→ ✅
- `npm test` (フルスイート、T002+T003 全テスト同時実行) → `vitest run` で 4 ファイル / 88 tests 全件パス (`sanity.test.ts` 1, `geometry.test.ts` 12, `matcher.test.ts` 10, `strokes.test.ts` 65)。→ ✅
- `npm run build` (`tsc --noEmit && vite build`) → 型エラーなし、vite build 成功、PWA (`dist/sw.js` 等) も生成。→ ✅
- `tools/kanjivg-cache/LICENSE.txt` を目視確認 → CC BY-SA 3.0 の明記、出典 URL (KanjiVG GitHub / 公式サイト)、Ulrich Apel の著作権表記あり。→ ✅

T002 の受け入れ基準はすべて合格。追加確認として `git diff tsconfig.json` で差分が `resolveJsonModule: true` の1行追加のみであることも確認(スコープ外の変更なし)。
