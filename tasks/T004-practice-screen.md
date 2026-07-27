---
id: T004
title: れんしゅう画面 (お手本アニメ → なぞり → じぶんで + 優しい訂正)
status: todo
assignee: implementer
attempts: 0
---

# T004: れんしゅう画面 (お手本アニメ → なぞり → じぶんで + 優しい訂正)

## 目的
アプリの中核。1 文字を「みてね (お手本アニメ)」→「なぞってね (ガイド付き)」→「じぶんで (シルエットのみ)」の 3 フェーズで練習させる。間違えたら理由に応じて優しく訂正し、テンポよく完走させる。

## 背景・コンテキスト
- データ: `src/data/strokes.json` (T002)。`viewBox 0 0 109 109`、strokes = SVG path d (中心線)、medians = 32 点/画。
- 判定: `src/lib/matcher.ts` (T003) の `matchStroke`。API はタスク T003 に記載。
- KanjiVG のパスは中心線なので、描画は `stroke-width: 6.5`, `stroke-linecap/linejoin: round`, `fill: none` で太らせて文字らしく見せる。
- 対象は 6 歳: 文字表示は大きく (画面幅いっぱい、最大 70vmin 程度)、待ち時間を作らない。

## 変更対象
- `src/screens/practice.ts` — 画面本体
- `src/lib/strokeRenderer.ts` — SVG 生成・アニメーションヘルパー (path 要素生成、stroke-dasharray アニメ、進捗ドット)
- `src/lib/practiceState.ts` — フェーズ・ストローク進行・ミス回数の純ロジック (DOM 非依存、テスト対象)
- `src/main.ts` — 起動時に練習画面を仮マウント (「あ」固定でよい。画面遷移は T005)
- `src/style.css` — 追記
- `src/lib/practiceState.test.ts`
- `tools/e2e-practice.mjs` + devDependency `playwright` — スモーク E2E (下記 7)

## 要件
1. レイアウト: 上部に対象文字の読み表示 (小さく) + フェーズ表示 (「みてね」「なぞってね」「じぶんで」をひらがな+アイコンで)。中央に正方形の書字エリア (SVG)。下部にメッセージ帯 (励まし・訂正メッセージ)。
2. **みてね**: 全画をお手本アニメ (stroke-dashoffset で 1 画 0.5-0.7 秒 + 画間 150ms、先端に丸いドットが走る)。画数分終わったら自動で「なぞってね」へ。タップでスキップ可。
3. **なぞってね**: 全画の薄いガイド (淡いグレー) + いま書く画を点線ハイライト + **始点にパルスする丸ドット** (画番号入り) + 始点付近に進行方向の小さな矢印。正解した画はアクセント色 (例: コーラルピンク→完了はブルー系など、かわいい配色) で確定表示。
4. **じぶんで**: ガイドは全画の淡いシルエットのみ (始点ドット・矢印・ハイライトなし)。それ以外は同じ。
5. 入力: Pointer Events (`pointerdown/move/up`、`setPointerCapture`、`touch-action: none`)。描画中はユーザーの軌跡をリアルタイムで表示 (丸いにじみ風の線)。`pointerup` で `matchStroke` 判定:
   - **合格**: ユーザー軌跡を正しいストロークにスナップアニメ (100ms 程度で参照パスに置き換え) + ポップ音フック + 次の画へ。最後の画なら完了コールバック。
   - **不合格**: 軌跡をふわっとフェードアウト + 書字エリアを軽く shake。理由別メッセージ:
     - `wrong-order`: 「じゅんばんが ちがうよ!」+ 正しい始点ドットを 3 回フラッシュ
     - `wrong-direction`: 「むきが はんたい!」+ 正しい向きに矢印アニメ
     - `wrong-start`: 「スタートは ここだよ!」+ 始点ドット強調
     - `wrong-shape`: 「おしい! もういちど!」
   - 同じ画で **3 回失敗** → その画のお手本アニメを自動再生してから再挑戦 (ヒント扱い)。
6. `practiceState.ts`: フェーズ進行・現在画 index・ミス数/ヒント数の集計を純関数/クラスで実装し、完了時に `{ mistakes, hints }` を返す。`practice.ts` は表示に徹する。完了時コールバック `onComplete(result)` を props で受ける (T005 が使う)。
7. **E2E スモーク** (`tools/e2e-practice.mjs`): practice 画面は `window.__kakijun = { simulateStroke(points: {x,y}[]) }` デバッグフックを公開する (109 座標系で受け、内部で判定パイプラインに流す)。Playwright (chromium) で dev サーバーを開き、「あ」の medians を順に simulateStroke して完了画面/完了状態に到達することを検証する。npm script `e2e` として登録。
8. 音は直接鳴らさず `src/lib/audio.ts` のスタブ関数 (`playPop()`, `playSuccess()`, `playOops()` — 中身は console.debug でよい) を呼ぶ。本実装は T006。
9. メッセージ帯の文言は配列で持ち、成功時もバリエーション (「すごい!」「じょうず!」「その ちょうし!」等) からランダム表示。

## やらないこと(スコープ外)
- 画面遷移・文字選択・進捗保存 (T005)
- マスコットイラスト・紙吹雪・効果音の本実装 (T006)
- strokes.json / matcher の変更 (必要ならフィードバックとして報告)

## 受け入れ基準(検証コマンド)
- [ ] `npm test` が全件パスする (practiceState.test.ts 含む)
- [ ] `npm run build` が成功する
- [ ] `npx playwright install chromium` 済みの環境で `npm run e2e` がパスする
- [ ] `npm run dev` で「あ」の練習画面が表示され、お手本アニメ → なぞり、と進行する (verifier が目視+E2E で確認)

## フィードバック(やり直し時にオーケストレーターが記入)

(なし)

## 作業ログ(担当エージェントが追記)
