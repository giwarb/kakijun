# かきじゅん

6歳(年長)向けの、ひらがな・すうじの書き順を練習できる PWA アプリです。

**公開 URL: https://giwarb.github.io/kakijun/**

## 特徴

- 対象: ひらがな清音 46 字 + すうじ 0〜9 の合計 56 字
- れんしゅうは 3 ステップ
  - **みてね** — お手本のアニメーションを見る
  - **なぞってね** — ガイド(始点・矢印・薄いなぞり線)付きでなぞる
  - **じぶんで** — 薄いシルエットだけを頼りに自分で書く
  - 始点・書く向き・形のズレ・書き順違いをやさしく判定し、間違えても責めずに繰り返し挑戦できる
- できたら星(0〜3 個)とごほうび演出(紙吹雪・効果音)。文字グループを完走するとステッカーがもらえる
- 進捗(文字ごとの星・獲得ステッカー)は端末内(localStorage)に保存され、次回起動時も引き継がれる
- 効果音は WebAudio で合成しているため音声ファイルは同梱していない。ミュートボタンあり
- 画面はひらがな中心の大きなボタンで構成し、テンポよく自動で次へ進む設計
- PWA 対応: ホーム画面に追加してオフラインでも遊べる

## 開発

### セットアップ

```sh
npm install
```

### コマンド一覧

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 型チェック (`tsc --noEmit`) + 本番ビルド (`vite build`) |
| `npm run preview` | `build` の成果物 (`dist/`) をローカルで配信して確認 |
| `npm test` | ユニットテスト (Vitest) を実行 |
| `npm run e2e` | タイトル→もじえらび→れんしゅう→ごほうびまでのスモーク E2E (Playwright) |
| `npm run data` | KanjiVG から書き順データを取得・変換して `src/data/strokes.json` を再生成 |
| `npm run icons` | アプリアイコン各サイズを再生成 |

### 技術スタック

- Vite + TypeScript(UI フレームワークなし。SVG レンダリング + Pointer Events)
- `vite-plugin-pwa`(Service Worker・manifest 生成)
- 判定エンジン `src/lib/matcher.ts` は DOM に依存しない純関数として実装

### デプロイ

`main` ブランチへの push で `.github/workflows/deploy.yml` が動き、GitHub Actions 経由で GitHub Pages に自動デプロイされる。

## ライセンス・クレジット

このリポジトリ自体のコードは MIT License です(`LICENSE` を参照)。

書き順データ(`src/data/strokes.json`、および元データ `tools/kanjivg-cache/`)は
[KanjiVG](https://github.com/KanjiVG/kanjivg)([https://kanjivg.tagaini.net/](https://kanjivg.tagaini.net/))
由来です。

> KanjiVG — Copyright (C) 2009/2010/2011 Ulrich Apel.
> [Creative Commons Attribution-Share Alike 3.0 License (CC BY-SA 3.0)](https://creativecommons.org/licenses/by-sa/3.0/) で提供されています。

このアプリでは、KanjiVG から生成した派生データ(`src/data/strokes.json`)を同じ CC BY-SA 3.0 の条件のもとで利用しています。詳細は `tools/kanjivg-cache/LICENSE.txt` を参照してください。アプリ内でもタイトル画面の「©」ボタンから同じ帰属表記を確認できます。
