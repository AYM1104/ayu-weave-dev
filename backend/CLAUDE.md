# CLAUDE.md (backend scope)

- 認証・ストレージ・実行基盤に関する実装提案は `docs/adr/0001-cloud-platform-aws.md` を最優先参照。
- `firebase-admin` 前提のまま新規設計を確定しない。
- 外部連携の前提（署名検証、キー命名など）をクラウド固有に固定する場合は ADR 差分を先に明示する。
