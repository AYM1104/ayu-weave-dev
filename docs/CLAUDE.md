# CLAUDE.md (docs scope)

この配下（`docs/`）では、ADR と specs のドリフト最小化を優先します。

## ルール
- ADR 本文は日本語で記述する。
- ファイル名は英数字・ハイフンを使用する。
- クラウド方針は `docs/adr/0001-cloud-platform-aws.md` を正本とする。
- specs 側に AWS 統一方針と矛盾する記述があれば、
  - まず差分を明示し、
  - 重大度（重大/中/軽微）を付け、
  - 影響範囲を記載する。

## 書いてよいこと / まだ書かないこと
- 書いてよい: 未決定項目の棚卸し、比較軸、判断保留理由。
- まだ書かない: Cognito 採用確定、App Runner/ECS/Lambda 確定、RDS/Aurora 確定、IaC 確定（ADR未承認の場合）。
