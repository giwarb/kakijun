# プロジェクト進捗ボード

最終更新: 2026-07-27 (T008 done — v1.1 リリース済み)

## タスク一覧

| ID | タスク | 担当 | 状態 | 試行 |
|---|---|---|---|---|
| T001 | Vite + TS + PWA + Pages デプロイ土台 | implementer | done | 1 |
| T002 | KanjiVG 書き順データパイプライン | implementer | done | 1 |
| T003 | ストローク判定エンジン | implementer | done | 1 |
| T004 | れんしゅう画面 (3フェーズ + 訂正) | implementer | done | 2 |
| T005 | アプリシェル (選択/進捗/ごほうび) | implementer | done | 2 |
| T006 | かわいさ・ゲーム演出 | implementer | done | 2 |
| T007 | PWA 仕上げ・README・リリース検証 | implementer | done | 1 |
| T008 | れんしゅう中のもどる + 進捗リセット | implementer | done | 2 |

状態: `todo` → `in_progress` → `review` → `done` / 不合格: `redo` / 着手不能: `blocked`

依存関係: T001 → (T002 ∥ T003) → T004 → T005 → T006 → T007

## メモ・ブロッカー

- KanjiVG がひらがな・数字 0-9 をカバーすることは確認済み (03042.svg, 00031.svg 等が 200)
- GitHub Pages の有効化 (build_type=workflow) はオーケストレーターが gh api で実施予定
