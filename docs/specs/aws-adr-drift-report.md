# AWS統一ADRとの不整合レポート（初期棚卸し）

参照正本: `docs/adr/0001-cloud-platform-aws.md`

## 重大
- `README.md` の Tech Stack が Firebase / GCS / Cloud Run 前提になっている。
- `docs/specs/tech-stack.md` が認証・ストレージ・デプロイを GCP/Firebase 固定で記述している。
- `docs/specs/mvp-api.md` が Firebase ID token 前提、GCS 直接アップロード前提で API 仕様を定義している。
- `docs/specs/data_model.md` が `firebase_uid`, `*_gcs_key` などクラウド依存命名を正本データモデルに含む。

## 中
- `docs/specs/directory-structure.md` の `infra/` 説明が「GCP 等」になっている。
- `docs/specs/payment/data_model_payment.md` に Firebase/GCS 固有語が残る。
- `docs/specs/payment/plan_feedback_payment.md` に Firebase/GCS 前提の運用説明が残る。

## 軽微
- ドキュメント内の例示URLや説明文に `storage.googleapis.com` などの旧前提が残る。
- 「Google OAuth」等の表記が、認証方式未決定の現状とズレる。

## 今すぐ直すべきもの（最小）
1. README のクラウド関連表記を「AWS統一 + 個別サービス未決定」に修正。
2. `docs/specs/tech-stack.md` の Firebase/GCP固定表現を「未決定」へ更新。
3. `docs/specs/mvp-api.md` の認証/ストレージ前提を「方式未決定（ADR追従）」へ注記。

## 後でよいもの
- `firebase_uid` / `*_gcs_key` の物理カラム名変更（実装前だが、影響範囲が広いためADRで命名方針確定後に一括対応）。
- payment配下の詳細仕様の全面改稿。

## 後続ADR候補
- 認証方式（Cognito採用可否）
- 実行基盤（App Runner / ECS Fargate / Lambda）
- オブジェクトストレージ運用（S3キー命名・署名URL）
- IaC 方針（Terraform / OpenTofu / CDK）
- 監視・ログ基盤
