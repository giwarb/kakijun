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
