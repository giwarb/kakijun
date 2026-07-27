---
id: T005
title: アプリシェル (タイトル / もじえらび / 進捗保存 / ごほうび / 自動進行)
status: todo
assignee: implementer
attempts: 0
---

# T005: アプリシェル (タイトル / もじえらび / 進捗保存 / ごほうび / 自動進行)

## 目的
練習画面 (T004) を包むゲームの骨格を作る。文字を選んで練習し、星を集め、ステッカーをもらう一連の流れをテンポよく回す。

## 背景・コンテキスト
- T004 の practice 画面は `onComplete({ mistakes, hints })` を返す。
- 文字グループ: 「すうじ」タブ = 0-9 (1グループ)。「ひらがな」タブ = あ行/か行/さ行/た行/な行/は行/ま行/や行/ら行/わ行ん (10グループ。や行=やゆよ、わ行=わをん)。
- UI テキストはひらがなのみ。ボタンは大きく (最小 64px タップ領域)。

## 変更対象
- `src/main.ts` — ステートマシン化 (title / select / practice / reward)
- `src/screens/title.ts`, `src/screens/select.ts`, `src/screens/reward.ts`
- `src/lib/storage.ts` — localStorage ラッパー (純ロジック部はテスト可能に)
- `src/lib/storage.test.ts`
- `src/style.css`

## 要件
1. **タイトル画面**: アプリ名「かきじゅん」ロゴ風表示 + 大きな「はじめる」ボタン + ミュートボタン (audio.ts の mute フラグ切替。見た目だけでなく状態を storage に保存)。
2. **もじえらび画面**: 上部タブ「すうじ」「ひらがな」。グリッドに文字カード (文字 + 獲得星 0-3 を ☆★ で表示)。グループ見出し (あ行 等)。どの文字も最初から選択可能 (ロックなし。飽きっぽい子が好きな文字から始められるように)。戻るボタン。
3. **星評価**: practice 完了時 `mistakes === 0 && hints === 0` → 3、`mistakes ≤ 2 && hints === 0` → 2、それ以外 → 1。既存より高いときだけ更新。
4. **ごほうび画面** (practice 完了ごと): 大きな星が 1-3 個ポンポンと出るアニメ + 「つぎへ」ボタン + 「もういちど」ボタン。**3 秒後に自動で「つぎへ」相当** (テンポ重視。ボタンを押せる子は押してもよい)。「つぎへ」= 同グループの次の文字の practice へ直行。グループ最後の文字なら **ステッカー獲得演出** (下記 5) を挟んで もじえらび へ戻る。
5. **ステッカー**: グループ内全文字が星 1 以上になったら、そのグループのステッカー (かわいい動物などの SVG 絵文字的イラスト。T006 で差し替え可能な構造に) を獲得。もじえらび画面の下部に獲得ステッカー棚を表示。
6. **storage.ts**: `getStars(char)`, `recordResult(char, stars)`, `getStickers()`, `isMuted()/setMuted()`。localStorage キーは `kakijun:v1`。JSON 破損時は初期化して落ちない。純ロジック (星計算・ステッカー判定) は DOM/localStorage 非依存の関数に分離してテスト。
7. E2E (`tools/e2e-practice.mjs`) をシェル経由に更新: タイトル →「はじめる」→ もじえらび →「1」選択 → simulateStroke で完走 → ごほうび画面に星が出る、まで検証。
8. 画面遷移はふわっとしたトランジション (CSS、150-250ms)。待たせる演出は入れない。

## やらないこと(スコープ外)
- practice 画面内部・判定の変更 (必要ならフィードバック報告)
- 紙吹雪・効果音・マスコットの本実装 (T006)

## 受け入れ基準(検証コマンド)
- [ ] `npm test` が全件パスする (storage.test.ts 含む)
- [ ] `npm run build` が成功する
- [ ] `npm run e2e` がパスする (タイトル→選択→練習→ごほうびの一連フロー)
- [ ] リロードしても星・ステッカーが保持される (verifier が確認)

## フィードバック(やり直し時にオーケストレーターが記入)

### 2026-07-27 レビュー指摘の修正依頼 (attempts 2 回目)

implementer の判断 3 点 (ステッカー演出は初回のみ / groups.ts 新設 / audio.ts の mute 追加) はすべて承認。以下を修正すること:

1. **(major) タップ領域 64px 未達の 2 ボタン** `src/style.css` の `.back-btn` と `.tab-btn` が `min-height: 48px` のみ。他ボタンと同様に最小 64px タップ領域 (min-height: 64px、適切な min-width) に統一する。
2. **(minor) タブ選択の記憶** `src/screens/select.ts` の `activeTab` がマウントごとに 'suuji' に初期化される。直近のタブ (または直前に練習した文字の属するタブ) を記憶し、もじえらびに戻ったとき同じタブを表示する (ひらがな周回時に毎回タブを押し直すのはテンポが悪い)。
3. **(minor) storage の星値検証** `src/lib/storage.ts` `parseStorageData`: `stars` の各値が 0-3 の有限数であることを検証し、不正な値は無視する (現状 `"3"` のような文字列混入で NaN が永続化し星表示が壊れたままになる)。テストも追加。
4. **(minor) 連打ガード** ごほうび/ステッカー画面のボタンに多重発火ガード (押下後 disabled 等) を入れる。

修正後: `npm test` / `npm run build` / `npm run e2e` を再実行して全パスを確認し、作業ログに追記すること。

## 作業ログ(担当エージェントが追記)

### 2026-07-27 implementer

**実施内容**

- `src/lib/groups.ts` (新規): もじえらびのタブ/グループ定義 (`GROUPS`, `findGroupByChar`)。すうじ1グループ + ひらがな10グループで56文字を過不足なく分類。ステッカーのプレースホルダーとして絵文字1文字 (`emoji`) を持たせ、T006 で SVG イラストに差し替えやすい構造にした。
- `src/lib/storage.ts` (新規): localStorage キー `kakijun:v1` の読み書きラッパー。星計算 (`computeStars`)・星のマージ (`mergeStars`)・ステッカー判定 (`computeEarnedStickerIds`)・JSON パース (`parseStorageData`) を DOM/localStorage 非依存の純関数として分離し、`getStars/getAllStars/recordResult/getStickers/updateStickers/isMuted/setMuted` がそれらを組み合わせる。JSON 破損・型不正時は初期値にフォールバックして例外を投げない。
- `src/lib/storage.test.ts` (新規): 上記純関数のユニットテスト (12 tests)。
- `src/lib/audio.ts` (最小変更): モジュール内にミュート状態を追加 (`setAudioMuted`/`isAudioMuted`)。`playPop/playSuccess/playOops` はミュート中は何もしない。T005 要件1「ミュートボタンで audio.ts の mute フラグを切替」に対応するための最小限の追加で、既存の呼び出しシグネチャ・呼び出しタイミングは変更していない。
- `src/screens/title.ts` (新規): タイトルロゴ + 「はじめる」ボタン + ミュートボタン。ミュート状態は `storage.ts` に永続化し、`audio.ts` にも反映。
- `src/screens/select.ts` (新規): 「すうじ」「ひらがな」タブ、グループ見出し付き文字グリッド (☆★表示、ロックなし)、獲得ステッカー棚、戻るボタン。文字カードに `data-char` 属性を付与 (E2E 用のフック)。
- `src/screens/reward.ts` (新規): `mountRewardScreen` (星がポンポン出るアニメ、3秒自動進行、「つぎへ」「もういちど」ボタン) と `mountStickerScreen` (グループ最後の文字を終えたときのステッカー獲得演出、3.5秒自動進行)。
- `src/main.ts` (書き換え): title/select/practice/reward のステートマシン化。画面ごとに新しい `div.screen` を追加し、`.screen-enter`/`.screen-leave` クラスの opacity トランジション (200ms) でフェード切り替え。practice 完了時に `computeStars` → `recordResult` → ごほうび画面。ごほうびの「つぎへ」はグループ内の次の文字へ、グループ最後なら `updateStickers` で新規獲得ステッカーを判定しステッカー画面を挟んでもじえらびへ。
- `src/style.css` (追記): `.screen` トランジション、タイトル/もじえらび/ごほうび/ステッカー各画面のスタイル。ボタン・カードは最小 64px (タップ領域)。既存の practice 用スタイルは変更していない。
- `tools/e2e-practice.mjs` (更新): タイトル画面 →「はじめる」クリック → もじえらび画面で `[data-char="1"]` をクリック → `window.__kakijun.simulateStroke` で「1」(1画) を trace/solo 完走 → `.reward-screen` の `data-stars` 属性 (1-3) を確認、まで検証するフローに変更。

**practice.ts への変更**: なし (内部ロジック・マウント引数とも変更していません)。

**受け入れ基準の実行結果**

- `npm test` → 6 test files / 111 tests 全件パス (`storage.test.ts` 12 tests 含む)。
- `npm run build` → `tsc --noEmit && vite build` 成功。
- `npm run e2e` → パス。ログ: タイトル画面表示 → もじえらび画面表示 → watch→solo→complete → ごほうび画面 星3、で `OK` 終了。
- リロード後の永続化確認 (`tools/` に一時スクリプトを作って手動実行、確認後に削除): 「1」を練習して星3を記録 → `localStorage['kakijun:v1']` に `{"stars":{"1":3},...}` が保存され、`page.reload()` 後も同じ内容が残り、もじえらび画面の文字カードにも `★★★` が反映されることを確認済み。

**判断に迷った点 (仕様が曖昧だった箇所)**

1. ステッカー獲得演出を「グループ最後の文字を終えたとき」に毎回出すか、「そのグループを初めてコンプリートしたとき」だけ出すかが要件4文面からは一意に決まらなかった (「グループ最後の文字なら ステッカー獲得演出を挟んで」とだけ書かれている)。復習時に何度も「獲得しました」演出が出るのは不自然と判断し、`storage.updateStickers()` が返す「今回新規に獲得したグループ id」に含まれる場合だけステッカー画面を挟み、既に獲得済みなら通常どおりもじえらびへ戻る実装にした。挙動を変えたい場合は要フィードバック。
2. グループ/ステッカーの定義 (`src/lib/groups.ts`) は変更対象ファイル一覧になかったが、もじえらびのグループ分けとステッカー判定 (要件5,6) の両方から共有される必要があるため新規に追加した。UI 層 (`screens/select.ts`) から `lib` 層へ依存する既存の設計方針 (matcher.ts 等) に合わせ、`lib/groups.ts` に置いた。
3. `audio.ts` にミュート状態 (`setAudioMuted`/`isAudioMuted`) を追加した。要件1の「audio.ts の mute フラグ切替」を満たすために必要な最小限の追加で、既存の `playPop/playSuccess/playOops` のシグネチャは変えていない (呼び出し元 practice.ts も無変更)。

**残課題**

- ステッカーの絵柄は絵文字のプレースホルダー (`CharGroup.emoji`) であり、本物のイラストは T006 で差し替える。
- 効果音のミュートは `audio.ts` の `console.debug` 呼び出しをスキップするだけで、実際の音は T006 の WebAudio 実装後でないと確認できない。
- 画面遷移のクロスフェードは `#app` 内に複数 `.screen` 要素が最大 220ms 重なる実装 (前の画面の unmount を遅延実行)。極端に速い連打操作で次の画面遷移を割り込ませるケースは今回のスコープでは考慮していない (通常操作では問題なし)。

### 2026-07-27 verifier

**実行したコマンド・結果**

- `npm test` → `Test Files 6 passed (6)` / `Tests 111 passed (111)` (storage.test.ts 12 tests 含む)。パス。
- `npm run build` → `tsc --noEmit && vite build` 正常終了、`dist/` 生成。パス。
- `npm run e2e` → `tools/e2e-practice.mjs` 実行、タイトル→もじえらび→「1」練習 (watch→trace→solo→complete)→ごほうび画面 (星3) まで到達し `OK` で終了。パス。
- リロード後の星・ステッカー保持: scratchpad (`...\scratchpad\verify-reload-persistence.mjs`) に一時 Playwright スクリプトを作成して実行 (repo 内には置いていない・実行後も残していない)。
  - 「1」を練習して星3を記録 → `page.evaluate` で `localStorage['kakijun:v1']` を取得 → `{"stars":{"1":3},"stickers":[],"muted":false}`。
  - `page.reload()` 後、同じ内容が `localStorage` に残っていることを確認 (reload前後で完全一致)。
  - reload後にタイトル→もじえらび画面まで遷移し、「1」の文字カードの星表示が `★★★` になっていることを確認。
  - パス。

**判定**: 合格。T005 の受け入れ基準4項目すべて確認済み (未実装・未パスの項目なし)。

### 2026-07-27 implementer (レビュー指摘の修正, attempts 2回目)

**実施内容 (フィードバックの4件に対応)**

1. **タップ領域64px未達 (major)**: `src/style.css` の `.back-btn` と `.tab-btn` に `min-width: 64px` を追加 (既存の `min-height` は `48px` → `64px` に変更)。他ボタンと統一。
2. **タブ選択の記憶 (minor)**: `src/screens/select.ts` にモジュールスコープ変数 `rememberedTab` を追加。タブクリック時に更新し、`mountSelectScreen` の `activeTab` の初期値を `rememberedTab` から取ることで、practice/reward を経由して再度もじえらびに戻ってきても直前のタブ (すうじ/ひらがな) を保持するようにした。
3. **storage の星値検証 (minor)**: `src/lib/storage.ts` `parseStorageData` に `isValidStarValue()` を追加。`stars` オブジェクトの各値を検証し、0-3 の有限整数でない値 (文字列 `"3"`、`NaN`→JSON上は`null`、負数、4以上、小数など) はその文字だけ無視して星0扱いにする。`src/lib/storage.test.ts` に検証用テストケースを1件追加 (壊れた値が混ざっていても正常な値だけ残ることを確認)。
4. **連打ガード (minor)**: `src/screens/reward.ts` の `mountRewardScreen`/`mountStickerScreen` に、ボタン押下・自動進行タイマーのどちらが先に発火しても `onNext`/`onRetry`/`onContinue` が1回しか呼ばれないよう `handled` フラグで一本化し、発火後は該当ボタンを `disabled = true` にして連打を防止 (`src/style.css` に `:disabled` の見た目も追加)。

**再実行した受け入れ基準**

- `npm test` → `Test Files 6 passed (6)` / `Tests 112 passed (112)` (storage.test.ts は 12→13 tests、新規の星値検証テストを含めて全件パス)。
- `npm run build` → `tsc --noEmit && vite build` 正常終了。
- `npm run e2e` → `tools/e2e-practice.mjs` パス (タイトル→もじえらび→「1」練習→ごほうび星3、まで到達し `OK`)。
- 上記4件の修正について、`tools/` に一時 Playwright スクリプト (`_tmp-verify-fixes.mjs`, 検証後に削除・repo には残していない) を作って追加確認:
  - `.back-btn`/`.tab-btn` の実測 `boundingBox().height` が両方とも `64px` であることを確認。
  - ごほうび画面で「つぎへ」をクリックした直後、`reward-next-btn.disabled === true` になっていることを確認 (連打ガード)。
  - あ行の「あ」を完走 → 「つぎへ」でグループ内の次の文字「い」の practice へ直行することを確認 (`.practice-reading` のテキストが `い`)。
  - タイトル→もじえらび→「ひらがな」タブへ切替→戻る→タイトル→はじめる、を経由しても「ひらがな」タブが `active` のままであることを確認 (タブ記憶)。

**判断に迷った点**: なし (フィードバックで指定された内容をそのまま実装)。

**残課題**: T005-implementer 最初の作業ログに記載したもの (ステッカー絵柄は絵文字プレースホルダー、効果音のミュートはT006のWebAudio実装後に確認可能) から変更なし。
