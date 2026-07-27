---
id: T006
title: かわいさ・ゲーム演出 (マスコット / 紙吹雪 / 効果音 / デザイン仕上げ)
status: todo
assignee: implementer
attempts: 0
---

# T006: かわいさ・ゲーム演出 (マスコット / 紙吹雪 / 効果音 / デザイン仕上げ)

## 目的
飽きっぽい 6 歳が楽しく続けられるよう、かわいいイラスト・エフェクト・効果音でアプリ全体を磨き上げる。

## 背景・コンテキスト
- T004/T005 で画面と流れは完成済み。audio.ts はスタブ、メッセージ帯はテキストのみ、ごほうびは星のみ。
- 画像アセットは使わず **すべてインライン SVG / Canvas / WebAudio** で作る (PWA を軽く保つ)。

## 変更対象
- `src/lib/mascot.ts` — マスコット SVG + 表情/ポーズ切替
- `src/lib/confetti.ts` — 紙吹雪・キラキラ (Canvas オーバーレイ)
- `src/lib/audio.ts` — WebAudio 本実装
- `src/screens/*.ts`, `src/style.css` — 組み込み・デザイン仕上げ
- `tools/icon.svg` → `npm run icons` 再生成 (マスコットに合わせる)

## 要件
1. **マスコット**: 丸くてかわいい動物キャラ 1 体 (推奨: 白いねこ or ペンギン。丸目・ほっぺ・シンプルな 2-3 色)。SVG で表情/ポーズを最低 4 種: ふつう / よろこび (両手上げ+跳ね) / おうえん (旗またはポンポン) / こまり顔 (励まし用。悲しませない)。
   - タイトル画面: 大きく登場、ゆらゆら idle アニメ。
   - practice 画面: メッセージ帯の横に小さく常駐。正解→よろこび、ミス→こまり顔+励まし、フェーズ開始→おうえん。
   - ごほうび画面: よろこびで跳ねる。
2. **紙吹雪**: 文字完走時に Canvas で紙吹雪 (カラフルな長方形+丸、120 個程度、1.5 秒)。1 画正解ごとにも書き終わり位置から小さなキラキラ (星パーティクル 6-10 個)。ステッカー獲得時は多め+ゆっくり。`prefers-reduced-motion` では無効化。
3. **効果音 (WebAudio 合成、ファイルなし)**:
   - `playPop()` 画正解: 短いポップ (ピッチ上昇 sine 80ms)
   - `playOops()` ミス: 柔らかい「ぽよん」(下降 2 音。不快な音・ブザーは禁止)
   - `playSuccess()` 完走: 明るいアルペジオ ファンファーレ (0.6 秒程度)
   - `playSticker()` ステッカー獲得: 上昇グリッサンド+キラキラ
   - `playTap()` ボタン: ごく短いクリック
   - ミュート状態 (storage) を尊重。初回操作まで AudioContext を作らない (autoplay 制限対応)。
4. **デザイン仕上げ**: パステル背景 (クリーム/ミント系グラデ + 水玉やドット柄をうっすら)、角丸カード、太めのかわいい日本語フォント (システムフォントスタックで `"Hiragino Maru Gothic ProN", "BIZ UDGothic", "Yu Gothic", rounded 系優先`。Web フォント読込はしない)、ボタンはぷにっと押し込みアニメ。文字カードに小さな装飾 (星・音符など)。
5. 励ましメッセージを拡充 (成功 6 種以上、ミス時 4 種以上。すべてひらがな。例: 「だいじょうぶ! ゆっくりでいいよ」)。
6. パフォーマンス: アニメは transform/opacity 中心。practice の描画入力レイテンシを悪化させない。

## やらないこと(スコープ外)
- 判定ロジック・データ・画面遷移構造の変更
- 外部アセット (画像/音声/フォント) のダウンロード追加

## 受け入れ基準(検証コマンド)
- [ ] `npm test` / `npm run build` / `npm run e2e` が全てパスする
- [ ] verifier が dev サーバーで確認: タイトルにマスコット表示、画正解でキラキラ、完走で紙吹雪+ファンファーレ、ミスで励まし、ミュートで無音
- [ ] 画像・音声・フォントの外部リクエストが増えていない (dist に新規バイナリアセットなし。アイコン PNG を除く)

## フィードバック(やり直し時にオーケストレーターが記入)

### 2026-07-27 レビュー指摘の修正依頼 (attempts 2 回目)

紙吹雪をごほうび画面側で発火する判断は承認。以下を修正すること:

1. **(must) 紙吹雪 Canvas がごほうび画面の主要コンテンツを覆う** `.fx-canvas` (z-index: 20, positioned) が、非 positioned の `.reward-message` / `.reward-stars` / `.reward-mascot` / `.sticker-message` / `.sticker-badge` より必ず手前に積まれ、紙吹雪の破片が「よくできました!」の文字や★の上に重なる。これらコンテンツ要素に `position: relative` + canvas より上の z-index を付与する (か canvas 側の z-index を下げる)。`reward.ts` の `burstConfetti` 呼び出し順もコンテンツ append の後に移動するとより安全。
2. **(should) カタカナ混入** `src/screens/practice.ts` の wrong-start メッセージ「スタートは ここだよ!」がカタカナを含む。「はじめは ここだよ!」等すべてひらがなの表現に置き換える (要件5「すべてひらがな」)。

修正後: `npm test` / `npm run build` / `npm run e2e` を再実行して全パスを確認し、作業ログに追記すること。

## 作業ログ(担当エージェントが追記)

### 2026-07-27 implementer

**実施内容**

- `src/lib/mascot.ts` (新規): マスコット「しろねこ」の SVG をコード生成する `createMascot(mood, options)` /
  `setMascotMood(svg, mood)` を実装。表情/ポーズは `normal` / `happy` (よろこび・両手あげ) /
  `cheer` (おうえん・ポンポン) / `sad` (こまり顔・涙なし、汗マークのみ) の4種。丸い体・大きな目 (ハイライト付き)・
  ほっぺ・耳・ひげ・しっぽを共通パーツにし、mood ごとに腕/顔パーツだけ差し替える。
- `src/lib/confetti.ts` (新規): Canvas オーバーレイの `burstConfetti(container, options)` (紙吹雪 120個/1.5秒、
  `gentle` オプションでステッカー用のゆっくり・多め) と `burstSparkle(container, xFrac, yFrac, options)`
  (1画正解ごとの星パーティクル 8個/0.6秒) を実装。`prefers-reduced-motion: reduce` のときは即 no-op。
  演出後は canvas 要素を自動的に取り除き DOM に残さない。
- `src/lib/audio.ts` (スタブ→本実装): WebAudio 合成で `playPop` / `playOops` / `playSuccess` に加えて
  要件どおり `playSticker` (上昇グリッサンド+キラキラ) / `playTap` (短いクリック) を追加。AudioContext は
  初回再生要求まで生成しない (autoplay 対策)。`isMuted`/`setAudioMuted` は既存仕様を維持。
- `src/screens/title.ts`: マスコット (`normal` + `mascot-idle` ゆらゆらアニメ) を大きく表示。
  「はじめる」「ミュート解除」操作で `playTap()`。
- `src/screens/select.ts`: 文字カードに星/音符の小さな装飾 (`char-card-deco`) を交互配置。
  もどる/タブ切替/文字選択で `playTap()`。
- `src/screens/practice.ts`: メッセージ帯の横に常駐マスコットを追加し、正解→`happy`、ミス→`sad`、
  フェーズ開始 (みてね/なぞってね/じぶんで)→`cheer` に切り替え (一定時間後に `normal` へ自動復帰)。
  1画正解ごとに書き終わり位置から `burstSparkle` を発火。励ましメッセージを拡充
  (成功8種・失敗理由ごとに2-3種、計9種のバリエーションからランダム表示)。
  文字完走時の紙吹雪は、遷移後すぐ消えてしまう practice 側ではなく reward 側で発火する設計とした
  (下記「判断に迷った点」参照)。
- `src/screens/reward.ts`: ごほうび画面マウント時に `burstConfetti` (紙吹雪 1.5秒) と
  よろこびで跳ねるマスコット (`happy` + `mascot-bounce`) を表示。ステッカー獲得画面では `playSticker()` と
  多め・ゆっくりの `burstConfetti` (`gentle: true`, 200個/2.5秒) を追加。もういちど/つぎへ/ステッカーつぎへの
  各ボタンで `playTap()`。
- `src/style.css`: フォントスタックを要件どおり
  `'Hiragino Maru Gothic ProN', 'BIZ UDGothic', 'Yu Gothic UI', 'Yu Gothic', ...` に変更。
  背景をクリーム→ミントのグラデーション+うっすら水玉に変更。ボタン全体に `:active` の押し込みアニメ
  (`prefers-reduced-motion` で無効化)。マスコット用の配色/アニメ (`mascot-idle` ゆらゆら、
  `mascot-bounce` 跳ねる。両方 `prefers-reduced-motion` で無効化)、`.fx-canvas` (紙吹雪/キラキラの
  オーバーレイ)、`.char-card-deco` などを追加。
- `tools/icon.svg`: 鉛筆+「あ」のデザインから、マスコット (しろねこ) の顔を大きく配置したデザインに変更。
  `npm run icons` を実行し `public/*.png` (192/512/apple-touch/favicon) を再生成済み。

**やらないこと(スコープ外)の遵守**

- `src/lib/matcher.ts` / `src/lib/practiceState.ts` / `src/data/*` / `src/lib/groups.ts` (ステッカー絵文字含む)
  は変更していない。画面遷移のステートマシン (`src/main.ts`) も変更していない。
- 外部アセット (画像/音声/フォント) のダウンロード追加なし。すべてインライン SVG / Canvas / WebAudio。

**受け入れ基準の実行結果**

- `npm test` → 6 files / 112 tests 全て pass。
- `npm run build` (`tsc --noEmit && vite build`) → 型エラーなしでビルド成功
  (`dist/` に新規バイナリアセットなし。PNG アイコン4種のみ、既存と同じファイル名・種類)。
- `npm run e2e` → タイトル→もじえらび→れんしゅう (「1」)→ごほうび (星3) まで到達し OK。
- 手動確認 (dev サーバー + ブラウザスクリーンショット): タイトル画面にマスコット表示・パステル背景の水玉、
  もじえらび画面の文字カード装飾、practice 画面で `simulateStroke` により
  正解 (`cheer`→フェーズ開始表示)/ミス (`sad` + 励ましメッセージのバリエーション) の表情切替を確認、
  ごほうび画面で `happy` + 跳ねるアニメ + 星3つを確認。コンソールエラーなし。

**判断に迷った点**

- 「文字完走時に Canvas で紙吹雪」の発火場所: `practice.ts` の完走時点 (`onComplete` 呼び出し直前) で
  発火すると、`main.ts` の画面遷移が 220ms でコンテナごと unmount するため紙吹雪がほぼ見えなくなってしまう。
  そのため、完走の直接的な結果として毎回必ず表示される `mountRewardScreen` 側で `burstConfetti` を発火する
  実装にした (1:1 対応であることは `src/main.ts` の `onComplete` → `showReward` 呼び出しで確認済み)。
  仕様の字面とは発火タイミングが1画面分ずれるが、体験としては「完走した瞬間に紙吹雪が舞う」という
  要件の意図は満たせていると判断した。問題があれば practice.ts 側での発火に変更可能。
- ステッカー画面の紙吹雪パラメータ (200個/2.5秒/gentle) は要件の「多め+ゆっくり」を数値化したもので、
  具体的な数値の指定はなかったため妥当と思われる値を選定した。

### 2026-07-27 verifier

**実行結果 (すべてパス)**

- `npm test` → `6 files / 112 tests` 全て pass (Duration 1.06s)。
- `npm run build` (`tsc --noEmit && vite build`) → 型エラーなしでビルド成功。
  `dist/` の生成物: `apple-touch-icon.png` / `favicon.png` / `pwa-192x192.png` / `pwa-512x512.png` (既存名と同一の
  PNG アイコン4種のみ) / `index.html` / `assets/index-*.css` / `assets/index-*.js` / `manifest.webmanifest` /
  `registerSW.js` / `sw.js` / `workbox-*.js`。PNG アイコン以外の新規バイナリアセットなし。
- `npm run e2e` (`tools/e2e-practice.mjs`, Playwright Chromium) →
  タイトル→もじえらび→「1」の練習 (なぞって→じぶんで)→ごほうび (星3) まで到達し `OK`。コンソールエラーなし。

**dev サーバー + Playwright による DOM 検査 (追加検証)**

`npm run dev` (port 5183) を起動し、Playwright (ヘッドレス Chromium, 手動スクリプト) と
`window.__kakijun.simulateStroke` デバッグフックで以下を直接 DOM で確認:

- タイトル画面: `.title-screen svg.mascot.title-mascot.mascot-idle[data-mood="normal"]` が存在 (マスコット表示 OK)。
- ミス時: `simulateStroke` にわざと誤った点列を渡すと `.practice-screen .mascot` の `data-mood` が
  `"sad"` に変化し、`.practice-message` に「もういちど おてほんを みてね」「おしい! もういちど!」等の
  励ましメッセージが表示された (1200ms 後に `normal` へ自動復帰することも確認)。
- 画正解時: 正しい点列で `simulateStroke` すると `document.querySelectorAll('.fx-canvas').length === 1`
  (キラキラ用 canvas 出現) を確認。trace→solo 切替時は mood が `"cheer"` に変化することも確認。
- 文字完走時: 最終画正解で `phase === 'complete'` → `.reward-screen` がマウントされ、
  `data-stars` 属性・`.fx-canvas` (紙吹雪) 出現・`.reward-screen .mascot[data-mood="happy"]` (よろこびで跳ねる)
  を確認。
- ミュート: タイトル画面の `.mute-btn` クリックで `aria-label` が「おとを けす」→「おとを だす」、
  アイコンが 🔊→🔇 に切替わり、`localStorage['kakijun:v1']` の `muted` が `true` へ永続化されることを確認。
- コンソールエラー: Playwright の `page.on('console'/'pageerror')` および手動セッションのブラウザコンソール
  ともにエラーなし (vite HMR の debug ログのみ)。

**音の確認 (コードレベル)**: `src/lib/audio.ts` を読み、
  (1) `playPop/playOops/playSuccess/playSticker/playTap` はすべて冒頭で `if (muted) return;` しており、
  ミュート時は `AudioContext` に一切触れない、
  (2) `ctx` はモジュール読み込み時は `null` で、`ensureContext()` (各 `play*` 内から呼ばれる、
  つまりユーザー操作起点の呼び出し時) で初めて `new AudioContext()` する遅延生成になっている、
  ことをコードで確認した (autoplay 制限対応・ミュート尊重ともに要件どおり)。

**画像・アニメーションの補助確認**

- `src/lib/confetti.ts`: `burstConfetti` 既定 `count:120 / durationMs:1500` (要件どおり)、
  `burstSparkle` 既定 `count:8 / durationMs:600` (要件の6-10個に合致)。
  両関数とも冒頭で `prefers-reduced-motion: reduce` を判定し即 return (演出無効化) することを確認。
  演出後は `canvas.remove()` で DOM に残さない実装。
- `src/style.css`: `@media (prefers-reduced-motion: reduce)` で `.mascot-idle`/`.mascot-bounce` の
  アニメーションと `button:active` の押し込みアニメを無効化していることを確認。
  フォントスタックは `'Hiragino Maru Gothic ProN', 'BIZ UDGothic', 'Yu Gothic UI', 'Yu Gothic', ...`
  (Web フォント読み込みなし、要件どおり)。

**スクリーンショット (scratchpad に保存、Playwright 480x720)**

- `01-title.png` — タイトル画面 (マスコット・パステル背景の水玉・「はじめる」/ミュートボタン)。
- `02-select-clean.png` — もじえらび画面 (すうじタブ、文字カードの星/音符装飾)。
- `03-practice-miss.png` — practice 画面ミス時 (励ましメッセージ「おしい! もういちど!」表示)。
- `04-sparkle-round0.png` / `04-sparkle-round1.png` — 画正解直後のキラキラ (`.fx-canvas`) が視認できるフレーム。
- `05-reward.png` — ごほうび画面 (紙吹雪が画面に降っている状態・よろこびマスコット・星2/3)。
- 保存先: `C:\Users\yoshi\AppData\Local\Temp\claude\C--Users-yoshi-work-kakijun\4cea6e54-8ba8-4252-9282-c8c5030d8c23\scratchpad\`
  (プロジェクト直下には一切書き込んでいない。検証用に使った一時スクリプトも scratchpad 内のみ)。
- 見た目上の崩れ: なし (`02-select.png` という同名の1枚目は画面遷移フェード中の中間フレームを
  たまたま撮影したものでタイトルと選択画面が重なって写ったが、これは実装のレイアウト崩れではなく
  撮影タイミングの問題。500ms 待ってから撮り直した `02-select-clean.png` では正常表示を確認済み)。

**総合判定: 合格**

受け入れ基準3項目 (`npm test`/`build`/`e2e` 全パス、dev サーバーでの演出確認、dist に新規バイナリなし)
すべて満たしていることを確認した。不合格要因なし。

### 2026-07-27 implementer (レビュー指摘の修正対応, attempts 2 回目)

**実施内容 (フィードバック2件への対応)**

1. **(must) 紙吹雪 Canvas がごほうび画面の主要コンテンツを覆う問題**
   - `src/style.css`: `.reward-mascot` / `.reward-message` / `.reward-stars` / `.reward-actions` /
     `.sticker-message` / `.sticker-badge` / `.sticker-sub` / `.sticker-continue-btn` に
     `position: relative; z-index: 21;` を追加 (`.fx-canvas` の `z-index: 20` より確実に手前に積む)。
     指摘で名指しされた要素に加え、同じ画面内で視覚的に紙吹雪より手前にあるべき `reward-actions` /
     `sticker-sub` / `sticker-continue-btn` にも同様に適用し、画面全体で一貫させた。
   - `src/screens/reward.ts`: `mountRewardScreen` / `mountStickerScreen` の両方で、`burstConfetti(...)` の
     呼び出しをコンテンツ (`container.append(...)`) の**後**に移動 (DOM 追加順によるフォールバックとしての
     安全策。実際の重なり順は上記 CSS の position+z-index が本体)。
2. **(should) カタカナ混入**
   - `src/screens/practice.ts` の `REASON_MESSAGES['wrong-start']` の1文目
     「スタートは ここだよ!」→「はじめは ここだよ!」に変更 (2文目「ここから はじめてね」は元々ひらがなのため変更なし)。
   - 念のため `practice.ts`/`title.ts`/`select.ts`/`reward.ts` の全ユーザー向け文言 (SUCCESS_MESSAGES /
     REASON_MESSAGES / PHASE_START_MESSAGES / HINT_MESSAGE 等) をスクリプトで再走査し、他にカタカナ混入が
     ないことを確認済み (コメント中の技術用語のカタカナ・既存の「ステッカー」「コンプリート」等の
     T004/T005 由来の既存ラベルは対象外、今回の指摘対象である励ましメッセージのみ修正)。

**受け入れ基準の再実行結果 (修正後)**

- `npm test` → 6 files / 112 tests 全て pass。
- `npm run build` (`tsc --noEmit && vite build`) → 型エラーなしでビルド成功。`dist/` に新規バイナリアセットなし
  (PNG アイコン4種のみ、前回と同一)。
- `npm run e2e` → タイトル→もじえらび→れんしゅう (「1」)→ごほうび (星3) まで到達し OK。
- 追加の手動確認 (dev サーバー + ブラウザの `getComputedStyle`): ごほうび画面で
  `.fx-canvas` は `position: absolute; z-index: 20`、`.reward-message`/`.reward-stars`/`.reward-mascot` は
  いずれも `position: relative; z-index: 21` になっていることを実ブラウザで確認し、紙吹雪がコンテンツより
  背面に描画されることを確認した。コンソールエラーなし。

**判断に迷った点**: なし。
