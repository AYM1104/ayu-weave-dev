## ディレクトリ配置ルール

`backend/app/` では、機能固有の実装と共有基盤を分ける。

### `features/` に置くもの

`features/<feature>/` には、その機能に閉じる実装を置く。

例:
- `router.py`
- `service.py`
- `repository.py`
- `schemas.py`

ルール:
- feature 固有の API エンドポイントは feature 配下に置く
- feature 固有の業務ロジックは feature 配下に置く
- feature 固有の request / response schema は feature 配下に置く
- 単純な機能はファイル数を無理に増やさない
- 他 feature の内部実装へ直接依存しすぎない

### `core/` に置くもの

`core/` には、複数 feature から共有される基盤コードを置く。

例:
- 設定
- DB 接続
- 共通 dependency
- 共通 exception
- セキュリティ関連
- データモデル関連

ルール:
- `core/` を雑多な共有置き場にしない
- feature 固有の service や schema を `core/` に置かない
- 共通化のための共通化をしない
- 一度しか使っていない実装を安易に `core/` へ昇格させない

### `core/models/` の扱い

`core/models/` には、ORM モデルや永続化の中心になるモデル定義を置く。

ルール:
- モデルはファイル単位または責務単位で分ける
- feature 固有 schema と DB モデルを混同しない
- モデル層に feature の業務ロジックを過剰に持ち込まない
- 外部 API 連携処理をモデルへ書かない
- ORM 都合を API 契約へ漏らさない
