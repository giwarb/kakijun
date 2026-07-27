---
id: T008
title: れんしゅう中のもどるボタン + 進捗リセット機能
status: todo
assignee: implementer
attempts: 0
---

# T008: れんしゅう中のもどるボタン + 進捗リセット機能

## 目的
ユーザー要望への対応。(1) れんしゅうを始めた後でもメニュー(もじえらび)に戻れるようにする。(2) クリアフラグ(星・ステッカー)をリセットできるようにする。

## 背景・コンテキスト
- T001-T007 完了・リリース済み。画面は title / select / practice / reward のステートマシン (`src/main.ts`)。
- practice 画面 (`src/screens/practice.ts`) は現在ヘッダに読み表示とフェーズ表示のみで、離脱手段がない (ブラウザバックのみ)。
- 進捗は `src/lib/storage.ts` の localStorage キー `kakijun:v1` (`stars` / `stickers` / `muted`)。
- 対象ユーザーは 6 歳。誤操作でれんしゅうが中断されたり、誤タップで進捗が全消去されるのは避けること。

## 変更対象
- `src/screens/practice.ts` — もどるボタン追加 + 中断時のクリーンアップ
- `src/main.ts` — practice からの中断遷移 (onExit) の配線
- `src/screens/title.ts` — 設定(⚙)ボタン + リセット確認モーダル
- `src/lib/storage.ts` — `resetProgress()` 追加
- `src/lib/storage.test.ts` — テスト追加
- `src/style.css` — 追記
- `tools/e2e-practice.mjs` — もどるボタンのスモーク追加 (練習中に押してもじえらびへ戻れること)

## 要件
1. **れんしゅう画面のもどるボタン**:
   - ヘッダ左上に「← もどる」ボタン (タップ領域 64px 以上、書字エリアと重ならない位置)。タップで `playTap()` + もじえらび画面へ戻る (その文字の進捗は保存しない。既存の星は変更しない)。
   - practice 画面に `onExit` コールバック props を追加し、`src/main.ts` が select 画面への遷移を配線する。
   - 中断時にタイマー・アニメーション・pointer capture・`window.__kakijun` フックなどを確実にクリーンアップすること (既存の unmount 処理を流用)。お手本アニメ再生中やストローク判定アニメ中に押されても例外を出さないこと。
2. **進捗リセット**:
   - タイトル画面のクレジット(©)ボタンの近くに小さな設定ボタン (⚙、控えめな見た目。6歳児の主要動線から外す)。
   - タップで確認モーダル: 「きろくを ぜんぶ けす?」+ 星とステッカーが消える旨をひらがなで説明。「けす」(危険色・小さめ) と「やめる」(安全側・大きめ・デフォルトフォーカス) の 2 ボタン。背景タップは「やめる」扱い。
   - 「けす」で `storage.resetProgress()` を呼び、`stars` と `stickers` を初期化する。**`muted` 設定は保持する**。実行後「きろくを けしたよ」と短くフィードバックし、モーダルを閉じる。
   - `resetProgress()` は storage.ts に実装し、ユニットテストを追加 (リセット後 stars/stickers が空、muted が保持される)。
3. E2E 追加: 既存フローに加えて、(a) 練習中に「← もどる」でもじえらびへ戻れる、(b) リセットモーダルで「けす」→ localStorage の stars が空になり muted が保持される、を検証。
4. UI テキストはすべてひらがな。既存のデザイントーン (角丸・パステル・ぷにっとボタン) に合わせる。

## やらないこと(スコープ外)
- 判定ロジック・データ・練習フェーズ構成の変更
- reward 画面の変更 (既存の自動進行はそのまま)
- 文字単位の個別リセット (全リセットのみ)

## 受け入れ基準(検証コマンド)
- [ ] `npm test` が全件パスする (resetProgress のテスト含む)
- [ ] `npm run build` が成功する
- [ ] `npm run e2e` がパスする (もどる + リセットの検証含む)
- [ ] 練習の途中 (お手本アニメ中・なぞり中) にもどるボタンを押してもコンソールエラーが出ず、もじえらびに戻れる (verifier が確認)
- [ ] リセット後も muted 設定が保持される

## フィードバック(やり直し時にオーケストレーターが記入)

### 2026-07-27 レビュー指摘の修正依頼 (attempts 2 回目)

⚙ボタンの配置 (©の対角の右下) は「主要動線から外す」趣旨を満たすため現状のまま承認。以下を修正すること:

1. **(must) リセットモーダルの自動クローズタイマー競合** `src/screens/title.ts`: 「けす」押下時の `setTimeout(closeReset, 1200)` の ID を保持しておらず、1200ms 以内に背景タップで閉じて再度⚙で開き直すと、古いタイマーが新しいモーダルを勝手に閉じる。タイマー ID を保持して `closeReset()` で `clearTimeout` するか、コールバック内で対象オーバーレイが自分のインスタンスか確認してから閉じる。
2. **(should) E2E の中断カバレッジ追加** `tools/e2e-practice.mjs`: 「もどる」検証が watch フェーズのみ。trace フェーズ中 (1画正解のスナップアニメ直後 or 誤答演出中) に「← もどる」を押してもコンソールエラーなくもじえらびへ戻れるケースを追加する。

修正後: `npm test` / `npm run build` / `npm run e2e` を再実行して全パスを確認し、作業ログに追記すること。

## 作業ログ(担当エージェントが追記)

### 2026-07-27 implementer

**実施内容**

1. `src/lib/storage.ts`: `resetProgressData(data)` (純ロジック: stars/stickers を初期化、muted は引き継ぐ) と、それを localStorage に反映する `resetProgress()` を追加。
2. `src/lib/storage.test.ts`: `resetProgressData` のテストを3件追加 (muted=true 保持 / muted=false 保持 / 空データでも安全)。`resetProgress()` 自体は既存の `loadData`/`saveData` 同様 window.localStorage 依存のため、このファイルの既存方針 (localStorage 連携関数はユニットテスト対象外・e2e で担保) に合わせて直接のユニットテストは追加していない。
3. `src/screens/practice.ts`:
   - `PracticeScreenProps` に `onExit: () => void` を追加。
   - ヘッダ左上に `.practice-header-left` (もどるボタン + 読み表示) を追加。もどるボタンは select 画面と同じ `back-btn` クラスを再利用 (タップ領域 64px 以上、既存デザイントーンを踏襲)。押下で `playTap()` → `props.onExit()`。
   - 中断の安全策として `exiting` フラグを追加。もどる押下時に `watchAbort?.abort()` と `exiting = true` を即座に行い、`handleStrokeInput` 内の各 await 後・`onPointerDown`・`window.__kakijun.simulateStroke` すべてで `destroyed || exiting` をチェックして早期 return するようにした。これにより、お手本アニメ中/ストローク判定アニメ中に もどる を押しても、遅延して `props.onComplete` 等の副作用が発火せず、例外も出ない。
4. `src/main.ts`: `showPractice` 内の `mountPracticeScreen` 呼び出しに `onExit: showSelect` を配線。
5. `src/screens/title.ts`: クレジット (©) ボタンの隣に `settings-btn` (⚙) を追加。押下で確認モーダル (`reset-modal`) を表示。「けす」(小さめ・危険色) / 「やめる」(大きめ・安全色・デフォルトフォーカス) の2ボタン、背景タップは「やめる」扱い。「けす」押下で `storage.resetProgress()` を呼び、見出しを「きろくを けしたよ」に差し替えて 1200ms 後に自動でモーダルを閉じる。
6. `src/style.css`: `.practice-header-left`、`.settings-btn`、`.reset-modal-overlay`/`.reset-modal`/`.reset-modal-heading`/`.reset-modal-body`/`.reset-modal-actions`/`.reset-confirm-btn`/`.reset-cancel-btn` を追加。既存の credit-modal 系のスタイルに合わせたトーン。
7. `tools/e2e-practice.mjs`: 既存フローに以下を追加。
   - もじえらび → 「1」を選択した直後 (watch フェーズ中) に「← もどる」を押し、もじえらび画面に戻れることを検証。
   - タイトル画面でミュートを ON にしてから開始 (リセット後の保持確認用)。
   - 「1」の練習を完走 (2回目の練習) してごほうび画面まで到達後、ページを再読み込みしてタイトル画面に戻り、設定 (⚙) → 「けす」で `localStorage['kakijun:v1']` の stars/stickers が空になり、muted は保持され、モーダルが自動で閉じることを検証。

**検証コマンドと結果**

- `npm test` → 全 115 件パス (既存112件 + resetProgressData の新規3件)。
- `npm run build` → 成功 (`tsc --noEmit && vite build`)。
- `npm run e2e` → 成功。ログ抜粋:
  ```
  [e2e] れんしゅう中に「← もどる」を押してもじえらび画面へ戻れた
  [e2e] OK: タイトル→もじえらび→「1」の練習→ごほうび (星3) まで到達しました
  [e2e] リセット前の記録: stars={"1":3} muted=true
  [e2e] リセット後の記録: stars={} stickers=[] muted=true
  [e2e] OK: リセット後 stars/stickers が空になり、muted は保持され、モーダルが自動で閉じた
  ```
- 追加で `npm run dev` を一時起動しブラウザで手動確認: (1) れんしゅう中 (トレース フェーズ中) に「← もどる」を押下 → コンソールエラーなしでもじえらびに復帰、対象文字の星は変化なし。(2) タイトル画面 ⚙ → モーダル表示 → 「けす」→ フィードバック表示後モーダル自動クローズ、コンソールエラーなし。

**判断に迷った点 / 仕様どおりにできなかった点**

- `resetProgress()` (localStorage を直接読み書きする関数) 自体には専用ユニットテストを追加していない。理由: storage.ts 冒頭のコメントで「localStorage を直接読み書きする関数群は組み合わせるだけ、ユニットテストはせず e2e/手動確認で担保する」という既存方針が明記されており (`getStars`/`recordResult`/`isMuted` 等も同様に未テスト)、この方針に合わせて中身の純ロジック `resetProgressData` をテスト対象にした。e2e (`npm run e2e`) で実際の localStorage 経由の reset 動作を検証済み。
- practice.ts の header レイアウトは、既存の `justify-content: space-between` を保ったまま「もどる+読み」をひとつの `headerLeft` グループにまとめる形にした (読み表示単体を左端に置く従来レイアウトから変更)。書字エリアとは重ならない。
- もどるボタンのクラス名は select 画面と同じ `back-btn` を再利用し、新規スタイルの重複を避けた (`practice-back-btn` のような専用クラスは作成していない)。

### 2026-07-27 verifier

**実行コマンドと結果**

- `npm test` → 成功。6 ファイル / 115 件全パス (`storage.test.ts` 16件含む)。
- `npm run build` → 成功 (`tsc --noEmit && vite build`、警告なし)。
- `npm run e2e` → 成功。ログに以下を確認:
  - `れんしゅう中に「← もどる」を押してもじえらび画面へ戻れた`
  - `リセット前の記録: stars={"1":3} muted=true` → `リセット後の記録: stars={} stickers=[] muted=true`
  - コンソールエラーなし (スクリプトが `consoleErrors` を監視し、あれば例外で fail する構造)。

**追加確認: もどるボタン (アニメ中) の独立検証**

scratchpad に一時 Playwright スクリプトを作成し実行 (`node --input-type=module < verify-back-mid-anim.mjs`、cwd はプロジェクトルート):
- シナリオA: 文字選択直後、お手本アニメ (watch フェーズ) 進行中 (150ms 経過時点でも watch のまま) に「← もどる」をクリック → もじえらび画面 (`.select-screen .char-card`) へ復帰、`pageerror`/`console.error` なし。
- シナリオB: stage タップで watch を打ち切り trace フェーズへ。1画目を `window.__kakijun.simulateStroke` で正解入力 (await せず fire-and-forget)、判定OK後の `snapToReference` スナップアニメ (約120ms) の途中 (40ms後) に「← もどる」をクリック → もじえらび画面へ復帰、simulateStroke の Promise 完走まで1秒待機してもコンソールエラーなし。
- 結果: 両シナリオとも `[verify] 全シナリオ OK`。例外・コンソールエラーともになし。

**追加確認: リセット後の muted 保持 (独立検証)**

scratchpad に一時 Playwright スクリプトを作成し実行 (`verify-reset-muted.mjs`)。完走フローを経由せず localStorage に直接 seed データを注入し、設定(⚙)→「けす」を実行:
- `muted: false` + `stars`/`stickers` ありのケース → リセット後 `stars={} stickers=[] muted=false`(保持)。
- `muted: true` + `stars` ありのケース → リセット後 `stars={} muted=true`(保持)。
- 両ケースともコンソールエラーなし。

**判定**: 合格。受け入れ基準5項目すべて確認できた (詳細は最終レポート参照)。一時検証スクリプトは scratchpad 配下に作成し、リポジトリには追加していない。

### 2026-07-27 implementer (レビュー指摘の修正対応)

**実施内容**

1. **(must) リセットモーダルの自動クローズタイマー競合** `src/screens/title.ts`:
   - `resetCloseTimer` (setTimeout の ID) を保持する変数を追加。
   - `closeReset()` の先頭で必ず `window.clearTimeout(resetCloseTimer)` するように変更。
   - 「けす」押下時のハンドラで `resetCloseTimer = window.setTimeout(closeReset, 1200)` として ID を保持するよう修正 (以前は ID を破棄していた)。
   - あわせて `unmount()` でも `window.clearTimeout(resetCloseTimer)` するようにし、画面遷移後にタイマーが残らないようにした。
   - これにより、「けす」押下後 1200ms 以内に背景タップ等で閉じて⚙から開き直しても、古いタイマーが新しいモーダルを誤って閉じることはなくなった。
2. **(should) E2E に trace フェーズ中の「もどる」ケース追加** `tools/e2e-practice.mjs`:
   - 既存の「1回目 (watch フェーズ中に もどる)」と「完走 (現・3回目)」の間に、「2回目」として trace フェーズのストローク判定アニメ (`snapToReference` のスナップアニメ、約120ms) 再生中に「← もどる」を押すケースを追加。
   - `window.__kakijun.simulateStroke(medians[0])` を `await` せず fire-and-forget で呼び出し (watch フェーズ中なら自動で trace へスキップしたうえで1画目の正解判定が走る)、40ms 後に「← もどる」をクリックしてもじえらび画面へ戻れること、その後 simulateStroke の Promise が完走するまで待ってもコンソールエラーが出ないことを確認する内容にした。

**検証コマンドと結果 (再実行)**

- `npm test` → 全 115 件パス (変更なし、既存構成のまま)。
- `npm run build` → 成功。
- `npm run e2e` → 成功。ログに新しい行を確認:
  ```
  [e2e] れんしゅう中に「← もどる」を押してもじえらび画面へ戻れた
  [e2e] trace フェーズのスナップアニメ中に「← もどる」を押してももじえらび画面へ戻れた
  [e2e] trace stroke 0 完了後のフェーズ: solo
  [e2e] solo stroke 0 完了後のフェーズ: complete
  ...
  [e2e] OK: リセット後 stars/stickers が空になり、muted は保持され、モーダルが自動で閉じた
  ```
- タイマー競合の修正については、scratchpad に一時 Playwright スクリプトを作成し (`verify-reset-timer-race.mjs`、リポジトリには追加せず)、`npm run dev` で起動した状態で以下を確認:
  - ⚙→「けす」→ 300ms後に背景タップで閉じる → すぐに⚙で開き直す → 1500ms 待機してもモーダルは開いたまま (以前は古いタイマーが誤って閉じていたシナリオ) → 手動で「やめる」で閉じて終了。コンソールエラーなし。
  - 出力: `[verify] OK: タイマー競合は解消されている`

**判断に迷った点**: なし。指摘の2件をそのまま修正した。
