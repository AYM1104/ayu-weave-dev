# AWS統一ADRとの不整合レポート（更新版）

参照正本: `docs/adr/0001-cloud-platform-aws.md`
更新日: 2026-04-12

## 重大
- `docs/specs/mvp-api.md` に Firebase ID token / GCS 前提が残存し、API 実装方針を誤誘導する。

## 中
- `docs/specs/payment/data_model_payment.md` に Firebase/GCS 固有語が残る（旧前提の明示不足）。
- `docs/specs/payment/plan_feedback_payment.md` に旧クラウド前提（GCS/Firebase）が残る（移行対象の注記不足）。

## 軽微
- 一部ドキュメントに `Google OAuth` などの旧用語が残る。

## 今すぐ直すべきもの（今回対応）
1. `README.md` の参照先とクラウド注記を AWS方針 + 個別未決定に揃えた。
2. `docs/specs/tech-stack.md` に「未決定事項は後続ADRで確定」の明示を追加した。
3. `docs/specs/data_model.md` の命名見直しTODOを「今すぐ直す / 後続ADR待ち」で明確化した。
4. `docs/specs/directory-structure.md` の `infra/` 説明を AWS方針へ修正した。
5. `.claude/settings.json` と `.claude/commands/*.md` を AWS統一運用に合わせて最小調整した。

## 後続ADR待ち
- 認証方式 ADR（`firebase_uid` 命名見直し含む）。
- オブジェクトストレージ命名 ADR（`*_gcs_key` 見直し含む）。
- 実行基盤 / DB / IaC の各 ADR。
