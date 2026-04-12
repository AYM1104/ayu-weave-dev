# /aws-adr-check

目的: 変更差分が `docs/adr/0001-cloud-platform-aws.md` と整合しているかを最小コストで確認する。

手順:
1. 変更ファイル一覧を取得。
2. `Firebase|firebase|GCP|Cloud Run|GCS|Google Cloud Storage|firebase-admin` を検索。
3. ヒットを 重大/中/軽微 に分類。
4. 「今すぐ直す」「後でよい」に分けて出力。

出力テンプレート:
- 重大: 実装前提を誤誘導する記述
- 中: 命名や説明で誤解を招く記述
- 軽微: 補足文や例示の古い表現
