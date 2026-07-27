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
