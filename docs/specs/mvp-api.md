# MVP API 設計

## 1. 目的

MVP backend 実装に先立ち、公開 API の責務・I/O・重要ルールを揃えるための設計書です。

- データモデルの正本: `data_model/data_model.md`
- API 境界と実装ルールの正本: 本ドキュメント
- 参照元: `README.md`, `docs/specs/user-flow.md`, Issue #15, Issue #20

## 2. 前提と用語

### フェーズ整理

| フェーズ | スコープ |
| --- | --- |
| Phase 1 | アルバム作成、写真アップロード、編集、保存 |
| Phase 2-1 | Stripe Checkout, webhook, 注文確定 |
| Phase 2-2 | PDF 生成、印刷ベンダー連携、配送追跡 |

### API 用語と DB 対応

| API 用語 | DB テーブル | 補足 |
| --- | --- | --- |
| album | `books` | UI/API では album、DB では book と呼ぶ |
| draft | `book_drafts` | 常に最新の編集中データ 1 件 |
| revision | `book_revisions` | 復元用の不変スナップショット |
| media | `media_assets` | GCS 上の写真メタデータ。MVP では `book_id` を持つ album 専属リソース |
| order | `orders` | MVP では checkout-session / webhook 経由でのみ生成・更新 |

### MVP で決める保存方針

- `tenant_id` は認証済みユーザーからサーバー側で解決する。クライアントからは受け取らない。
- ウィザード Step 2/3 の「日付・名前・デザイン選択」は `books` のカラムには置かず、`book_drafts.state_json` に保存する。
- `books` は一覧用のメタデータ、`book_drafts` は最新の編集内容、`book_revisions` は注文や復元に使う固定版、という役割で分離する。
- MVP では media は album 専属とし、1 media を複数 album で共有しない。
- MVP ではページ構成の正本を `book_drafts.state_json` とし、`books.total_pages` はサーバーが同期する要約値とする。

## 3. 共通ルール

### 認証

- `POST /api/v1/stripe/webhook` を除き、すべて Firebase ID token を前提とする。
- 認可は「自分の tenant に属する album / media / order のみ触れる」で統一する。

### リクエストの基本形

- JSON API の request body はトップレベル `data` でラップしない。
- すべて `application/json` を基本とする。
- 日時は ISO 8601 / UTC、ID は UUID を返す。
- webhook のみ raw body + `Stripe-Signature` ヘッダーを受ける。
- `POST /api/v1/checkout-sessions` は `Idempotency-Key` ヘッダーを必須とする。

### レスポンスの基本形

単一 resource:

```json
{
  "data": {
    "id": "uuid"
  },
  "meta": {
    "request_id": "req_123"
  }
}
```

一覧 resource:

```json
{
  "data": {
    "items": [
      {
        "id": "uuid_1"
      },
      {
        "id": "uuid_2"
      }
    ]
  },
  "meta": {
    "request_id": "req_123",
    "next_cursor": null
  }
}
```

- 単一取得・作成・更新 API は `data` をオブジェクトで返す。
- 一覧 API (`GET /albums`, `GET /albums/{album_id}/media`, `GET /albums/{album_id}/revisions`) は `data.items` 形式で統一する。
- `meta.next_cursor` は次ページがない場合 `null` または省略とする。
- 204 を返す API では body を返さない。

### エラーの基本形

```json
{
  "error": {
    "code": "DRAFT_VERSION_CONFLICT",
    "message": "draft was updated by another session",
    "details": {
      "current_lock_version": 8
    },
    "request_id": "req_123"
  }
}
```

| HTTP | code | 用途 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | JSON 形式不正、必須ヘッダー不足 |
| 400 | `IDEMPOTENCY_KEY_REQUIRED` | `POST /checkout-sessions` に `Idempotency-Key` がない |
| 401 | `UNAUTHORIZED` | 認証失敗 |
| 403 | `FORBIDDEN` | tenant 外データへのアクセス |
| 404 | `NOT_FOUND` | album / revision / media / order が存在しない |
| 409 | `DRAFT_VERSION_CONFLICT` | `lock_version` の競合 |
| 409 | `ALBUM_NOT_READY_FOR_CHECKOUT` | 必須入力不足や利用可能 media 不足 |
| 409 | `MEDIA_IN_USE` | 削除対象 media が current draft または revision から参照されている |
| 409 | `MEDIA_STATUS_INVALID` | 現在の media.status では complete を受け付けない |
| 422 | `SCHEMA_VERSION_UNSUPPORTED` | MVP で未対応の `schema_version` を受け取った |
| 422 | `INVALID_PAGE_COUNT` | `state_json.pages.length` が `30 / 50 / 70` 以外 |
| 422 | `VALIDATION_ERROR` | 型・値のバリデーションエラー |
| 400 | `STRIPE_SIGNATURE_INVALID` | webhook 署名検証失敗 |
| 500 | `INTERNAL_ERROR` | 想定外エラー |

## 4. MVP ステータス定義

### `books.status`

| status | 意味 | MVP での扱い |
| --- | --- | --- |
| `draft` | 編集中 | 初期値。MVP の公開 API で実際に使うのはこれだけ |
| `rendering` | PDF / 入稿データ生成中 | Phase 2-2 以降で使用 |
| `rendered` | PDF / 入稿データ生成完了 | Phase 2-2 以降で使用 |
| `archived` | 保管済み・編集対象外 | Phase 2-2 以降で使用 |

> 方針: `books.status` は enum は先に持つが、MVP の公開フローでは `draft` のみを扱う。
> `books.status` は編集対象のライフサイクルだけを表し、決済や配送の進行は表さない。

### `orders.status`

| status | 意味 | MVP での扱い |
| --- | --- | --- |
| `draft` | カート・編集中 | enum 定義のみ。今回の API では未使用 |
| `pending_payment` | Checkout Session 作成済み / 決済待ち | `POST /checkout-sessions` 成功時に設定 |
| `paid` | 決済完了 | `checkout.session.completed` webhook で設定 |
| `expired` | Checkout セッション期限切れ | `checkout.session.expired` webhook で設定 |
| `cancelled` | 決済前キャンセル | enum 定義のみ。明示 cancel API 追加時に使用 |
| `refunded` | 返金済み | Stripe 返金 webhook で設定 |
| `render_queued` | 入稿 PDF 生成待ち | Phase 2-2 以降 |
| `submitted` | 印刷ベンダー発注済み | Phase 2-2 以降 |
| `producing` | 製作中 | Phase 2-2 以降 |
| `shipped` | 発送済み | Phase 2-2 以降 |
| `completed` | 受取完了 | Phase 2-2 以降 |
| `failed` | 技術的失敗 | Phase 2-2 以降 |

> `orders.status` は注文と決済の進行だけを表し、エディタで編集中かどうかの判断には使わない。

### `media_assets.status`

| status | 意味 |
| --- | --- |
| `pending` | upload URL 発行直後。まだアップロード完了通知前 |
| `processing` | サーバー側で画像検査・派生生成中 |
| `ready` | エディタで利用可能 |
| `failed` | 検査や変換に失敗 |
| `deleted` | 論理削除済み |

## 5. MVP で公開する API 一覧

ベースパスは `/api/v1` とする。

| リソース | Method | Path | 責務 |
| --- | --- | --- | --- |
| albums | `POST` | `/albums` | 新規 album と初期 draft を作る |
| albums | `GET` | `/albums` | 自分の album 一覧を返す |
| albums | `GET` | `/albums/{album_id}` | album メタ情報を返す |
| albums | `PATCH` | `/albums/{album_id}` | title など album メタ情報を更新する |
| draft | `GET` | `/albums/{album_id}/draft` | 最新編集中データを返す |
| draft | `PUT` | `/albums/{album_id}/draft` | 最新編集中データを保存する |
| revisions | `GET` | `/albums/{album_id}/revisions` | 復元可能 revision 一覧を返す |
| revisions | `POST` | `/albums/{album_id}/revisions` | 現在 draft から手動スナップショットを作る |
| revisions | `POST` | `/albums/{album_id}/revisions/{revision_id}/restore` | revision を current draft に復元する |
| media | `GET` | `/albums/{album_id}/media` | album で使える media 一覧を返す |
| media | `POST` | `/albums/{album_id}/media/uploads` | 直接アップロード用 URL を発行する |
| media | `POST` | `/albums/{album_id}/media/{media_id}/complete` | アップロード完了を通知し処理を進める |
| media | `DELETE` | `/albums/{album_id}/media/{media_id}` | media を論理削除する |
| checkout-session | `POST` | `/checkout-sessions` | revision を固定して Stripe Checkout Session を作る |
| stripe webhook | `POST` | `/stripe/webhook` | Stripe イベントを検証し order を更新する |

> MVP では `orders` の一般公開 CRUD API は作らない。注文更新は checkout-session / webhook 経由のみとする。

## 6. リソース別責務と I/O

### 6.1 albums

責務:

- album 一覧やダッシュボードで必要なメタ情報を持つ
- `book_drafts.state_json` の中身は持たない
- 新規作成時に初期 draft を 1 件同時に作る
- `books.total_pages` は一覧・注文確認のための要約値として持ち、ページ構成の正本は持たない

album summary の返却フィールド:

| field | type | 説明 |
| --- | --- | --- |
| `id` | UUID | album ID |
| `title` | string | album 表示名 |
| `total_pages` | integer | 常に `book_drafts.state_json.pages.length` と同じ |
| `status` | string | MVP では `draft` 固定 |
| `created_at` | datetime | album 作成日時 |
| `updated_at` | datetime | album 最終更新日時 |

#### `POST /albums`

request:

- request body 省略または `{}` を許可する。
- `title` は省略可。省略時 default は `新しいアルバム`。
- `total_pages` は省略可。省略時 default は `30`。
- `total_pages` を明示する場合の許容値は `30 / 50 / 70`。

validation:

- `title` を送る場合は trim 後 1 文字以上 255 文字以下。
- `total_pages` を送る場合は integer かつ `30 / 50 / 70` のいずれか。

DB side effects:

1. `books` に 1 件 insert する。
   - `title = COALESCE(request.title, '新しいアルバム')`
   - `total_pages = COALESCE(request.total_pages, 30)`
   - `status = 'draft'`
2. 同一 transaction で `book_drafts` に 1 件 insert する。
   - `schema_version = 1`
   - `lock_version = 0`
   - `state_json.wizard = { couple_name: null, event_date: null, design_theme: null }`
   - `state_json.pages` は `1..total_pages` を page_number に持つ空 page 配列を生成する
3. `books.total_pages` は生成した `state_json.pages.length` を正として保存する。

request 例:

```json
{}
```

response 例:

```json
{
  "data": {
    "album": {
      "id": "d5a7a8d9-2c8a-4f97-a70c-9d4bf3d97731",
      "title": "新しいアルバム",
      "total_pages": 30,
      "status": "draft",
      "created_at": "2026-04-11T01:23:45Z",
      "updated_at": "2026-04-11T01:23:45Z"
    },
    "draft": {
      "schema_version": 1,
      "lock_version": 0,
      "updated_at": "2026-04-11T01:23:45Z"
    }
  },
  "meta": {
    "request_id": "req_123"
  }
}
```

> `POST /albums` のレスポンスでは full state_json は返さない。
> 初期 draft の内容が必要な場合は `GET /albums/{album_id}/draft` を呼ぶ。

error codes:

| 条件 | HTTP | code |
| --- | --- | --- |
| `title` が空文字または長すぎる | 422 | `VALIDATION_ERROR` |
| `total_pages` が `30 / 50 / 70` 以外 | 422 | `INVALID_PAGE_COUNT` |

#### `GET /albums`

request:

- query string は `cursor?`, `limit?` を受ける。
- `limit` の default は `20`、max は `100` とする。
- sort order は `updated_at DESC, id DESC`。

DB side effects:

- なし。read-only。

response 例:

```json
{
  "data": {
    "items": [
      {
        "id": "d5a7a8d9-2c8a-4f97-a70c-9d4bf3d97731",
        "title": "新しいアルバム",
        "total_pages": 30,
        "status": "draft",
        "created_at": "2026-04-11T01:23:45Z",
        "updated_at": "2026-04-11T01:23:45Z"
      }
    ]
  },
  "meta": {
    "request_id": "req_123",
    "next_cursor": null
  }
}
```

error codes:

| 条件 | HTTP | code |
| --- | --- | --- |
| `limit` / `cursor` が不正 | 422 | `VALIDATION_ERROR` |

#### `GET /albums/{album_id}`

DB side effects:

- なし。read-only。

response 例:

```json
{
  "data": {
    "id": "d5a7a8d9-2c8a-4f97-a70c-9d4bf3d97731",
    "title": "新しいアルバム",
    "total_pages": 30,
    "status": "draft",
    "created_at": "2026-04-11T01:23:45Z",
    "updated_at": "2026-04-11T01:23:45Z"
  },
  "meta": {
    "request_id": "req_123"
  }
}
```

error codes:

| 条件 | HTTP | code |
| --- | --- | --- |
| album が存在しない | 404 | `NOT_FOUND` |

#### `PATCH /albums/{album_id}`

request:

- MVP で更新可能なのは `title` のみ。
- `total_pages` は受け付けない。ページ数変更は `PUT /albums/{album_id}/draft` で `state_json` 全体を保存した結果としてのみ反映する。

validation:

- request body は `title` を必須にする。
- `title` は trim 後 1 文字以上 255 文字以下。
- `title` 以外の field を送った場合は 422 とする。

DB side effects:

1. `books.title` を更新する。
2. `books.updated_at` を更新する。
3. `book_drafts.state_json` や `books.total_pages` は変更しない。

request 例:

```json
{
  "title": "結婚式アルバム"
}
```

response 例:

```json
{
  "data": {
    "id": "d5a7a8d9-2c8a-4f97-a70c-9d4bf3d97731",
    "title": "結婚式アルバム",
    "total_pages": 30,
    "status": "draft",
    "created_at": "2026-04-11T01:23:45Z",
    "updated_at": "2026-04-11T01:30:12Z"
  },
  "meta": {
    "request_id": "req_123"
  }
}
```

error codes:

| 条件 | HTTP | code |
| --- | --- | --- |
| `title` がない、空文字、長すぎる | 422 | `VALIDATION_ERROR` |
| `title` 以外の field を含む | 422 | `VALIDATION_ERROR` |
| album が存在しない | 404 | `NOT_FOUND` |

### 6.2 draft

責務:

- エディタが参照する「今の状態」を 1 レコードで持つ
- `lock_version` を使って楽観ロックを行う
- 不変履歴は持たず、履歴は `revisions` に任せる

MVP で受理する `draft.state_json` の最小 schema:

```json
{
  "wizard": {
    "couple_name": null,
    "event_date": null,
    "design_theme": null
  },
  "pages": [
    {
      "page_number": 1,
      "slots": []
    }
  ]
}
```

- 上記は shape の最小例であり、実際に保存される `pages.length` は MVP では必ず `30 / 50 / 70` のいずれか。
- `POST /albums` 時の初期 draft はこの shape を `1..total_pages` まで展開して作る。
- `books.total_pages` は常に `state_json.pages.length` を正として同期する。

#### `GET /albums/{album_id}/draft`

DB side effects:

- なし。read-only。

response 例:

```json
{
  "data": {
    "album_id": "d5a7a8d9-2c8a-4f97-a70c-9d4bf3d97731",
    "schema_version": 1,
    "lock_version": 0,
    "total_pages": 30,
    "state_json": {
      "wizard": {
        "couple_name": null,
        "event_date": null,
        "design_theme": null
      },
      "pages": [
        {
          "page_number": 1,
          "slots": []
        },
        {
          "page_number": 2,
          "slots": []
        }
      ]
    },
    "updated_at": "2026-04-11T01:23:45Z"
  },
  "meta": {
    "request_id": "req_123"
  }
}
```

> 上記 `pages` は抜粋。実レコードでは `page_number=1..30` の 30 件を返す。

error codes:

| 条件 | HTTP | code |
| --- | --- | --- |
| album または draft が存在しない | 404 | `NOT_FOUND` |

#### `PUT /albums/{album_id}/draft`

request:

- `state_json` は部分更新ではなく丸ごと受ける。
- `schema_version` は必須で、MVP では `1` のみ受理する。
- `lock_version` は必須で、直前に取得した値をそのまま送る。

request 例:

```json
{
  "schema_version": 1,
  "lock_version": 0,
  "state_json": {
    "wizard": {
      "couple_name": "Taro & Hanako",
      "event_date": "2026-03-21",
      "design_theme": "natural"
    },
    "pages": [
      {
        "page_number": 1,
        "slots": []
      },
      {
        "page_number": 2,
        "slots": [
          {
            "slot_id": "cover-main",
            "media_id": "2a24a7ea-ff27-4b07-8c56-9627114c5261"
          }
        ]
      }
    ]
  }
}
```

> 上記 `pages` は抜粋。保存時は `pages.length` が `30 / 50 / 70` のいずれかになる完全な state_json を送る。

validation:

- `schema_version != 1` は 422 `SCHEMA_VERSION_UNSUPPORTED`。
- `lock_version` が integer でない、または欠落している場合は 422 `VALIDATION_ERROR`。
- `state_json` が object でない、`wizard` または `pages` が欠落している場合は 422 `VALIDATION_ERROR`。
- `pages.length` は `30 / 50 / 70` のいずれかのみ許容し、それ以外は 422 `INVALID_PAGE_COUNT`。
- 各 page は `page_number`, `slots` を持つ。
- `page_number` は `1..pages.length` の連番で重複不可。
- `state_json.pages[].slots[].media_id` を含む場合、その media は同一 album に属し、`status = ready` でなければならない。

DB side effects:

1. current draft を取得し、`WHERE book_id = :album_id AND lock_version = :lock_version` で楽観ロック更新する。
2. 更新成功時は `book_drafts.state_json` を request の全文で置き換える。
3. `book_drafts.schema_version = 1` を保存する。
4. `book_drafts.lock_version = lock_version + 1` に更新する。
5. `book_drafts.updated_by_user_id`, `book_drafts.updated_at` を更新する。
6. 同一 transaction で `books.total_pages = state_json.pages.length` に更新する。
7. 同一 transaction で `books.updated_at` も更新する。

response 例:

```json
{
  "data": {
    "album_id": "d5a7a8d9-2c8a-4f97-a70c-9d4bf3d97731",
    "schema_version": 1,
    "lock_version": 1,
    "total_pages": 30,
    "state_json": {
      "wizard": {
        "couple_name": "Taro & Hanako",
        "event_date": "2026-03-21",
        "design_theme": "natural"
      },
      "pages": [
        {
          "page_number": 1,
          "slots": []
        },
        {
          "page_number": 2,
          "slots": [
            {
              "slot_id": "cover-main",
              "media_id": "2a24a7ea-ff27-4b07-8c56-9627114c5261"
            }
          ]
        }
      ]
    },
    "updated_at": "2026-04-11T01:40:00Z"
  },
  "meta": {
    "request_id": "req_123"
  }
}
```

> 上記 `pages` は抜粋。実レスポンスでは保存済みの full state_json を返す。

error codes:

| 条件 | HTTP | code |
| --- | --- | --- |
| `schema_version != 1` | 422 | `SCHEMA_VERSION_UNSUPPORTED` |
| `pages.length` が `30 / 50 / 70` 以外 | 422 | `INVALID_PAGE_COUNT` |
| `state_json` の shape が不正 | 422 | `VALIDATION_ERROR` |
| `state_json` 内で参照した media が存在しない、別 album に属する、または `ready` でない | 422 | `VALIDATION_ERROR` |
| `lock_version` 競合 | 409 | `DRAFT_VERSION_CONFLICT` |
| album または draft が存在しない | 404 | `NOT_FOUND` |

409 response 例:

```json
{
  "error": {
    "code": "DRAFT_VERSION_CONFLICT",
    "message": "draft was updated by another session",
    "details": {
      "current_lock_version": 3,
      "draft_updated_at": "2026-04-11T01:39:58Z"
    },
    "request_id": "req_123"
  }
}
```

### 6.3 revisions

責務:

- 復元用の不変スナップショットを保存する
- order 作成や障害調査で参照できる固定版を残す
- 最大 10 件を復元対象として扱う
- checkout 用の固定 revision は `source=checkout` で識別する

#### `GET /albums/{album_id}/revisions`

response 例:

```json
{
  "data": {
    "items": [
      {
        "id": "3ef4b7c3-5dc4-4dc5-8d6d-f02fe362f171",
        "revision_no": 4,
        "source": "manual",
        "created_at": "2026-04-11T01:15:00Z"
      },
      {
        "id": "7f3fc801-f4b5-4c2d-9ce0-421d6f639b2c",
        "revision_no": 3,
        "source": "manual",
        "created_at": "2026-04-11T00:58:00Z"
      }
    ]
  },
  "meta": {
    "request_id": "req_123",
    "next_cursor": null
  }
}
```

#### `POST /albums/{album_id}/revisions`

- current draft の `state_json` と `schema_version` をそのまま `book_revisions` に copy する。
- `source = manual` とする。
- `books.total_pages` は変更しない。

#### `POST /albums/{album_id}/revisions/{revision_id}/restore`

request:

```json
{
  "lock_version": 3
}
```

restore ルール:

- restore は current draft の上書きなので、`draft` と同じく `lock_version` 競合チェックを行う。
- restore 実行時は対象 revision の `state_json` と `schema_version` を `book_drafts` にコピーする。
- restore 実行時は `book_drafts.lock_version` を `+1` する。
- restore 実行時は `books.total_pages = restored_state_json.pages.length` を同一 transaction で再計算する。
- MVP では restore 時に新しい revision を追加しない。現状態を残したい場合は restore 前に `POST /albums/{album_id}/revisions` を明示的に呼ぶ。

response 例:

```json
{
  "data": {
    "album_id": "d5a7a8d9-2c8a-4f97-a70c-9d4bf3d97731",
    "schema_version": 1,
    "lock_version": 4,
    "total_pages": 50,
    "state_json": {
      "wizard": {
        "couple_name": "Taro & Hanako",
        "event_date": "2026-03-21",
        "design_theme": "classic"
      },
      "pages": [
        {
          "page_number": 1,
          "slots": []
        }
      ]
    },
    "updated_at": "2026-04-11T02:00:00Z"
  },
  "meta": {
    "request_id": "req_123"
  }
}
```

> 上記 `pages` は抜粋。実際には restore 対象 revision の full state_json を返す。

### 6.4 media

責務:

- 画像本体ではなくメタデータを管理する
- 画像アップロードは GCS へ直接送る
- エディタで使える状態 (`ready`) になるまでの処理状態を返す
- MVP では 1 media = 1 album とし、別 album への付け替えや共有は扱わない

media summary の返却フィールド:

| field | type | 説明 |
| --- | --- | --- |
| `id` | UUID | media ID |
| `file_name` | string | 元ファイル名 |
| `mime_type` | string | サーバーが確定した MIME type |
| `byte_size` | integer | サーバーが検査したサイズ |
| `width_px` | integer or null | サーバーが検査した幅 |
| `height_px` | integer or null | サーバーが検査した高さ |
| `captured_at` | datetime or null | EXIF 等から得た撮影日時 |
| `status` | string | `pending / processing / ready / failed / deleted` |
| `preview_url` | string or null | response 専用 field。`proxy_gcs_key` から導出した URL |
| `created_at` | datetime | 作成日時 |
| `updated_at` | datetime | 更新日時 |

#### `GET /albums/{album_id}/media`

request:

- query string は `cursor?`, `limit?` を受ける。
- `limit` の default は `50`、max は `100` とする。
- sort order は `created_at DESC, id DESC`。

返却ルール:

- `status = deleted` の media は一覧に含めない。
- `preview_url` は `status = ready` かつ proxy 生成済みの場合のみ non-null とする。

DB side effects:

- なし。read-only。

response 例:

```json
{
  "data": {
    "items": [
      {
        "id": "2a24a7ea-ff27-4b07-8c56-9627114c5261",
        "file_name": "IMG_0012.HEIC",
        "mime_type": "image/heic",
        "byte_size": 4231987,
        "width_px": 3024,
        "height_px": 4032,
        "captured_at": "2026-03-21T02:12:00Z",
        "status": "ready",
        "preview_url": "https://cdn.example.com/media/2a24a7ea-ff27-4b07-8c56-9627114c5261/preview.jpg",
        "created_at": "2026-04-11T01:32:00Z",
        "updated_at": "2026-04-11T01:33:10Z"
      },
      {
        "id": "28e4272d-97d8-4972-8638-48adf8f1f429",
        "file_name": "IMG_0013.HEIC",
        "mime_type": "image/heic",
        "byte_size": 4011201,
        "width_px": 3024,
        "height_px": 4032,
        "captured_at": null,
        "status": "processing",
        "preview_url": null,
        "created_at": "2026-04-11T01:35:00Z",
        "updated_at": "2026-04-11T01:35:30Z"
      }
    ]
  },
  "meta": {
    "request_id": "req_123",
    "next_cursor": null
  }
}
```

#### `POST /albums/{album_id}/media/uploads`

request:

```json
{
  "file_name": "IMG_0012.HEIC",
  "mime_type": "image/heic",
  "byte_size": 4231987,
  "sha256": "4f5f0c5a3d30f8e1a4d798669e8cde4d6df64a72637414e8fdd4fcf6df95a647"
}
```

validation:

- `file_name` は必須、trim 後 1 文字以上。
- `mime_type` は必須。
- `byte_size` は必須、正の integer。
- `sha256` を送る場合は 64 文字の lower-case hex。

DB side effects:

1. `media_assets` に 1 件 insert する。
2. 初期値は `status = pending`。
3. `book_id = {album_id}` を固定で保存する。
4. `original_gcs_key` を発番して signed upload URL を返す。
5. `preview_url` はまだ返さない。

response 例:

```json
{
  "data": {
    "id": "2a24a7ea-ff27-4b07-8c56-9627114c5261",
    "status": "pending",
    "upload_url": "https://storage.googleapis.com/example-bucket/signed-url",
    "upload_headers": {
      "content-type": "image/heic"
    },
    "expires_at": "2026-04-11T01:37:00Z"
  },
  "meta": {
    "request_id": "req_123"
  }
}
```

error codes:

| 条件 | HTTP | code |
| --- | --- | --- |
| `file_name` / `mime_type` / `byte_size` が不正 | 422 | `VALIDATION_ERROR` |
| album が存在しない | 404 | `NOT_FOUND` |

#### `POST /albums/{album_id}/media/{media_id}/complete`

request:

```json
{}
```

validation:

- MVP では body 省略または `{}` のみ受け付ける。
- `pending` の media に対して server 側検査を開始する。
- `processing` または `ready` の media に対する再送は idempotent に current state を返す。
- `failed` または `deleted` の media に対する complete は 409 `MEDIA_STATUS_INVALID`。

DB side effects:

1. GCS 上の object 存在確認を行う。
2. server 側で画像を検査し、`mime_type`, `byte_size`, `width_px`, `height_px`, `captured_at`, `sha256` の canonical 値を確定する。
3. `media_assets` を `status = processing` に更新する。
4. 以後の response では client 申告値ではなく server 側検査値を正として返す。
5. background job を enqueue し、proxy 生成完了後に `status = ready`, `preview_url != null` に進める。失敗時は `status = failed` にする。

response 例:

```json
{
  "data": {
    "id": "2a24a7ea-ff27-4b07-8c56-9627114c5261",
    "file_name": "IMG_0012.HEIC",
    "mime_type": "image/heic",
    "byte_size": 4231987,
    "width_px": 3024,
    "height_px": 4032,
    "captured_at": "2026-03-21T02:12:00Z",
    "status": "processing",
    "preview_url": null,
    "created_at": "2026-04-11T01:32:00Z",
    "updated_at": "2026-04-11T01:32:20Z"
  },
  "meta": {
    "request_id": "req_123"
  }
}
```

error codes:

| 条件 | HTTP | code |
| --- | --- | --- |
| request body が `{}` 以外 | 422 | `VALIDATION_ERROR` |
| `failed` / `deleted` の media に complete | 409 | `MEDIA_STATUS_INVALID` |
| media が存在しない | 404 | `NOT_FOUND` |

#### `DELETE /albums/{album_id}/media/{media_id}`

使用中判定:

- `book_drafts.state_json` の slot から `media_id` が参照されている場合は使用中とみなす。
- 復元対象の `book_revisions.state_json` から `media_id` が参照されている場合も使用中とみなす。

DB side effects:

1. `status = deleted` 以外かつ未使用であれば `media_assets.status = deleted` に更新する。
2. 論理削除のみ行い、MVP では hard delete しない。
3. すでに `status = deleted` の場合は no-op で 204 を返す。

response:

- 成功時も既削除時も 204 No Content。

error codes:

| 条件 | HTTP | code |
| --- | --- | --- |
| current draft または revision で使用中 | 409 | `MEDIA_IN_USE` |
| media が存在しない | 404 | `NOT_FOUND` |

### 6.5 checkout-session

責務:

- Checkout 開始時点の revision を固定する
- `orders` を新規作成し、Stripe Checkout Session を発行する
- 価格・通貨・注文対象をサーバー側で確定する

主な request / response:

| API | request | response |
| --- | --- | --- |
| `POST /checkout-sessions` | header: `Idempotency-Key`, body: `album_id`, `success_url`, `cancel_url` | `order_id`, `revision_id`, `checkout_session_id`, `checkout_url`, `expires_at` |

checkout 時の `revision_id` 固定ルール:

1. `book_drafts` の最新状態を読む
2. Checkout に必要な必須条件を検証する
3. 現在の draft から新しい `book_revisions` を 1 件作る
4. その `revision_id` を `orders.revision_id` に保存する
5. 以後の印刷・再レンダリング・監査は必ず `orders.revision_id` を参照する

補足:

- 注文後に draft が編集されても、既存 order の `revision_id` は絶対に変えない。
- 同じ album で再度 checkout する場合は、新しい order と新しい frozen revision を作る。
- Stripe から Session 作成結果を受け取った時点で `orders.stripe_checkout_session_id` を保存する。
- checkout 固定用に作る revision の `source` は `checkout` とする。
- `amount_jpy` / `currency` はクライアント送信値を信用せず、サーバー側で決定して `orders` に保存する。

二重実行対策:

- `POST /checkout-sessions` は `Idempotency-Key` を必須とする。
- フロントエンドは「決済へ進む」1 回の操作につき 1 つの UUID を生成し、再送時も同じ key を使う。
- サーバーは `orders.checkout_idempotency_key` に保存し、同一 tenant かつ同一 key の再送では既存の `order / revision / checkout_session` を返す。
- Stripe Checkout Session 作成時にも同じ key を Stripe の idempotency key として渡す。
- Stripe Session 作成に失敗した場合は order / revision / key の保存を rollback し、同じ key で安全に再試行できる状態にする。

### 6.6 stripe webhook

責務:

- Stripe の署名付きイベントを検証する
- 決済結果を `orders` と `order_events` に反映する
- 冪等に処理する

受信対象イベント:

| Stripe event | order への反映 |
| --- | --- |
| `checkout.session.completed` | `pending_payment` → `paid` |
| `checkout.session.expired` | `pending_payment` → `expired` |
| `charge.refunded` または同等の返金イベント | `paid` → `refunded` |

レスポンス:

- 正常処理: 200
- 既処理イベントの再送: 200
- 署名エラー: 400
- 一時的障害: 500 を返し Stripe に再送させる

## 7. 重要ルール

### 7.0 books と orders の責務分離

- `books` は「何を編集しているか」を表す編集対象であり、`books.status` は編集ライフサイクルだけを持つ。
- `orders` は「何を注文してどこまで決済が進んだか」を表し、`orders.status` は注文ライフサイクルだけを持つ。
- paid order があっても `books.status` は自動で変えない。逆に `books.status` から決済状態を推測しない。

### 7.1 draft 保存時の楽観ロック

- `lock_version` は `book_drafts` の単調増加整数とする
- draft 保存と restore はどちらも `lock_version` を必須にする
- `updated_at` だけでは競合判定に使わない
- 競合時はサーバーで強制マージしない。クライアントに再取得を促す

### 7.2 `books.total_pages` の同期ルール

- `books.total_pages` の正本は `book_drafts.state_json.pages.length` から導出される値であり、クライアント送信値をそのまま正としない。
- `POST /albums` では初期 draft 生成時の `pages.length` を `books.total_pages` に保存する。
- `PUT /albums/{album_id}/draft` 成功時は `state_json.pages.length` で `books.total_pages` を再計算する。
- `POST /albums/{album_id}/revisions/{revision_id}/restore` 成功時も同じ式で `books.total_pages` を再計算する。
- MVP で許容するページ数は `30 / 50 / 70` のみ。

### 7.3 checkout 時に `revision_id` を固定する理由

- 注文後にユーザーが編集を続けても、注文内容を後から再現できるようにするため
- 印刷・返金・問い合わせ対応で「どの状態を買ったか」を説明可能にするため
- `orders` が `book_drafts` を直接参照すると、最新編集内容に引きずられて事故になるため
- `source=checkout` を持たせることで、注文固定用の revision を manual / autosave と区別できるため

### 7.4 webhook の冪等性方針

- `stripe_processed_events.stripe_event_id` を主キーにする
- webhook 受信時は、署名検証後に同一 transaction 内で以下を行う
  1. `stripe_processed_events` に `stripe_event_id` を insert
  2. insert が成功した場合だけ `orders` / `order_events` を更新する
  3. 主キー競合なら「既処理」とみなし何も更新せず 200 を返す
- `order_events` は append-only とし、同一イベント再送で二重記録しない

## 8. 実装メモ

- FastAPI の feature 単位では、`albums` / `editor` / `uploads` / `payment` の責務で router を分けてよい
- ただし API surface は本ドキュメントの resource 名を優先し、フロントエンドから見える URI は安定させる
- `render_jobs` と `vendor_sync_logs` は Phase 2-2 の内部 API / 非公開 API として扱い、MVP 公開 API には含めない
