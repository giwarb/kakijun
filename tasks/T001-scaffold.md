---
id: T001
title: Vite + TypeScript + PWA + GitHub Pages デプロイの土台構築
status: todo
assignee: implementer
attempts: 0
---

# T001: Vite + TypeScript + PWA + GitHub Pages デプロイの土台構築

## 目的
6歳向け書き順アプリ「かきじゅん」の開発土台を作る。以降のタスクはすべてこの土台の上に実装する。

## 背景・コンテキスト
- リポジトリ: giwarb/kakijun。GitHub Pages (https://giwarb.github.io/kakijun/) で PWA として配信する。
- フレームワークは使わない (Vanilla TS + SVG レンダリング)。
- CLAUDE.md「プロジェクト固有情報」に全体方針あり。

## 変更対象
- `package.json` — 新規作成 (npm)
- `tsconfig.json` — strict 設定
- `vite.config.ts` — base `/kakijun/`、vite-plugin-pwa
- `index.html` / `src/main.ts` / `src/style.css` — アプリのエントリ (タイトル画面のスタブでよい)
- `.github/workflows/deploy.yml` — CI/CD
- `public/` — PWA アイコン
- `.gitignore` — node_modules, dist, logs を追記

## 要件
1. `npm create vite` 相当の Vanilla TypeScript 構成。devDependencies: `vite`, `typescript`, `vite-plugin-pwa`, `vitest`, `svg-path-properties`, `sharp` (アイコン生成用)。
2. npm scripts:
   - `dev`: vite
   - `build`: `tsc --noEmit && vite build`
   - `preview`: vite preview
   - `test`: `vitest run`
   - `data`: `node tools/build-strokes.mjs` (スクリプト本体は T002。今は placeholder の mjs を置き「T002 で実装」と echo するだけでよい)
   - `icons`: `node tools/build-icons.mjs` (下記 4)
3. `vite.config.ts`: `base: '/kakijun/'`。vite-plugin-pwa 設定: `registerType: 'autoUpdate'`、manifest = name「かきじゅん」/ short_name「かきじゅん」/ `display: standalone` / `orientation: portrait` / theme_color・background_color はパステル系 (例 `#fff7ef`) / icons 192・512 (maskable 含む)。
4. `tools/build-icons.mjs`: `tools/icon.svg` (鉛筆+ひらがな「あ」等のシンプルでかわいいアイコンを自作) から sharp で `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/apple-touch-icon.png` (180), `public/favicon.png` (32) を生成。生成物はコミットする。
5. `index.html`: `<html lang="ja">`、viewport は `user-scalable=no, maximum-scale=1` (子どもの誤ピンチ対策)、タイトル「かきじゅん」。
6. `src/main.ts`: 中央に「かきじゅん」とだけ表示する最小スタブ (以降のタスクで置き換える)。
7. `.github/workflows/deploy.yml`: main push で `npm ci` → `npm test` → `npm run build` → `actions/upload-pages-artifact` (dist) → `actions/deploy-pages`。`permissions: contents: read / pages: write / id-token: write`。concurrency group 設定。Node 22。
8. Vitest 用に `src/lib/sanity.test.ts` (自明なテスト 1 件) を置き、`npm test` が通ることを確認する。

## やらないこと(スコープ外)
- 書き順データの取得・変換 (T002)
- 判定エンジン (T003)、画面実装 (T004-T006)
- README の書き換え (T007)
- git commit / push (オーケストレーターが行う)

## 受け入れ基準(検証コマンド)
- [ ] `npm ci` が成功する
- [ ] `npm test` が全件パスする
- [ ] `npm run build` が成功し、`dist/` に `index.html`, `manifest.webmanifest`, `sw.js` (または registerSW 相当) が生成される
- [ ] `dist/index.html` 内のアセット参照が `/kakijun/` で始まる
- [ ] `public/pwa-192x192.png`, `public/pwa-512x512.png` が存在する
- [ ] `.github/workflows/deploy.yml` が上記要件どおり存在する

## フィードバック(やり直し時にオーケストレーターが記入)

(なし)

## 作業ログ(担当エージェントが追記)

### 2026-07-27 implementer

**実施内容:**
- `package.json` を新規作成。scripts (`dev`/`build`/`preview`/`test`/`data`/`icons`) と devDependencies (`vite`, `typescript`, `vite-plugin-pwa`, `vitest`, `svg-path-properties`, `sharp`) を設定。
- `tsconfig.json` を strict 設定 (target ES2022, moduleResolution Bundler, strict/noUnusedLocals/noUnusedParameters 等) で作成。
- `vite.config.ts` を作成。`base: '/kakijun/'`、`vite-plugin-pwa` (registerType: autoUpdate、manifest: name/short_name「かきじゅん」、display: standalone、orientation: portrait、theme_color/background_color: `#fff7ef`、icons 192/512 + maskable) を設定。
- `index.html` を作成 (`lang="ja"`、viewport に `user-scalable=no, maximum-scale=1`、title「かきじゅん」)。
- `src/main.ts`(中央に「かきじゅん」を表示する最小スタブ)、`src/style.css`、`src/vite-env.d.ts` (`vite/client` 型参照。CSS import の型解決に必要だったため追加) を作成。
- `src/lib/sanity.test.ts` を作成 (自明なテスト1件)。
- `tools/build-strokes.mjs` を T002 向け placeholder として作成 (`console.log` のみ)。
- `tools/icon.svg` (パステル背景+鉛筆+ひらがな「あ」の自作アイコン) と `tools/build-icons.mjs` (sharp で 192/512/apple-touch-icon(180)/favicon(32) を生成) を作成。
- `npm run icons` を実行し `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/apple-touch-icon.png`, `public/favicon.png` を生成・コミット対象として配置。
- `.github/workflows/deploy.yml` を作成 (main push で `npm ci` → `npm test` → `npm run build` → `upload-pages-artifact` → `deploy-pages`、permissions: contents:read/pages:write/id-token:write、concurrency group、Node 22)。
- `.gitignore` は node_modules/dist/logs が既に記載済みだったため変更なし。

**確認結果(すべて成功):**
- `npm install` → 依存関係インストール成功、`package-lock.json` 生成。
- `npm ci` → 成功 (445 packages)。
- `npm test` → `vitest run` で 1 test passed (`src/lib/sanity.test.ts`)。
- `npm run build` → `tsc --noEmit && vite build` 成功。`dist/` に `index.html`, `manifest.webmanifest`, `sw.js`, `registerSW.js`, `workbox-*.js` 等が生成された。`dist/index.html` 内のスクリプト/CSS/manifest/アイコン参照はすべて `/kakijun/` プレフィックス付きであることを確認。
- `public/pwa-192x192.png`, `public/pwa-512x512.png` の存在を確認。生成されたアイコン画像を目視確認し、パステル背景+鉛筆+「あ」のデザインで正しく描画されていることを確認。

**判断に迷った点:**
- `vite.config.ts` の Vitest 設定で `environment: 'jsdom'` を一時追加したが、T001 の要件・依存関係一覧に `jsdom` が含まれておらず、sanity テストも DOM 非依存のため、追加せず削除して既定の `node` 環境のまま `npm test` を通した (今後 DOM 依存テストが必要になった時点で別タスクとして `jsdom` 依存追加を検討)。
- `tsconfig.json` に `src/vite-env.d.ts` を追加した (タスク仕様の変更対象一覧には明記されていないが、`import './style.css'` の型解決に必須だったため)。

### 2026-07-27 verifier

**実施内容(すべて実コマンド実行で確認):**
- `npm ci` → 成功 (445 packages added, 10s。exit 0)。
- `npm test` → `vitest run` で `src/lib/sanity.test.ts` の 1 test 合格 (Test Files 1 passed / Tests 1 passed)。
- `dist/` を一旦削除したうえで `npm run build` → `tsc --noEmit && vite build` 成功。`dist/` に `index.html`, `manifest.webmanifest`, `sw.js`, `registerSW.js`, `workbox-9c191d2f.js`, `assets/*` が生成された。
- `dist/index.html` を確認 → favicon / apple-touch-icon / script(assets/index-*.js) / stylesheet(assets/index-*.css) / manifest.webmanifest / registerSW.js の参照がすべて `/kakijun/` プレフィックス付きであることを確認。
- `public/pwa-192x192.png` (192x192), `public/pwa-512x512.png` (512x512) の存在とPNG実寸を確認 (`apple-touch-icon.png` 180x180, `favicon.png` 32x32 も確認)。
- `.github/workflows/deploy.yml` を読み、要件と突き合わせ: `on: push: branches:[main]`、`permissions: contents: read / pages: write / id-token: write`、`concurrency: group: pages, cancel-in-progress: true`、`node-version: 22`、`npm ci` → `npm test` → `npm run build` → `actions/upload-pages-artifact@v3 (path: dist)` → `actions/deploy-pages@v4`。すべて要件どおり。

**判定: 合格 (6/6 基準すべてパス)。修正なし・コード変更なし。**
