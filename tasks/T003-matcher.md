---
id: T003
title: ストローク判定エンジン (matcher) + ユニットテスト
status: todo
assignee: implementer
attempts: 0
---

# T003: ストローク判定エンジン (matcher) + ユニットテスト

## 目的
子どもが描いたストロークが「いま書くべき画」として正しいかを判定し、間違いの **理由** を返す純関数エンジンを作る。UI はこの理由をもとに優しく訂正する。

## 背景・コンテキスト
- 対象ユーザーは 6 歳。指・マウスで雑に描くため **判定は甘め** がデフォルト。
- 参照データは T002 の medians (109×109 座標系、ストロークごとに 32 点)。ただし本タスクは T002 と並行開発のため、**strokes.json には依存せず**、テストは合成データ+ (存在すれば) 実データで書く。
- DOM 非依存の純 TypeScript モジュールにする (Vitest でテスト)。

## 変更対象
- `src/lib/geometry.ts` — 点列ユーティリティ (リサンプリング、距離、長さ等)
- `src/lib/matcher.ts` — 判定本体
- `src/lib/matcher.test.ts`, `src/lib/geometry.test.ts`

## 要件
1. 公開 API (この型を厳守。T004 がこのまま使う):
   ```ts
   export interface Point { x: number; y: number }
   export type FailReason = 'wrong-start' | 'wrong-direction' | 'wrong-shape' | 'wrong-order'
   export interface MatchResult {
     ok: boolean
     score: number            // 0-100
     reason?: FailReason      // ok=false のとき必須
     matchedStroke?: number   // reason='wrong-order' のとき、実際に描いてしまった画の index
   }
   export interface MatcherOptions { leniency?: number } // 1.0=標準(子ども向けに甘め)。大きいほど甘い
   export function matchStroke(
     user: Point[],           // ユーザーが描いた点列 (109座標系、点数任意・2点以上)
     medians: Point[][],      // その文字の全ストロークの参照点列
     strokeIndex: number,     // いま書くべき画 (0-based)
     opts?: MatcherOptions
   ): MatchResult
   ```
2. 判定アルゴリズム (実装の目安。数値はチューニング可だが甘め方針を守る):
   - ユーザー点列を 32 点に等間隔リサンプリングする。
   - 期待ストロークとの比較指標: 始点距離 / 終点距離 / 平均対応点距離 (両方向の向きで計算) / 長さ比。
   - **逆方向チェック**: 逆順にした方が明確に良く一致する場合 → `wrong-direction`。
   - **書き順チェック**: 期待ストロークに不合格でも、**まだ書いていない別の画** (strokeIndex より後) に十分一致する場合 → `wrong-order` + `matchedStroke`。
   - 始点だけ大きく外れて残りは一致 → `wrong-start`。それ以外の不一致 → `wrong-shape`。
   - 短すぎる入力 (タップ等、長さが期待の 20% 未満) は `wrong-shape` で不合格。
   - 合格閾値は「多少ヨレていても、正しい画を正しい向きで描けば通る」レベルにする。距離閾値は文字サイズ (109) に対する比で定義し、leniency を掛ける。
3. `score` は一致度 (合格時 60-100 目安)。UI の星評価の参考値。
4. テスト (最低限):
   - median そのものを入力 → ok
   - median に少しノイズを加えノード間引きしたもの → ok (甘さの担保)
   - 逆向き → `wrong-direction`
   - 2 画目を描いた (strokeIndex=0) → `wrong-order`, matchedStroke=1
   - 全く違う場所の線 → 不合格
   - 2 点だけの短い入力 → 不合格
   - 横線を書くべき所に縦線 → 不合格
   - `src/data/strokes.json` が存在する場合: 「あ」の各画の median を順に入力し全て ok になる統合テスト (ファイルがなければ skip)

## やらないこと(スコープ外)
- DOM / SVG / イベント処理 (T004)
- strokes.json の生成 (T002)

## 受け入れ基準(検証コマンド)
- [ ] `npm test` が全件パスする
- [ ] `npm run build` (tsc) が型エラーなしで成功する
- [ ] matcher.ts / geometry.ts が DOM API (document, window 等) を参照していない

## フィードバック(やり直し時にオーケストレーターが記入)

(なし)

## 作業ログ(担当エージェントが追記)

### 2026-07-27 implementer

**実施内容**
- `src/lib/geometry.ts` を新規作成。`Point` 型、`distance`/`pathLength`/`reversePoints`/`resample`(弧長ベース等間隔リサンプリング)/`averagePointwiseDistance` を実装。
- `src/lib/matcher.ts` を新規作成。要件どおりの公開 API (`Point`(geometry から re-export)、`FailReason`、`MatchResult`、`MatcherOptions`、`matchStroke`) を実装。
- `src/lib/geometry.test.ts`、`src/lib/matcher.test.ts` を新規作成。

**アルゴリズム概要**
1. ユーザー点列・期待ストロークをともに弧長で等間隔 32 点にリサンプリング。
2. 期待ストロークの長さの 20% 未満しかない入力 (タップ等) は即 `wrong-shape` で不合格。
3. 対応点間の平均距離 (avg)・始点距離・「先頭 20% を除いた残り」の平均距離 (tailAvg) を、順方向と逆方向 (ユーザー点列を反転) の両方で計算。
4. 逆方向の avg が順方向の 0.75 倍未満、かつ逆方向の avg 自体がしきい値以下 → `wrong-direction`。
5. 順方向の avg がしきい値以下 → 合格 (`ok:true`)。
6. 不合格の場合、まだ描いていない (strokeIndex より後の) 各画について同様に順方向・逆方向の avg を計算し、しきい値以下で最良のものがあれば `wrong-order` + `matchedStroke`。
7. 上記に該当せず、始点距離が始点しきい値超 かつ tailAvg がしきい値以下 → `wrong-start`。
8. それ以外は `wrong-shape`。
9. `score` はしきい値ちょうどで 60 点、距離 0 で 100 点になるよう線形変換 (0-100 にクランプ)。

**しきい値 (leniency=1.0 のとき、文字サイズ 109 に対する比率)**
- 形状しきい値 (avg): 109 × 0.16 ≈ 17.4
- 始点しきい値: 109 × 0.2 ≈ 21.8
- 短すぎる入力の閾値: 期待ストローク長の 20%
- 逆方向判定倍率: 0.75
- wrong-start 判定時に「始点」とみなす先頭割合: 32 点中先頭 20% (= 6 点)
- すべて `leniency` (既定 1.0) を掛けて甘さを調整可能

**検証コマンドと結果**
- `npx vitest run src/lib` → 3 ファイル 23 テストすべて成功 (sanity 1 + geometry 12 + matcher 10)。matcher.test.ts には `src/data/strokes.json` (T002 が並行生成済み) を使った「あ」の統合テストも含まれ、実データでも成功を確認済み。
- `npx tsc --noEmit` → エラーなし。
- `grep -nE "\bdocument\b|\bwindow\." src/lib/geometry.ts src/lib/matcher.ts` → 一致なし (DOM API 非依存を確認)。

**注意点・判断事項**
- strokes.json 統合テストは、Node の `fs` モジュールを使う案だと `@types/node` が未導入のため `tsc --noEmit` が型エラーになった (tsconfig.json は T002 の変更対象のため触れない制約あり)。そこで Node の `fs`/`url` は使わず、Vite/Vitest が `vite/client` 経由で標準的に型付けしている `import.meta.glob('../data/strokes.json', { eager: true })` を使い、ファイルが存在しなければ空オブジェクトになる性質を利用して「あれば describe、なければ describe.skip」を実現した。オーケストレーターの指示にあった「fs.existsSync 等」の「等」に該当する代替手段として採用。
- 実装時点で T002 側の `src/data/strokes.json` / `tools/build-strokes.mjs` / 更新済み `tsconfig.json` がすでに作業ツリーに存在していたが、それらのファイルは一切変更していない (`git status` で確認済み)。
- 仕様どおりに実装でき、判断に迷った点は上記 strokes.json 読み込み方式の代替以外になし。

### 2026-07-27 verifier

T002/T003 が揃った状態で受け入れ基準を検証(コード修正なし)。

- `npm test` (フルスイート、T002/T003 全テスト初の同時実行) → `vitest run` で 4 ファイル / 88 tests 全件パス (`sanity.test.ts` 1, `geometry.test.ts` 12, `matcher.test.ts` 10 [`src/data/strokes.json` を使った「あ」統合テストは skip されず実行され成功], `strokes.test.ts` 65)。→ ✅
- `npm run build` (`tsc --noEmit && vite build`) → 型エラーなし、ビルド成功。→ ✅
- `grep -nE "\bdocument\b|\bwindow\.|\bnavigator\.|localStorage|HTMLElement" src/lib/geometry.ts src/lib/matcher.ts` → 一致なし。DOM API 非依存を確認。→ ✅
- 併せて `src/lib/matcher.ts` の公開 API (`Point`/`FailReason`/`MatchResult`/`MatcherOptions`/`matchStroke`) を読み、要件記載の型シグネチャと一致することを目視確認。`matcher.test.ts` に要求されたテストケース(median入力=ok、ノイズ+間引き=ok、逆向き=wrong-direction、2画目=wrong-order+matchedStroke=1、始点ずれ=wrong-start、遠い線=不合格、2点タップ=不合格、縦線/横線=不合格、strokes.json統合テスト)が全て揃っていることも確認。

T003 の受け入れ基準はすべて合格。
