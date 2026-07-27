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

### 2026-07-27 レビュー指摘の修正依頼 (attempts 2 回目)

仕様解釈の確定: 「なぞってね全画正解 → じぶんでフェーズで同じ文字を最初から再度書く」は **意図どおり**。変更不要。

以下を修正すること:

1. **(major) マルチタッチ対応** `src/screens/practice.ts` onPointerDown/Move/Up: アクティブな `pointerId` を記録し、キャプチャ中に別の pointerId の pointerdown が来ても無視する (現状は状態が上書きされ、1本目の軌跡が孤立・2本目のデータで誤判定される。タブレットで指を添える6歳児では現実的に発生する)。
2. **(minor) `playSuccess()` は完走時のみ** 呼ぶ。画ごとの正解は `playPop()` のみ (現状は毎画で両方鳴る設計になっており、T006 で実音実装時に毎画ファンファーレになってしまう)。
3. **(minor) フェーズ開始メッセージの配線** `PHASE_START_MESSAGES.solo`(「じぶんで かいてみよう!」等) を trace→solo 遷移時にメッセージ帯へ表示、`.complete`(「かんせい!」) を完走時に表示する (現状未使用のデッドコード。ガイドが急に消える solo 開始時の説明がないのは 6 歳児に不親切)。
4. **(minor) `handleStrokeInput` の `busy` フラグを try/finally で解除** (例外時に入力が固まったままになるのを防ぐ)。
5. **(minor) `touch-action: none` の二重設定 (インライン + CSS) を整理** し片方にする。

修正後: `npm test` / `npm run build` / `npm run e2e` を再実行して全パスを確認し、作業ログに追記すること。

## 作業ログ(担当エージェントが追記)

### 2026-07-27 implementer

**実施内容:**
- `src/lib/practiceState.ts` を新規作成。フェーズ (`watch`→`trace`→`solo`→`complete`) 進行・現在画 index・連続ミス数 (3回でヒント発動)・累計ミス数/ヒント数を管理する DOM 非依存の `PracticeState` クラスを実装。`getResult()` で `{ mistakes, hints }` を返す。
- `src/lib/practiceState.test.ts` を新規作成 (11 ケース: 初期状態、watch→trace スキップ、trace→solo→complete 遷移、ミス集計、3連続失敗でのヒント発動とリセット、累積集計、不正な strokeCount でのエラー)。
- `src/lib/strokeRenderer.ts` を新規作成。SVG path 生成 (シルエット/ガイド/確定色/お手本アニメ用/軌跡)、`stroke-dashoffset` によるお手本描画アニメ (先端ドット追従)、始点ドット (画番号入り・パルス)、進行方向矢印、スナップ/フェードアウト/シェイク/フラッシュなどの演出、進捗ドット描画ヘルパーを実装。
- `src/lib/audio.ts` を新規作成。`playPop`/`playSuccess`/`playOops` のスタブ (console.debug のみ、本実装は T006)。
- `src/screens/practice.ts` を新規作成。ヘッダ (読み+フェーズ表示)・進捗ドット・正方形 SVG 書字エリア・メッセージ帯で構成。みてね (自動アニメ→タップスキップ可)→なぞってね (全画ガイド+現在画ハイライト+始点ドット+矢印)→じぶんで (シルエットのみ) の3フェーズを実装。Pointer Events (`pointerdown/move/up`, `setPointerCapture`, `touch-action:none`) でユーザー軌跡を描画し、`pointerup` で `matchStroke` 判定。合格時はスナップアニメ+ポップ音+成功メッセージ (ランダム) で次画へ、最終画なら `onComplete({ mistakes, hints })` を呼ぶ。不合格時は軌跡フェードアウト+シェイク+失敗理由別メッセージ・演出 (wrong-order: 始点フラッシュ3回、wrong-direction: 矢印フラッシュ、wrong-start: 始点強調、wrong-shape: メッセージのみ)。同一画で3連続失敗するとヒントとしてその画のお手本アニメを自動再生。デバッグフック `window.__kakijun = { simulateStroke(points), getPhase() }` を公開 (109座標系の点列を受け取り判定パイプラインに直結。watch フェーズ中に呼ばれた場合は自動でスキップしてから処理)。
- `src/main.ts` を更新し、起動時に「あ」固定で `mountPracticeScreen` を仮マウントするように変更。
- `src/style.css` に practice screen 用のスタイルを追記 (`#app` を column flex に変更し、ヘッダー/進捗ドット/書字エリア/メッセージ帯・各種アニメーション用クラスを追加)。
- `tools/e2e-practice.mjs` を新規作成。vite の `createServer` API で空きポートを自動選択して dev サーバーを起動し、Playwright (chromium, headless) で「あ」の medians を trace フェーズ→solo フェーズの順に `simulateStroke` して `complete` 状態に到達することを検証するスモーク E2E。
- `package.json` に `playwright` を devDependency として追加し、`npm run e2e` スクリプトを追加。
- `npx playwright install chromium` を実行済み。

**手戻り・気づいた点 (修正済み):**
- 実装後にブラウザでの目視確認中、`animateStrokeDraw` (お手本アニメ) がもともと `requestAnimationFrame` でステップ駆動していたところ、タブが非表示/非合成状態だと rAF が完全に止まり「みてね」フェーズから一切進まなくなる (デッドロックしうる) ことに気づいた。Playwright の自動 E2E はタップスキップ相当の `simulateStroke` 呼び出しで watch フェーズを強制的に抜けるため実害はなかったが、実利用でタブがバックグラウンドになった場合のフリーズを避けるため `src/lib/strokeRenderer.ts` の `animateStrokeDraw` のステップ駆動を `requestAnimationFrame` から `setTimeout` ベースに変更した (視覚的な滑らかさはほぼ変わらず、タブ非表示時でも進行が完全停止しない)。

**受け入れ基準の実行結果:**
- `npx vitest run` (`npm test` 相当): 5 files / 99 tests 全件パス (`practiceState.test.ts` の 11 件含む)。
- `npm run build`: `tsc --noEmit && vite build` 成功 (dist 一式生成)。
- `npx playwright install chromium` 実行済み → `npm run e2e`: OK (「あ」の練習が完了状態 (`complete`) に到達したことを確認)。
- `npm run dev` (ポート 5183) を起動し、Chromium 経由でアクセスして目視+DOM 確認: 初期状態で「👀みてね」「よく みてね」表示、SVG に3画分のシルエットが描画されていることを確認。数秒待つと自動的に「✏️なぞってね」へ遷移し、現在画のガイド(点線ハイライト)・始点ドット(パルス)・方向矢印が表示されることを確認。`window.__kakijun.simulateStroke` で正解ストロークを送ると成功メッセージ (「やったね!」等) と進捗ドット更新、不正解 (形状違い/逆方向) を送るとそれぞれ「おしい! もういちど!」「むきが はんたい!」のメッセージが表示されることを確認。コンソールエラーなし。

**判断に迷った点・仕様の補足:**
- 「みてね→なぞってね→じぶんで」の3フェーズについて、タスク文面には「なぞってね」から「じぶんで」への遷移条件が明記されていなかったため、「なぞってねフェーズで全画正解し終えたら、じぶんでフェーズとして同じ文字を最初の画から再度書く」という解釈で実装した (`practiceState.ts` の `trace`→`solo`→`complete` 遷移)。そのため完走には理論上 1 文字につき (画数 × 2) 回の正解入力が必要になる。この解釈が意図と異なる場合はフィードバックを頂きたい。
- なぞってねフェーズでの「始点にパルスする丸ドット(画番号入り)」「進行方向の小さな矢印」は現在画にのみ表示し、じぶんでフェーズでは (要件どおり) 一切表示していない。
- 訂正演出 (wrong-order の始点フラッシュ、wrong-direction の矢印フラッシュ、wrong-start の始点強調) は、なぞってね/じぶんでどちらのフェーズでも常時同じ一時オーバーレイとして正しい始点位置に描画する実装にした (じぶんでフェーズには通常表示されているガイドが無いため)。
- 効果音・マスコット・紙吹雪などジューシーな演出は T006 の範囲としてスタブのみ (`src/lib/audio.ts`)。
- `strokes.json` / `matcher.ts` の変更は行っていない。

### 2026-07-27 verifier

**実施内容 (検証):**
- `npm test`(vitest run): 5 files / 99 tests 全件パス (`practiceState.test.ts` の 11 件含む)。
- `npm run build`: `tsc --noEmit && vite build` 成功。`dist/` 一式生成 (index.html, assets/*.js, *.css, sw.js, manifest 等)。
- `npx playwright install chromium` 済み環境を確認 (`C:\Users\yoshi\AppData\Local\ms-playwright\chromium-1234` に `INSTALLATION_COMPLETE` あり)。`npm run e2e` を2回実行し、いずれも `watch → trace(3画) → solo(3画) → complete` に到達し `OK` で終了することを確認 (再現性あり)。
- `npm run dev` (localhost:5173/kakijun/) を Playwright (chromium) 経由で開き、DOM 検査で目視相当確認:
  - 初期ロード直後: 見出し「みてね」「よく みてね」表示、`window.__kakijun.getPhase()` が `watch`。
  - 数秒後: `getPhase()` が自動的に `trace` に遷移 (自動遷移を確認)。
  - trace フェーズの SVG 構造を検査: `path.stroke-silhouette` (未着手画のシルエット) 2件、`path.stroke-guide-current` (現在画のガイドハイライト) 1件、`g.start-dot.pulse > circle.start-dot-circle + text.start-dot-label` (画番号入りパルスドット)、`line.direction-arrow` + `path.direction-arrow-head` (進行方向矢印) を確認。要件3の表示要素が揃っていることを確認。
  - コンソールエラーなし (`read_console_messages onlyErrors` で 0 件)。
  - ブラウザ環境の制約でスクリーンショット (画面合成) 自体は撮得できなかったため、DOM/アクセシビリティツリー検査と `window.__kakijun` フックで代替確認した。

**受け入れ基準の判定:**
- [x] `npm test` が全件パスする → 合格
- [x] `npm run build` が成功する → 合格
- [x] `npm run e2e` がパスする (chromium インストール済み) → 合格
- [x] `npm run dev` での表示・フェーズ進行 (目視+E2E相当) → 合格 (DOM検査で代替確認、要件3の表示要素・自動遷移・始点ドットを確認)

**総合判定: 合格**

コード・設定ファイルの修正は行っていない (検証目的で作成した `.claude/launch.json` は使用後に削除済み)。検証用に起動した `npm run dev` のバックグラウンドプロセスは権限上停止できなかったため起動したままになっている。

### 2026-07-27 implementer (レビュー指摘対応・2回目)

**実施内容 (`src/screens/practice.ts` のみ修正):**
1. マルチタッチ対応: `activePointerId` を保持する変数を追加。`onPointerDown` はキャプチャ中に別の `pointerId` が来たら無視。`onPointerMove`/`onPointerUp` も `evt.pointerId !== activePointerId` なら無視するようにし、複数指入力で軌跡が混線しないようにした。
2. `playSuccess()` は完走時 (`outcome.snapshot.phase === 'complete'`) のみ呼ぶように変更。画ごとの正解では `playPop()` のみ呼ぶ。
3. `handleStrokeInput` の合格分岐で、`previousPhase`(判定前のフェーズ)を記録し、`recordStrokeResult` 後にフェーズが変わっていれば `PHASE_START_MESSAGES[新フェーズ]` を表示するよう変更。結果として trace→solo 遷移時は「じぶんで かいてみよう!」、完走時は「かんせい!」がメッセージ帯に表示されるようになった (それ以外の通常正解時はこれまでどおりランダムな成功メッセージ)。
4. `handleStrokeInput` 内の主要処理を `try { ... } finally { busy = false; }` で囲み、途中で例外が発生しても `busy` フラグが解除されるようにした。
5. `svgEl.style.touchAction = 'none'` のインライン設定を削除し、`style.css` の `.practice-svg { touch-action: none; }` (既存) に一本化した。

**受け入れ基準の再実行結果:**
- `npx tsc --noEmit`: エラーなし。
- `npx vitest run` (`npm test` 相当): 5 files / 99 tests 全件パス (`practiceState.test.ts` は無変更のため引き続き11件パス)。
- `npm run build`: `tsc --noEmit && vite build` 成功。
- `npm run e2e`: OK (「あ」が watch→trace(3画)→solo(3画)→complete に到達)。

**備考:**
- 「なぞってね→じぶんで」の遷移解釈 (画数×2回の正解で完走) は指摘どおり意図確定のため変更していない。
- `practiceState.ts` / `strokeRenderer.ts` / テストファイルは今回無修正 (指摘は `practice.ts` の入力ハンドリング・演出配線のみが対象のため)。
