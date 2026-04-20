# ユーザー管理

## users（個人を識別する）

- users は「ログインする人」を表すテーブル。
- 編集データ、フォトブック、写真そのものはここには持たず、それらは別テーブルで管理します。

| カラム名 | データ型 | 制約 | 意味 | 用途 |
| --- | --- | --- | --- | --- |
| id | UUID | PK, NOT NULL | アプリ内でのユーザー固有ID | 内部主キー。ほかのテーブルから `user_id` として参照する |
| auth_provider | VARCHAR(50) | NOT NULL | どの認証基盤でログインしたか | MVP では `cognito_google` 固定。将来の IdP 追加に備える |
| auth_subject | VARCHAR(255) | UNIQUE, NOT NULL | 認証基盤上のユーザー識別子 | Cognito access token の `sub` を保存し、アプリ内 user と紐づける |
| last_login_at | TIMESTAMP WITH TIME ZONE | NULL | 最後にログインした日時 | アクティブユーザーの把握や運用上の確認に使う |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | ユーザー作成日時 | いつアカウントが作られたかを記録する |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | ユーザー情報の最終更新日時 | レコード更新時刻の管理に使う |

## user_policy_consents（規約同意の履歴を管理する）

- ログイン画面での利用規約・プライバシーポリシー同意を保存する
- 文言表示だけで終わらせず、どの版にいつ同意したかを記録する

| カラム名 | データ型 | 制約 | 意味 | 用途 |
| --- | --- | --- | --- | --- |
| id | UUID | PK, NOT NULL | 同意履歴の固有ID | 内部主キー |
| user_id | UUID | FK, NOT NULL | 対象 user | 誰の同意かを示す |
| policy_type | VARCHAR(50) | NOT NULL | どのポリシーか | `terms` / `privacy` を区別する |
| policy_version | VARCHAR(50) | NOT NULL | 同意した版 | 規約改定時の差分管理に使う |
| consented_at | TIMESTAMP WITH TIME ZONE | NOT NULL | 同意日時 | いつ同意したかの証跡に使う |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | レコード作成日時 | 監査用途に使う |

## auth_sessions（サーバー側 session を保持する）

- Next.js BFF が発行するログイン session の正本を保持する
- ブラウザには生の Cognito token を持たせず、cookie に入る不透明な session key の照合先として使う

| カラム名 | データ型 | 制約 | 意味 | 用途 |
| --- | --- | --- | --- | --- |
| id | UUID | PK, NOT NULL | session の固有ID | 内部主キー |
| user_id | UUID | FK, NOT NULL | 対象 user | どの user の session かを示す |
| session_key_hash | VARCHAR(255) | UNIQUE, NOT NULL | cookie 内 session key のハッシュ | 生の session key を DB に保存しないために使う |
| refresh_token_ciphertext | TEXT | NOT NULL | 暗号化済み refresh token | access token の再取得に使う |
| access_token_ciphertext | TEXT | NULL | 暗号化済み access token | 直近 token の再利用キャッシュに使う |
| access_token_expires_at | TIMESTAMP WITH TIME ZONE | NULL | access token 有効期限 | refresh 要否の判定に使う |
| refresh_token_expires_at | TIMESTAMP WITH TIME ZONE | NOT NULL | refresh token 有効期限 | 再ログイン要否の判定に使う |
| last_seen_at | TIMESTAMP WITH TIME ZONE | NOT NULL | 最終利用日時 | 非アクティブ session の整理に使う |
| revoked_at | TIMESTAMP WITH TIME ZONE | NULL | 失効日時 | 明示 logout や強制失効の記録に使う |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | 作成日時 | 監査用途に使う |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | 更新日時 | token 更新や利用時刻の管理に使う |

## tenants（所属するチームを表す）

- toC向けの場合は、1 user = 1 tenant
- 将来toB向けになった際に1 つの tenant に複数人が所属するチーム利用を想定

| カラム名 | データ型 | 制約 | 意味 | 用途 |
| --- | --- | --- | --- | --- |
| id | UUID | PK, NOT NULL | tenantの固有ID | 内部主キー。ほかのテーブルから `tenant_id` として参照する |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | tenant作成日時 | tenantの作成時刻を記録する |

## tenant_memberships（user が tenant にどう所属しているかを管理する）

| カラム名 | データ型 | 制約 | 意味 | 用途 |
| --- | --- | --- | --- | --- |
| id | UUID | PK, NOT NULL | membership の固有ID | 内部主キー |
| tenant_id | UUID | FK, NOT NULL | 所属先 tenant | どの tenant への所属かを表す |
| user_id | UUID | FK, NOT NULL | 所属 user | どの user の所属かを表す |
| role | VARCHAR(50) | NOT NULL | tenant内の役割 | 権限制御に使う |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | 所属作成日時 | いつ所属が作られたかを記録する |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | 所属更新日時 | role 変更などの更新時刻管理に使う |

# フォトブック管理

## books（編集対象の1冊を表す）

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | フォトブック固有のID | フォトブックの主キー |
| tenant_id | UUID | どの tenant に属する本か | 作業領域との紐付け |
| owner_user_id | UUID nullable | 主担当ユーザー | 誰が作成・管理している本かを示す補助情報 |
| title | VARCHAR(255) | 本のタイトル | UI表示や一覧表示に使う |
| total_pages | INTEGER | 総ページ数 | 30/50/70 ページなどの本仕様を表す |
| status | ENUM(BookStatus) | 本全体の状態 | draft, rendering, rendered, archived などを管理する |
| created_at | TIMESTAMP WITH TIME ZONE | 作成日時 | フォトブックが作られた日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | 更新日時 | フォトブックの最終更新日時 |

### BookStatus 定義

| ステータス | 意味 | MVPでの扱い |
| --- | --- | --- |
| `draft` | 編集中 | MVPで実際に使用する初期ステータス |
| `rendering` | PDF / 入稿データ生成中 | Phase 2-2 以降で使用 |
| `rendered` | PDF / 入稿データ生成完了 | Phase 2-2 以降で使用 |
| `archived` | 保管済み・編集対象外 | Phase 2-2 以降で使用 |

### MVP 運用ルール

- `books` は編集対象そのものを表す。決済や配送の進行は `orders` で管理し、`books.status` には持ち込まない。
- `total_pages` は一覧や注文確認で使う要約値とし、ページ構成の正本は `book_drafts.state_json` に置く。
- MVP では `total_pages` を album 更新 API で直接変更しない。draft 保存成功時に `state_json` の内容から `books.total_pages` を同期する。

## book_drafts（現在編集中の最新状態を保存する）

- 履歴保存には使わない。常に「今の状態」1件だけを持つ
- MVP ではページ構成の正本。保存成功時に `books.total_pages` を同一 transaction で同期する

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| book_id | UUID | どの本の現在状態か | books と 1:1 で紐づくキー |
| tenant_id | UUID | どの tenant のデータか | 権限や所属確認に使う |
| state_json | JSONB | 現在の編集中データ本体 | ページ構成、slotAssignments、テキストなどを保存する |
| schema_version | INTEGER | state_json の構造バージョン | 将来データ移行が必要になった時の備え |
| lock_version | INTEGER | 楽観ロック用バージョン | 複数タブ・共同編集時の競合検知に使う |
| updated_by_user_id | UUID nullable | 最後に更新した user | 誰が直近で編集したかを記録する |
| created_at | TIMESTAMP WITH TIME ZONE | draft 作成日時 | draft レコードの作成時刻 |
| updated_at | TIMESTAMP WITH TIME ZONE | 最新更新日時 | autosave の最終更新時刻 |

## book_revisions（保存時点のスナップショット履歴を残す）

- 編集のタイミングで自動保存
- 10個前まで戻れる
- restore は current draft を置き換えるだけで、新しい revision は作らない

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | revision 固有のID | 履歴レコードの主キー |
| book_id | UUID | どの本の履歴か | books に紐づく |
| tenant_id | UUID | どの tenant の履歴か | 所属と権限確認に使う |
| revision_no | INTEGER | 履歴番号 | 本の中で何番目の revision かを表す |
| source | ENUM(RevisionSource) | どう作られた revision か | autosave, manual, checkout, render などの由来を区別する |
| state_json | JSONB | 保存時点の編集内容 | 後から復元したり render の元にしたりする |
| schema_version | INTEGER | state_json の構造バージョン | 古い revision の互換性維持に使う |
| created_by_user_id | UUID nullable | revision を作った user | 誰が保存や操作をしたかの記録 |
| created_at | TIMESTAMP WITH TIME ZONE | revision 作成日時 | 履歴時系列の管理 |

### RevisionSource 定義

| source | 意味 | MVPでの扱い |
| --- | --- | --- |
| `autosave` | 自動保存で作られた revision | 実装時に必要なら使用 |
| `manual` | ユーザー明示操作で作った revision | `POST /albums/{album_id}/revisions` で使用 |
| `checkout` | 注文固定用に作った revision | `POST /checkout-sessions` で使用 |
| `render` | render 用に確定した revision | Phase 2-2 以降で使用 |

> restore は source を持たない。MVP では restore 時に新しい revision を追加しないため。

## media_assets（アップロード済み写真のメタデータを管理する）

- MVP では media は album 専属とし、1 media を複数 album で共有しない
- API パス `/albums/{album_id}/media` と整合させるため、`book_id` を必須で持つ

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | 画像アセット固有のID | 画像メタデータの主キー |
| book_id | UUID | どの album の画像か | albums API のスコープと一致させる。MVPでは 1 media = 1 album |
| tenant_id | UUID | どの tenant の画像か | 作業領域との紐付け |
| uploaded_by_user_id | UUID nullable | 画像をアップロードした user | 誰が追加したかの記録 |
| original_s3_key | VARCHAR(512) | オリジナル画像の保存先キー | S3 上の元ファイルを参照する |
| proxy_s3_key | VARCHAR(512) nullable | 軽量版画像の保存先キー | プレビューや配信用の画像を参照する |
| file_name | VARCHAR(255) | 元ファイル名 | 一覧表示やサポート確認に使う |
| mime_type | VARCHAR(128) | 画像の MIME type | jpeg/png などの形式判定に使う |
| byte_size | BIGINT | ファイルサイズ | 容量チェックや制限管理に使う |
| width_px | INTEGER nullable | 画像幅 | 解像度判定に使う |
| height_px | INTEGER nullable | 画像高さ | 解像度判定に使う |
| captured_at | TIMESTAMP WITH TIME ZONE nullable | 撮影日時 | 並び替えや整理に使える |
| sha256 | VARCHAR(64) nullable | ファイルハッシュ | 重複検知や整合性確認に使う |
| status | ENUM(MediaAssetStatus) | 画像の処理状態 | pending, processing, ready, failed, deleted を表す |
| created_at | TIMESTAMP WITH TIME ZONE | 作成日時 | 画像レコード作成時刻 |
| updated_at | TIMESTAMP WITH TIME ZONE | 更新日時 | 処理状態更新などの時刻 |

## render_jobs（PDF生成処理の実行履歴と状態を管理する）

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | render ジョブ固有のID | ジョブの主キー |
| tenant_id | UUID | どの tenant のジョブか | 所属と権限確認に使う |
| book_id | UUID | どの本を render したか | books に紐づく |
| revision_id | UUID nullable | どの revision を元に render したか | 出力対象の固定版を示す |
| status | ENUM(RenderJobStatus) | render 処理の状態 | queued, processing, completed, failed などを表す |
| body_pdf_s3_key | VARCHAR(512) nullable | 本文PDFの保存先キー | 生成済みPDFの参照先 |
| cover_pdf_s3_key | VARCHAR(512) nullable | 表紙PDFの保存先キー | 生成済み表紙PDFの参照先 |
| error_message | TEXT nullable | エラー内容 | 失敗時の調査や表示に使う |
| created_by_user_id | UUID nullable | render を開始した user | 誰が実行したかの記録 |
| created_at | TIMESTAMP WITH TIME ZONE | ジョブ作成日時 | render 開始要求の時刻 |
| started_at | TIMESTAMP WITH TIME ZONE nullable | 実行開始日時 | キュー待ちと実処理開始を分けるために使う |
| finished_at | TIMESTAMP WITH TIME ZONE nullable | 実行終了日時 | 完了・失敗時刻の記録 |

# 注文管理

## orders（注文の現在状態を管理する）

- コンテンツのスナップショットは別テーブル（`book_revisions`）に委ねる。
- 配送先情報は自社 DB に保存しない（個人情報取り扱い方針参照）。発注時に Stripe API から都度取得する。
- `orders` は注文・決済の進行管理だけを持つ。編集状態は `books` / `book_drafts` で管理する。

### OrderStatus 定義

| ステータス | 意味 | Phase |
| --- | --- | --- |
| `draft` | カート・編集中 | Phase 1（enum 定義のみ。遷移ロジックは Phase 2-1） |
| `pending_payment` | Stripe Checkout に遷移後（決済待ち） | Phase 2-1 実装 |
| `paid` | 決済完了 | Phase 2-1 実装 |
| `expired` | Checkout セッション期限切れ | Phase 2-1 実装 |
| `cancelled` | 決済前キャンセル | Phase 2-1 実装 |
| `refunded` | 決済後返金 | Phase 2-1 実装 |
| `render_queued` | 入稿 PDF 生成待ち | Phase 2-2 以降（enum 定義のみ） |
| `submitted` | 印刷ベンダーへ発注済み | Phase 2-2 以降（enum 定義のみ） |
| `producing` | 製作中 | Phase 2-2 以降（enum 定義のみ） |
| `shipped` | 発送済み | Phase 2-2 以降（enum 定義のみ） |
| `completed` | 受取完了 | Phase 2-2 以降（enum 定義のみ） |
| `failed` | 技術的失敗 | Phase 2-2 以降（enum 定義のみ） |

### Phase 2-1 ステータス遷移図

```
draft → pending_payment → paid
                        ↘ expired   (Checkout セッション期限切れ)
                        ↘ cancelled (決済前キャンセル)
         (paid から)   → refunded   (決済後返金)
```

> Phase 1 では `draft` の enum 定義のみ行い、遷移ロジックは実装しません。

### カラム定義

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | 注文固有の ID | 注文の主キー |
| tenant_id | UUID | どの tenant に属する注文か | 作業領域との紐付け |
| book_id | UUID | どの本の注文か | 注文対象のフォトブックとの紐付け |
| revision_id | UUID | 注文時点のリビジョン | 注文時のコンテンツスナップショットを固定する。FK に RESTRICT を設定し削除を防止 |
| render_job_id | UUID nullable | 入稿用 PDF のジョブ | 注文確定後に生成した印刷用 PDF への参照 |
| created_by_user_id | UUID nullable | 注文したユーザー | 誰が注文を作成したかの記録 |
| status | ENUM(OrderStatus) | 注文の現在ステータス | 上記 OrderStatus 定義を参照 |
| amount_jpy | INTEGER nullable | 注文金額（税込日本円） | Stripe と突合するための金額記録。**料金体系未確定のため Phase 1 では NULL 許容・設定ロジックなし。Phase 2-1 で実装** |
| currency | VARCHAR(3) | 通貨コード | 'JPY' 固定（将来の多通貨対応に備える） |
| checkout_idempotency_key | VARCHAR(255) UNIQUE NOT NULL | Checkout 作成要求の冪等キー | `POST /checkout-sessions` の `Idempotency-Key` を保存し、同一操作の再送で order / revision / Stripe Session の重複作成を防ぐ |
| client_reference_id | VARCHAR(255) UNIQUE NOT NULL | weave 側で発行する注文 UUID | Stripe Checkout Session 作成時に `client_reference_id` として渡す。Webhook イベントで注文を特定するために使う |
| stripe_checkout_session_id | VARCHAR(255) UNIQUE nullable | Stripe Checkout Session ID | 返金・Customer Portal 等の Stripe API 操作に必要。Checkout Session 作成時に保存し、Webhook でも突合に使う |
| stripe_payment_intent_id | VARCHAR(255) nullable | Stripe Payment Intent ID | 返金処理等で必要になる Stripe 側の決済識別子 |
| vendor_order_id | VARCHAR(255) nullable | 印刷ベンダー側の注文 ID | 印刷ベンダーへ発注後に受け取る識別子 |
| tracking_number | VARCHAR(255) nullable | 配送追跡番号 | 印刷ベンダーから返される追跡番号 |
| created_at | TIMESTAMP WITH TIME ZONE | 作成日時 | 注文が作られた日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | 更新日時 | 注文レコードの最終更新日時 |

> **client_reference_id と stripe_checkout_session_id の違い**
>
> | | client_reference_id | stripe_checkout_session_id |
> | --- | --- | --- |
> | 発行者 | weave（アプリ側） | Stripe |
> | 設定タイミング | 注文作成時（Stripe Session 作成前） | Checkout Session 作成後 |
> | Webhook での参照 | ✅ すべての checkout イベントに含まれる | ✅ session.id として含まれる |
> | 返金・Portal 操作 | ❌ 使えない | ✅ Session ID として必要 |
> | 用途 | Webhook → 注文の特定 | Stripe API 操作（返金等） |

> **`checkout_idempotency_key` の役割**
>
> `checkout_idempotency_key` は「同じ checkout 開始操作の再送かどうか」を判定するためのキーです。`client_reference_id` は order 自体を識別する ID であり、用途が異なります。

<aside>
📌

memo（`revision_id` の役割）

`revision_id` を `orders` に持つことで「注文した時点の編集内容を永久に再現できる」ことが保証されます。

- **これがないと何が困るか：**
    1. ユーザーが注文 → この時点で30ページのアルバムが完成
    2. 注文後に気が変わって編集を続ける（book_drafts が上書きされる）
    3. 印刷会社への発注に使った内容が「注文時の状態」なのか
    「最新の編集状態」なのかわからなくなる
- **`revision_id` があると：**
    
    注文時         → book_revisions にスナップショットを保存
    orders.revision_id → そのスナップショットを指す
    
    注文後に編集   → book_drafts が変わっても revision は不変
    印刷発注時     → orders.revision_id → 注文時の state_json を使う ← 確実
    
- **実際に役立つシーン：**
    
    
    | **シーン** | **revision_id があると** |
    | --- | --- |
    | 印刷ミスのクレーム対応 | 「注文時はこの内容でした」と即座に証明できる |
    | 注文後に編集を続けたユーザー | 再注文しても前回の注文内容が混ざらない |
    | PDF 再生成が必要になった時 | 同じ内容で確実に再レンダリングできる |
    | 開発中のバグ調査 | 「この注文はどの状態で入稿したか」がログから追える |
</aside>

## order_events（注文のビジネスイベント履歴を記録する）

- append-only。技術的な API 通信ログは持たない（`vendor_sync_logs` で管理）

### OrderEventType 定義

`created` / `pending_payment` / `paid` / `expired` / `cancelled` / `refunded` / `render_queued` / `submitted` / `producing` / `shipped` / `completed` / `failed`

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | イベント固有の ID | イベントの主キー |
| order_id | UUID | どの注文のイベントか | 注文との紐付け |
| event_type | ENUM(OrderEventType) | イベントの種別 | 上記 OrderEventType 定義を参照 |
| old_status | VARCHAR(50) nullable | 変更前ステータス | ステータス変遷の「どこから」を記録 |
| new_status | VARCHAR(50) nullable | 変更後ステータス | ステータス変遷の「どこへ」を記録 |
| metadata | JSONB nullable | イベント固有の補足データ | Stripe webhook body や補足情報を構造化せず保存 |
| note | TEXT nullable | 人間向けメモ | CS 対応時の経緯メモや運用上の備考 |
| created_by_user_id | UUID nullable | イベントを起こしたユーザー | 手動操作時の記録。システム起因の場合は null |
| created_at | TIMESTAMP WITH TIME ZONE | イベント発生日時 | いつ何が起きたかの時系列を追跡する |

## stripe_processed_events（処理済み Stripe Webhook イベントを記録する）

- Webhook の冪等性をDB制約レベルで保証するためのテーブル。
- 同一の Stripe Event ID が再配信された場合にスキップするために使う。

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| stripe_event_id | VARCHAR(255) | Stripe Webhook Event ID | 主キー。`evt_xxx` 形式 |
| processed_at | TIMESTAMP WITH TIME ZONE | 処理日時 | いつ処理したかの記録 |

---

## vendor_sync_logs（外部ベンダーとの API 通信ログを記録する）

- ビジネスレベルのステータス変更は持たない。
- リトライ制御とデバッグのための技術ログ

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | ログ固有の ID | ログの主キー |
| order_id | UUID | どの注文の通信か | 注文との紐付け |
| vendor | VARCHAR(50) | ベンダー名 | 'fujiplus' など。将来の複数ベンダー対応に備える |
| action | VARCHAR(100) | API アクションの種別 | 'submit_order', 'check_status', 'get_tracking' など、何の API を呼んだか |
| request_payload | JSONB nullable | 送信したリクエスト内容 | デバッグ・障害調査用に API リクエストボディを保存 |
| response_payload | JSONB nullable | 受信したレスポンス内容 | デバッグ・障害調査用に API レスポンスボディを保存 |
| http_status | INTEGER nullable | HTTP ステータスコード | 200, 400, 503 等。通信結果の概要把握に使う |
| success | BOOLEAN | 通信の成否 | リトライ対象の判定に使う（false のものを再送キューに入れる） |
| retry_count | INTEGER | リトライ回数 | 何回目の試行かを記録。上限判定に使う |
| error_message | TEXT nullable | エラーメッセージ | 失敗時のエラー内容。運用対応やアラートに使う |
| created_at | TIMESTAMP WITH TIME ZONE | 通信日時 | API 呼び出しのタイムスタンプ |

---

# 個人情報取り扱い方針

weave における個人情報の取り扱い方針を定義する。「**個人情報は最小限かつ期限付きで保持する**」を基本方針とする。

| データ種別 | 保存場所 | 方針 |
| --- | --- | --- |
| **写真（media_assets / AWS S3）** | AWS S3（一時的） | サービス提供のために一時的に預かる。保持期限は別途決定（TODO） |
| **配送先住所** | 自社 DB に**保存しない** | Stripe API から都度取得する。Phase 2-2 のベンダー発注時に Stripe API を呼び出す |
| **ユーザー認証情報（ログインセッション・ソーシャルログイン）** | Amazon Cognito + 自社 DB (`auth_sessions`) | 認証処理は Cognito に委任しつつ、自社 DB には `auth_provider`, `auth_subject`, 規約同意ログ、暗号化した server-side session 情報のみ保持 |
| **カード情報** | 自社では**一切保持しない** | Stripe Checkout により処理。PCI DSS 対応済み（SAQ A スコープ） |

## 配送先住所について

- Stripe Checkout Session のデータは **Stripe 側に無期限で保存され、API から取得可能**。
- 自社 DB に住所を保存すると削除タイミングが曖昧になるため、保存しない。
- ベンダー（Fujiplus 等）への発注時は、`orders.stripe_checkout_session_id` を使って Stripe API から住所を取得して発注する（Phase 2-2 実装）。
