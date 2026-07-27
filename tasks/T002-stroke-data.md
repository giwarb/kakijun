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
