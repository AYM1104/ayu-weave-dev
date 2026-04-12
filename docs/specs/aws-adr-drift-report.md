# AWS統一ADRとの不整合レポート（更新版）

参照正本: `docs/adr/0001-cloud-platform-aws.md`
更新日: 2026-04-12

## 重大
- `docs/specs/mvp-api.md` に Firebase ID token / GCS 前提が残存し、API 実装方針を誤誘導する。

## 中
- `docs/specs/directory-structure.md` の `infra/` 説明が「GCP 等」のまま。
- `docs/specs/payment/data_model_payment.md` に Firebase/GCS 固有語が残る。
- `docs/specs/payment/plan_feedback_payment.md` に旧クラウド前提の運用説明が残る。

## 軽微
- 一部ドキュメントに `Google OAuth` などの旧用語が残る。

## 今すぐ直すべきもの（今回対応）
1. `README.md` のクラウド関連記述を AWS方針 + 個別未決定へ修正。
2. `docs/specs/tech-stack.md` の Firebase/GCP固定記述を未決定表現へ修正。
3. `docs/specs/data_model.md` に旧命名注記と ADR待ちTODO を追加。
4. `.claude/settings.json` を実働設定として明確化。

## 後続ADR待ち
- 認証方式 ADR（`firebase_uid` 命名見直し含む）。
- オブジェクトストレージ命名 ADR（`*_gcs_key` 見直し含む）。
- 実行基盤 / DB / IaC の各 ADR。
