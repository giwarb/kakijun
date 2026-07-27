---
id: T007
title: PWA 仕上げ・README・リリース検証
status: todo
assignee: implementer
attempts: 0
---

# T007: PWA 仕上げ・README・リリース検証

## 目的
GitHub Pages 上で PWA としてインストール・オフライン動作することを確認し、ドキュメントとライセンス表記を整えてリリース品質にする。

## 背景・コンテキスト
- デプロイは `.github/workflows/deploy.yml` (T001) で main push 時に自動実行。
- KanjiVG (CC BY-SA 3.0) の帰属表記が必須。
- 公開 URL: https://giwarb.github.io/kakijun/

## 変更対象
- `README.md` — 全面書き換え
- `vite.config.ts` / manifest — 最終調整 (必要なら)
- `index.html` — meta description, apple-touch-icon, theme-color 等の最終確認
- タイトル画面 — 小さな「クレジット」リンク (タップでクレジットモーダル: KanjiVG CC BY-SA 3.0 表記)

## 要件
1. README: アプリ概要 (対象年齢・機能)、スクリーンショットの代わりに機能箇条書き、公開 URL、開発コマンド一覧、KanjiVG 帰属表記 (リンク+ライセンス)、本テンプレート由来の開発体制の説明は削除してよい。
2. アプリ内クレジット: タイトル画面の隅に小さく「©」ボタン → モーダルで「かきじゅんデータ: KanjiVG © Ulrich Apel (CC BY-SA 3.0)」+ リンク。
3. PWA 検証: `npm run build && npm run preview` で
   - manifest が正しく配信される (name かきじゅん、icons 192/512)
   - Service Worker が register され、リロード後オフライン (DevTools offline) でもアプリが動く
   - strokes.json など全アセットが precache に含まれる
4. `npm test` / `npm run e2e` パス維持。

## やらないこと(スコープ外)
- 新機能追加
- GitHub Pages の有効化操作 (オーケストレーターが gh api で実施)

## 受け入れ基準(検証コマンド)
- [ ] `npm test` / `npm run build` / `npm run e2e` パス
- [ ] preview でオフライン動作を確認 (verifier)
- [ ] README に KanjiVG 帰属表記あり
- [ ] アプリ内クレジット表示あり

## フィードバック(やり直し時にオーケストレーターが記入)

(なし)

## 作業ログ(担当エージェントが追記)

### 2026-07-27 implementer

**実施内容**
- `README.md` を全面書き換え。アプリ概要(対象年齢・機能箇条書き)、公開 URL、開発コマンド一覧、技術スタック、デプロイ方法、KanjiVG (CC BY-SA 3.0, © Ulrich Apel) の帰属表記(リンク付き)を記載。テンプレート由来の開発体制の説明は削除。
- `index.html` に `meta name="description"` と `meta name="theme-color"` (`#fff7ef`, manifest の theme_color と一致) を追加。`vite.config.ts` の manifest 設定は既に name/icons (192/512, maskable 含む) が揃っていたため変更なし。
- `src/screens/title.ts`: タイトル画面に「©」クレジットボタンを追加(画面隅・30px の小さい丸ボタンで、主要動線の「はじめる」ボタンより明確に小さく配置)。タップでモーダル(role="dialog")を表示し、「かきじゅんデータ: KanjiVG © Ulrich Apel (CC BY-SA 3.0)」+ `kanjivg.tagaini.net` へのリンク + 「とじる」ボタンを表示。背景タップでも閉じられる。
- `src/style.css`: `.credit-btn` / `.credit-modal-overlay` / `.credit-modal` 等のスタイルを追加(末尾に新セクション)。

**受け入れ基準の実行結果**
- `npm test` → 6 files / 112 tests 全て pass。
- `npm run build` (`tsc --noEmit && vite build`) → 成功。`vite-plugin-pwa` が `precache 9 entries (103.23 KiB)` で `dist/sw.js` / `dist/workbox-*.js` を生成(登録内容: registerSW.js, index.html, css, js バンドル, apple-touch-icon.png, favicon.png, pwa-192x192.png, pwa-512x512.png, manifest.webmanifest。`strokes.json` は JS バンドルに import されて含まれるため、js バンドル経由で precache 済み)。
- `npm run e2e` → タイトル→もじえらび→「1」の練習→ごほうび(星3)まで到達、成功。
- PWA オフライン検証: `npm run build` 後、一時スクリプト (`tools/_tmp-offline-check.mjs`, 検証後削除・リポジトリには含めない) で `vite` の `preview()` API + Playwright を使い確認。
  - `manifest.webmanifest` が配信され `name: "かきじゅん"`、`icons` に 192x192 / 512x512 (maskable 含む4件) が揃っていることを確認。
  - 初回アクセスで Service Worker が register され `navigator.serviceWorker.controller` が有効になることを確認。
  - `context.setOffline(true)` 後にリロードしてもタイトル画面が表示され、そのまま「はじめる」→もじえらび画面まで操作できることを確認(オフラインで正常動作)。
  - 上記すべて OK。ログ抜粋: `[offline-check] OK: PWA オフライン動作を確認しました`
- Chrome ブラウザでも `npm run preview` 経由でタイトル画面の「©」ボタン→モーダル表示→「とじる」で閉じる動作を目視確認済み(スクリーンショットで、ボタンが画面隅に小さく表示され「はじめる」ボタンと重ならないことを確認)。

**判断に迷った点・注意点**
- クレジットボタンの配置は仕様に明示がなかったため、画面左下隅・30px の小さい丸ボタンとした(6歳児の主要動線である「はじめる」「ミュート」ボタンより明確に小さく、視線を引かない色調 `#a99a8a` / 半透明白背景を採用)。
- オフライン検証用スクリプトはリポジトリの恒久的な資産としては要求されていないため、一時ファイルとして作成・実行後に削除した(`npm run e2e` など既存のコミット対象スクリプトには追加していない)。
- `vite.config.ts` の manifest / icons は T001〜T006 で既に要件を満たしていたため変更なし。

### 2026-07-27 verifier

**実行したコマンド・検証**
- `npm test` → `6 files / 112 tests` 全て pass。
- `npm run build` (`tsc --noEmit && vite build`) → 成功。`vite-plugin-pwa` が `precache 9 entries (103.23 KiB)` で `dist/sw.js` / `dist/workbox-9c191d2f.js` を生成。`dist/manifest.webmanifest` の内容を直接確認: `name: "かきじゅん"`, `icons` に `192x192` / `512x512` (通常+maskable の計4件) あり。`src/main.ts` が `strokes.json` を静的 import しており、precache 対象の JS バンドル (`assets/index-BAExg-Wr.js`) に含まれることをソース・sw.js 両方で確認。
- `npm run e2e` → タイトル→もじえらび→「1」練習→ごほうび(星3)まで到達し成功 (`node tools/e2e-practice.mjs`)。
- オフライン動作検証: 一時スクリプト `offline-check.mjs` を scratchpad (`C:\Users\yoshi\AppData\Local\Temp\claude\...\scratchpad\`) に作成し、`vite` の `preview()` API + Playwright (`context.setOffline(true)`) で検証(リポジトリには一切書き込んでいない)。結果: manifest 配信確認 → SW registration 確認 → reload で `navigator.serviceWorker.controller` 有効化 → オフラインでリロードしてもタイトル画面表示 → 「はじめる」クリックでもじえらび画面 (`char-card` 10件) まで操作可能、を全て確認。ログ: `[offline-check] OK: PWA オフライン動作を確認しました`。
- README.md の「ライセンス・クレジット」節で KanjiVG (CC BY-SA 3.0, © Ulrich Apel, kanjivg.tagaini.net へのリンク) の帰属表記を確認。
- アプリ内クレジット確認: 別の一時スクリプト `credit-check.mjs` (scratchpad、リポジトリ非配置) で Playwright 検証。タイトル画面に `.credit-btn` (©) が存在し、クリックで `role="dialog"` のモーダルが開き、本文に「かきじゅんデータ: KanjiVG © Ulrich Apel (CC BY-SA 3.0)」と `https://kanjivg.tagaini.net/` へのリンクがあることを確認。「とじる」ボタン・オーバーレイクリックの両方で閉じられることも確認。

**受け入れ基準の判定**
- `npm test` / `npm run build` / `npm run e2e` パス → ✅ 合格
- preview でオフライン動作を確認 → ✅ 合格
- README に KanjiVG 帰属表記あり → ✅ 合格
- アプリ内クレジット表示あり → ✅ 合格

**総合判定: 合格**

`git status` で意図しない変更がないことも確認(変更ファイルは README.md / index.html / src/screens/title.ts / src/style.css / tasks/T007-pwa-release.md のみ)。検証用の一時スクリプトはすべて scratchpad に作成し、リポジトリ内には残していない。
