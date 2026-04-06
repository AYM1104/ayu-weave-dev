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

- `data` は常にオブジェクトで返す。
- 一覧 API は `meta.next_cursor` を返せる形にする。
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
| albums | `POST` | `/albums` | 新規 album と空 draft を作る |
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
- 新規作成時に空の draft を 1 件同時に作る
- `books.total_pages` は一覧・注文確認のための要約値として持ち、ページ構成の正本は持たない

主な request / response:

| API | request | response |
| --- | --- | --- |
| `POST /albums` | `title`, `total_pages` | `album.id`, `title`, `total_pages`, `status`, `draft.lock_version=0` |
| `GET /albums` | `cursor?`, `limit?` | album summary の配列 |
| `GET /albums/{album_id}` | なし | 1件の album summary |
| `PATCH /albums/{album_id}` | `title?` | 更新後 album summary |

補足:

- wedding 日付、名前、テンプレート選択は `PATCH /albums/{album_id}` では更新しない。`draft.state_json` で扱う。
- `total_pages` は album 作成時に初期 draft を作るためだけに受け取り、以後は `PUT /albums/{album_id}/draft` で更新する。
- 採用理由: ページ構成の正本を draft に寄せ、`PATCH /albums` と二重管理しないため。

### 6.2 draft

責務:

- エディタが参照する「今の状態」を 1 レコードで持つ
- `lock_version` を使って楽観ロックを行う
- 不変履歴は持たず、履歴は `revisions` に任せる

主な request / response:

| API | request | response |
| --- | --- | --- |
| `GET /albums/{album_id}/draft` | なし | `state_json`, `schema_version`, `lock_version`, `updated_at` |
| `PUT /albums/{album_id}/draft` | `state_json`, `schema_version`, `lock_version` | 更新後 `state_json`, 新しい `lock_version`, `updated_at` |

`PUT /albums/{album_id}/draft` の保存ルール:

- クライアントは直前に取得した `lock_version` を必ず送る。
- サーバーは `WHERE book_id = :id AND lock_version = :lock_version` で更新する。
- 更新成功時は `lock_version = lock_version + 1` とする。
- 更新成功時は `state_json` のページ構成から `books.total_pages` を同一 transaction で更新する。
- 更新件数 0 件なら 409 `DRAFT_VERSION_CONFLICT` を返す。
- 409 の `details` には `current_lock_version` と `draft.updated_at` を含め、クライアントが再読み込み判断できる形にする。

### 6.3 revisions

責務:

- 復元用の不変スナップショットを保存する
- order 作成や障害調査で参照できる固定版を残す
- 最大 10 件を復元対象として扱う
- checkout 用の固定 revision は `source=checkout` で識別する

主な request / response:

| API | request | response |
| --- | --- | --- |
| `GET /albums/{album_id}/revisions` | `limit?` | `revision_id`, `revision_no`, `source`, `created_at` の配列 |
| `POST /albums/{album_id}/revisions` | 任意で `note` | `source=manual` の revision summary |
| `POST /albums/{album_id}/revisions/{revision_id}/restore` | `lock_version` | 復元後 draft の `state_json`, 新しい `lock_version` |

復元ルール:

- restore は current draft の上書きなので、`draft` と同じく `lock_version` 競合チェックを行う。
- restore 実行時は対象 revision の `state_json` を `book_drafts` にコピーし、`lock_version` をインクリメントする。
- restore 実行時は `books.total_pages` も復元後 draft に合わせて同一 transaction で更新する。
- MVP では restore 時に新しい revision を追加しない。現状態を残したい場合は restore 前に `POST /albums/{album_id}/revisions` を明示的に呼ぶ。

### 6.4 media

責務:

- 画像本体ではなくメタデータを管理する
- 画像アップロードは GCS へ直接送る
- エディタで使える状態 (`ready`) になるまでの処理状態を返す
- MVP では 1 media = 1 album とし、別 album への付け替えや共有は扱わない

主な request / response:

| API | request | response |
| --- | --- | --- |
| `GET /albums/{album_id}/media` | なし | `media[]` |
| `POST /albums/{album_id}/media/uploads` | `file_name`, `mime_type`, `byte_size`, `sha256?` | `media_id`, `upload_url`, `upload_headers`, `expires_at` |
| `POST /albums/{album_id}/media/{media_id}/complete` | `width_px?`, `height_px?`, `captured_at?` | 更新後 media summary |
| `DELETE /albums/{album_id}/media/{media_id}` | なし | 204 No Content |

アップロードルール:

1. `POST /media/uploads` で `media_assets` を `pending` で作成し、signed URL を返す
2. クライアントが GCS へ直接 PUT/POST する
3. `POST /media/{media_id}/complete` を呼ぶ
4. サーバー側検査開始時に `processing`、完了後に `ready`、失敗時に `failed` にする
5. `media_assets.book_id` は path の `album_id` で固定し、後から別 album に付け替えない

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

### 7.2 checkout 時に `revision_id` を固定する理由

- 注文後にユーザーが編集を続けても、注文内容を後から再現できるようにするため
- 印刷・返金・問い合わせ対応で「どの状態を買ったか」を説明可能にするため
- `orders` が `book_drafts` を直接参照すると、最新編集内容に引きずられて事故になるため
- `source=checkout` を持たせることで、注文固定用の revision を manual / autosave と区別できるため

### 7.3 webhook の冪等性方針

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
