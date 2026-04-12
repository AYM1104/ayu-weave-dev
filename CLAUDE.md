# CLAUDE.md (Repository Root)

## 目的
このファイルは、Claude Code / Codex がこのリポジトリで一貫した判断を行うための**運用正本**です。
実装方針のクラウド前提は `docs/adr/0001-cloud-platform-aws.md` を最上位の基準として扱います。

## 正本の優先順位（上から強い）
1. `docs/adr/0001-cloud-platform-aws.md`（クラウド方針の正本）
2. `docs/adr/*.md`（個別ADR）
3. `docs/specs/*.md` と `docs/specs/**`（仕様）
4. `README.md`（概要）

矛盾時は、上位ドキュメントに合わせて下位を更新する提案を行います。

## 必須ルール
- 新規提案・設計・実装は AWS 前提で扱う。
- ただし、AWS の個別サービスが ADR で未決定なら**未決定のまま**扱う。
- Firebase / GCP / Cloud Run / GCS 固有の新規前提を追加しない。
- 例外を導入する場合は、先に ADR を追加して承認を得る。

## 禁止事項
- ADR 未承認のクラウド依存（例: Firebase 固定実装）を確定事項として書く。
- 仕様と ADR の矛盾を暗黙に丸める。
- docs/specs の更新だけでアーキ方針を確定したことにする。

## 変更時の期待動作（エージェント）
1. まず `docs/adr/0001-cloud-platform-aws.md` を確認する。
2. 変更対象にクラウド依存語がないか確認する（Firebase, GCP, Cloud Run, GCS など）。
3. 矛盾を見つけたら、
   - 重大度（重大/中/軽微）で分類し、
   - 即時修正と後続対応を分離して提案する。
4. 未決定事項は「未決定」と明記し、勝手に確定しない。

## スコープ別補助ルール
- `frontend/CLAUDE.md`
- `backend/CLAUDE.md`
- `infra/CLAUDE.md`
- `docs/CLAUDE.md`

上記が存在する場合、各ディレクトリ配下ではその指示を追加適用します。
