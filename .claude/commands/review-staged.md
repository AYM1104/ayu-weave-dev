# /review-staged

目的: git staged 差分を AWS 統一 ADR 観点でレビューし、コミット前の見落としを防ぐ。

手順:
1. `git diff --staged --name-only` で対象ファイルを確認する。
2. staged 差分に `Firebase|firebase|GCP|Cloud Run|GCS|Google Cloud Storage|firebase-admin` があるか確認する。
3. 検出箇所を 重大 / 中 / 軽微 に分類する。
4. 問題がある場合は「修正提案」か「ADR待ちTODO」を返す。

チェックポイント:
- AWS 個別サービスを勝手に確定していないか
- 未決定事項を確定事項として書いていないか
- 旧前提を残す場合に理由が明記されているか
