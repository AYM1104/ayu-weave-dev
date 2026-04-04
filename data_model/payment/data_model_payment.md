# データモデル設計 v2

> **このドキュメントについて**
>
> `data_model.md`（v1）を `plan_feedback.md` のレビュー結果をもとに修正したものです。
> 変更箇所には `[変更]` タグと理由を記載しています。
> v1 からの差分を把握したい場合は `plan_feedback.md` の「修正後の実装計画サマリー」も参照してください。

---

## フェーズ構成

> **[v1→v2 追加]** フェーズ命名を明示しました。
> **理由：** 「Phase 1, 2」という表現では、決済（2-1）と印刷連携（2-2）のどちらを指すか曖昧になりチームが混乱するため。決済と印刷連携はどちらも「注文フロー」に属する密接な機能なので Phase 2 の前半・後半として整理しました。

| フェーズ | スコープ | 概要 |
| --- | --- | --- |
| **Phase 1** | フォトブック編集・保存 | ユーザー登録〜写真アップロード〜アルバム編集〜保存まで。**決済機能は含まない** |
| **Phase 2-1** | Stripe基本決済 | Checkout Session 発行・Webhook 受信・冪等性保証。`pending_payment` → `paid` 遷移ロジック |
| **Phase 2-2** | 印刷ベンダー連携・発送 | 印刷会社への発注・追跡番号取得・発送通知。`render_queued` 以降のステータス遷移 |

---

# ユーザー管理

## users（個人を識別する）

- users は「ログインする人」を表すテーブル。
- 編集データ、フォトブック、写真そのものはここには持たず、それらは別テーブルで管理します。

| カラム名 | データ型 | 制約 | 意味 | 用途 |
| --- | --- | --- | --- | --- |
| id | UUID | PK, NOT NULL | アプリ内でのユーザー固有ID | 内部主キー。ほかのテーブルから `user_id` として参照する |
| firebase_uid | VARCHAR(255) | UNIQUE, NOT NULL | Firebase上のユーザーID | Firebase上のユーザーとアプリ内ユーザーを紐づけるために使う |
| last_login_at | TIMESTAMP WITH TIME ZONE | NULL | 最後にログインした日時 | アクティブユーザーの把握や運用上の確認に使う |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | ユーザー作成日時 | いつアカウントが作られたかを記録する |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | ユーザー情報の最終更新日時 | レコード更新時刻の管理に使う |

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

---

# フォトブック管理

## books（編集対象の1冊を表す）

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | フォトブック固有のID | 本の主キー |
| tenant_id | UUID | どの tenant に属する本か | 作業領域との紐付け |
| owner_user_id | UUID nullable | 主担当ユーザー | 誰が作成・管理している本かを示す補助情報 |
| title | VARCHAR(255) | 本のタイトル | UI表示や一覧表示に使う |
| total_pages | INTEGER | 総ページ数 | 30/50/70 ページなどの本仕様を表す |
| status | ENUM(BookStatus) | 本全体の状態 | draft, rendering, rendered, archived などを管理する |
| created_at | TIMESTAMP WITH TIME ZONE | 作成日時 | 本が作られた日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | 更新日時 | 本レコードの最終更新日時 |

## book_drafts（現在編集中の最新状態を保存する）

- 履歴保存には使わない。常に「今の状態」1件だけを持つ

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| book_id | UUID | どの本の現在状態か | books と 1:1 で紐づくキー |
| tenant_id | UUID | どの tenant のデータか | 権限や所属確認に使う |
| state_json | JSONB | 現在の編集中データ本体 | ページ構成、slotAssignments、テキストなどを保存する |
| schema_version | INTEGER | state_json の構造バージョン | 将来データ移行が必要になった時の備え |
| lock_version | INTEGER | 楽観ロック用バージョン | 複数タブ・共同編集時の競合検知に使う |
| updated_by_user_id | UUID nullable | 最後に更新した user | 誰が直近で編集したかを記録する |
| created_at | TIMESTAMP WITH TIME ZONE | draft 作成日時 | draft レコードの作成時刻 |
| updated_at | TIMESTAMP WITH TIME ZONE | 最新更新日時 | autosave の最終更新時刻 |

## book_revisions（保存時点のスナップショット履歴を残す）

- 編集のタイミングで自動保存
- 10個前まで戻れる

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | revision 固有のID | 履歴レコードの主キー |
| book_id | UUID | どの本の履歴か | books に紐づく |
| tenant_id | UUID | どの tenant の履歴か | 所属と権限確認に使う |
| revision_no | INTEGER | 履歴番号 | 本の中で何番目の revision かを表す |
| source | ENUM(RevisionSource) | どう作られた revision か | autosave, manual, render などの由来を区別する |
| state_json | JSONB | 保存時点の編集内容 | 後から復元したり render の元にしたりする |
| schema_version | INTEGER | state_json の構造バージョン | 古い revision の互換性維持に使う |
| created_by_user_id | UUID nullable | revision を作った user | 誰が保存や操作をしたかの記録 |
| created_at | TIMESTAMP WITH TIME ZONE | revision 作成日時 | 履歴時系列の管理 |

## media_assets（アップロード済み写真のメタデータを管理する）

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | 画像アセット固有のID | 画像メタデータの主キー |
| tenant_id | UUID | どの tenant の画像か | 作業領域との紐付け |
| uploaded_by_user_id | UUID nullable | 画像をアップロードした user | 誰が追加したかの記録 |
| original_gcs_key | VARCHAR(512) | オリジナル画像の保存先キー | GCS 上の元ファイルを参照する |
| proxy_gcs_key | VARCHAR(512) nullable | 軽量版画像の保存先キー | プレビューや配信用の画像を参照する |
| file_name | VARCHAR(255) | 元ファイル名 | 一覧表示やサポート確認に使う |
| mime_type | VARCHAR(128) | 画像の MIME type | jpeg/png などの形式判定に使う |
| byte_size | BIGINT | ファイルサイズ | 容量チェックや制限管理に使う |
| width_px | INTEGER nullable | 画像幅 | 解像度判定に使う |
| height_px | INTEGER nullable | 画像高さ | 解像度判定に使う |
| captured_at | TIMESTAMP WITH TIME ZONE nullable | 撮影日時 | 並び替えや整理に使える |
| sha256 | VARCHAR(64) nullable | ファイルハッシュ | 重複検知や整合性確認に使う |
| status | ENUM(MediaAssetStatus) | 画像の処理状態 | pending, processing, ready, failed, deleted を表す |
| created_at | TIMESTAMP WITH TIME ZONE | 作成日時 | 画像レコード作成時刻 |
| updated_at | TIMESTAMP WITH TIME ZONE | 更新日時 | 処理状態更新などの時刻 |

## render_jobs（PDF生成処理の実行履歴と状態を管理する）

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | render ジョブ固有のID | ジョブの主キー |
| tenant_id | UUID | どの tenant のジョブか | 所属と権限確認に使う |
| book_id | UUID | どの本を render したか | books に紐づく |
| revision_id | UUID nullable | どの revision を元に render したか | 出力対象の固定版を示す |
| status | ENUM(RenderJobStatus) | render 処理の状態 | queued, processing, completed, failed などを表す |
| body_pdf_gcs_key | VARCHAR(512) nullable | 本文PDFの保存先キー | 生成済みPDFの参照先 |
| cover_pdf_gcs_key | VARCHAR(512) nullable | 表紙PDFの保存先キー | 生成済み表紙PDFの参照先 |
| error_message | TEXT nullable | エラー内容 | 失敗時の調査や表示に使う |
| created_by_user_id | UUID nullable | render を開始した user | 誰が実行したかの記録 |
| created_at | TIMESTAMP WITH TIME ZONE | ジョブ作成日時 | render 開始要求の時刻 |
| started_at | TIMESTAMP WITH TIME ZONE nullable | 実行開始日時 | キュー待ちと実処理開始を分けるために使う |
| finished_at | TIMESTAMP WITH TIME ZONE nullable | 実行終了日時 | 完了・失敗時刻の記録 |

---

# 注文管理

## orders（注文の現在状態を管理する）

- コンテンツのスナップショットは別テーブル（`book_revisions`）に委ねる。
- 配送先情報は自社 DB に保存しない（→ 個人情報取り扱い方針参照）。

### OrderStatus 定義

> **[v1→v2 変更]** フェーズ列の表記を「Phase 1 / 2」から「Phase 1 / 2-1 / 2-2」に変更しました。
> **理由：** 決済と印刷連携を同じ「Phase 2」と呼ぶとどこまで実装するかが曖昧になるため、サブフェーズを明示しました。
>
> **[v1→v2 変更]** Phase 1 での `draft` の扱いを「実装」から「enum定義のみ」に変更しました。
> **理由：** Phase 1 は決済機能を含まないため、注文レコード自体を作成しません。スキーマだけ定義しておき、遷移ロジックは Phase 2-1 で実装します。

| ステータス | 意味 | Phase |
| --- | --- | --- |
| `draft` | カート・編集中 | Phase 1（**enum定義のみ**。遷移ロジックは Phase 2-1） |
| `pending_payment` | Stripe Checkout に遷移後（決済待ち） | Phase 2-1 実装 |
| `paid` | 決済完了 | Phase 2-1 実装 |
| `expired` | Checkout セッション期限切れ | Phase 2-1 実装 |
| `cancelled` | 決済前キャンセル | Phase 2-1 実装 |
| `refunded` | 決済後返金 | Phase 2-1 実装 |
| `render_queued` | 入稿 PDF 生成待ち | Phase 2-2 以降（enum定義のみ） |
| `submitted` | 印刷ベンダーへ発注済み | Phase 2-2 以降（enum定義のみ） |
| `producing` | 製作中 | Phase 2-2 以降（enum定義のみ） |
| `shipped` | 発送済み | Phase 2-2 以降（enum定義のみ） |
| `completed` | 受取完了 | Phase 2-2 以降（enum定義のみ） |
| `failed` | 技術的失敗 | Phase 2-2 以降（enum定義のみ） |

### Phase 2-1 ステータス遷移図

> **[v1→v2 変更]** 遷移図の見出しを「Phase 1」から「Phase 2-1」に変更しました。
> **理由：** 遷移ロジックの実装タイミングを正確に示すため。

```
draft → pending_payment → paid
                        ↘ expired   (Checkout セッション期限切れ)
                        ↘ cancelled (決済前キャンセル)
         (paid から)   → refunded   (決済後返金)
```

### カラム定義

> **[v1→v2 変更まとめ]** orders テーブルへの主な変更点：
>
> | 変更種別 | v1 のカラム名 | v2 のカラム名 | 理由 |
> | --- | --- | --- | --- |
> | リネーム | `payment_intent_id` | `stripe_payment_intent_id` | どのサービスのIDか名前だけで分かるようにするため |
> | リネーム + UNIQUE追加 | `checkout_session_id` | `stripe_checkout_session_id` | 同上。1注文に対しSessionが複数紐づく設計ミスを防ぐためUNIQUEを追加 |
> | 追加 | （なし） | `amount_jpy` | 料金体系が未確定のためカラムのみ定義し、値はNULL許容・設定ロジックはPhase 2-1 |
> | 追加 | （なし） | `currency` | 将来の多通貨対応に備えてカラムを確保 |
> | 削除 | `image_cleanup_needed` | （削除） | `order_events` テーブルのイベント履歴で代替できるため不要 |
> | 追加しない | `shipping_address` | （追加しない） | 個人情報は自社DBに持たない方針（→ 個人情報取り扱い方針参照） |

| **カラム名** | **データ型** | **意味** | **用途** | **備考** |
| --- | --- | --- | --- | --- |
| id | UUID | 注文固有の ID | 注文の主キー | |
| tenant_id | UUID | どの tenant に属する注文か | 作業領域との紐付け | |
| book_id | UUID | どの本の注文か | 注文対象のフォトブックとの紐付け | |
| revision_id | UUID | 注文時点のリビジョン | 注文時のコンテンツスナップショットを固定。FK に RESTRICT を設定し削除を防止 | |
| render_job_id | UUID nullable | 入稿用 PDF のジョブ | 注文確定後に生成した印刷用 PDF への参照 | Phase 2-2 で使用 |
| created_by_user_id | UUID nullable | 注文したユーザー | 誰が注文を作成したかの記録 | |
| status | ENUM(OrderStatus) | 注文の現在ステータス | 上記 OrderStatus 定義を参照 | |
| amount_jpy | INTEGER nullable | 注文金額（税込日本円） | Stripe と突合するための金額記録 | **[v1→v2 追加]** 料金体系未確定のため Phase 1 では NULL のまま。設定ロジックは Phase 2-1 で実装 |
| currency | VARCHAR(3) nullable | 通貨コード | 'JPY' 固定（将来の多通貨対応に備える） | **[v1→v2 追加]** 将来の多通貨対応の布石としてカラムのみ定義 |
| client_reference_id | VARCHAR(255) | weave 側で発行する注文 UUID | Stripe Checkout Session 作成時に渡す。Webhook イベントで注文を特定するために使う | UNIQUE NOT NULL。Phase 2-1 で書き込み |
| stripe_checkout_session_id | VARCHAR(255) nullable | Stripe Checkout Session ID | 返金・Customer Portal 等の Stripe API 操作に必要 | **[v1→v2 リネーム]** `checkout_session_id` → `stripe_checkout_session_id`。UNIQUE 制約追加。Phase 2-1 の Webhook で保存 |
| stripe_payment_intent_id | VARCHAR(255) nullable | Stripe Payment Intent ID | 返金処理等で必要になる Stripe 側の決済識別子 | **[v1→v2 リネーム]** `payment_intent_id` → `stripe_payment_intent_id` |
| vender_order_id | VARCHAR(255) nullable | 印刷ベンダー側の注文 ID | 印刷ベンダーへ発注後に受け取る識別子 | Phase 2-2 で使用 |
| tracking_number | VARCHAR(255) nullable | 配送追跡番号 | 印刷ベンダーから返される追跡番号 | Phase 2-2 で使用 |
| created_at | TIMESTAMP WITH TIME ZONE | 作成日時 | 注文が作られた日時 | |
| updated_at | TIMESTAMP WITH TIME ZONE | 更新日時 | 注文レコードの最終更新日時 | |

> **[v1→v2 削除]** `image_cleanup_needed`（Boolean）カラムを削除しました。
> **理由：** 「クリーンアップが必要かどうか」の状態は `order_events` テーブルのイベント履歴（例：`completed` イベントの有無）で判断できます。専用フラグを持つと、イベント履歴との二重管理になりズレが生じるリスクがあります。

> **[v1→v2 追加しない]** `shipping_address` カラムは追加しません。
> **理由：** 個人情報は自社DBに持たない方針のため（→ 個人情報取り扱い方針参照）。配送先住所は Stripe Checkout Session に入力されStripeのサーバーに保持されます。印刷発注時（Phase 2-2）に `stripe_checkout_session_id` を使って Stripe API から都度取得します。

---

> **`client_reference_id` と `stripe_checkout_session_id` の違い**
>
> | | client_reference_id | stripe_checkout_session_id |
> | --- | --- | --- |
> | 発行者 | weave（アプリ側） | Stripe |
> | 設定タイミング | 注文作成時（Stripe Session 作成前） | Checkout Session 作成後 |
> | Webhook での参照 | ✅ すべての checkout イベントに含まれる | ✅ session.id として含まれる |
> | 返金・Portal 操作 | ❌ 使えない | ✅ Session ID として必要 |
> | 用途 | Webhook → 注文の特定 | Stripe API 操作（返金等） |

---

## order_events（注文のビジネスイベント履歴を記録する）

> **[v1→v2 新規追加]** このテーブルを新設しました。
> **理由：**
> 1. `image_cleanup_needed` フラグのような「状態フラグ」の代替。注文に何が起きたかをイベントとして記録すれば、フラグを使わずとも状態が追跡できます。
> 2. CS（カスタマーサポート）対応時に「この注文はいつどうなったか」を時系列で確認できます。
> 3. 将来の監査ログ・トラブルシュートの基盤になります。
>
> **実装タイミング：** テーブルのスキーマは Phase 1 で作成。書き込みロジックは Phase 2-1（決済イベント受信時）から開始。

- append-only（追記のみ。既存レコードは更新・削除しない）
- 技術的な API 通信ログは持たない（`vendor_sync_logs` で管理）

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

---

## stripe_processed_events（処理済み Stripe Webhook イベントを記録する）

> **[v1→v2 新規追加]** このテーブルを新設しました。
> **理由：** Stripe の Webhook はネットワーク障害やタイムアウトにより**同じ通知が2回以上届くことがあります**。「既に paid なら何もしない」というコードチェックだけでは、複数サーバーが同時に同じイベントを受信した場合（スケールアウト時）に二重処理が起きる可能性があります。
> このテーブルに Stripe Event ID を主キーとして保存することで、DB 制約レベルで二重処理を防ぎます（冪等性の保証）。
>
> **実装タイミング：** テーブルのスキーマは Phase 1 で作成。書き込みロジックは Phase 2-1 で実装。

- Webhook の冪等性をDB制約レベルで保証するためのテーブル。
- 同一の Stripe Event ID が再配信された場合にスキップするために使う。

```
Webhookが届く
  ↓
stripe_processed_events に この event_id が存在する？
  → Yes: スキップ（二重処理を防ぐ）
  → No:  処理を実行 → event_id をテーブルに保存（主キー制約で重複INSERT は自動的にエラー）
```

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| stripe_event_id | VARCHAR(255) | Stripe Webhook Event ID | 主キー（PK）。`evt_xxx` 形式 |
| processed_at | TIMESTAMP WITH TIME ZONE | 処理日時 | いつ処理したかの記録 |

---

## vendor_sync_logs（外部ベンダーとの API 通信ログを記録する）

- ビジネスレベルのステータス変更は持たない。
- リトライ制御とデバッグのための技術ログ。
- Phase 2-2（印刷ベンダー連携）で使用。

| **カラム名** | **データ型** | **意味** | **用途** |
| --- | --- | --- | --- |
| id | UUID | ログ固有の ID | ログの主キー |
| order_id | UUID | どの注文の通信か | 注文との紐付け |
| vendor | VARCHAR(50) | ベンダー名 | 'fujiplus' など。将来の複数ベンダー対応に備える |
| action | VARCHAR(100) | API アクションの種別 | 'submit_order', 'check_status', 'get_tracking' など |
| request_payload | JSONB nullable | 送信したリクエスト内容 | デバッグ・障害調査用に API リクエストボディを保存 |
| response_payload | JSONB nullable | 受信したレスポンス内容 | デバッグ・障害調査用に API レスポンスボディを保存 |
| http_status | INTEGER nullable | HTTP ステータスコード | 200, 400, 503 等。通信結果の概要把握に使う |
| success | BOOLEAN | 通信の成否 | リトライ対象の判定に使う（false のものを再送キューに入れる） |
| retry_count | INTEGER | リトライ回数 | 何回目の試行かを記録。上限判定に使う |
| error_message | TEXT nullable | エラーメッセージ | 失敗時のエラー内容。運用対応やアラートに使う |
| created_at | TIMESTAMP WITH TIME ZONE | 通信日時 | API 呼び出しのタイムスタンプ |

---

# 個人情報取り扱い方針

> **[v1→v2 新規追加]** このセクションを新設しました。
> **理由：** 「個人情報をどう扱うか」はコードだけでなく文書として明示しておく必要があります。将来メンバーが増えたとき、方針が伝わらないとバラバラな実装になります。また、プライバシーポリシー作成の基礎資料にもなります。

weave における個人情報の取り扱い方針を定義する。**「個人情報は最小限かつ期限付きで保持する」** を基本方針とする。

| データ種別 | 保存場所 | 方針 |
| --- | --- | --- |
| **写真（media_assets / GCS）** | GCS（一時的） | サービス提供のために一時的に預かる。保持期限は別途決定（TODO） |
| **配送先住所** | 自社 DB に**保存しない** | Stripe API から都度取得する。Phase 2-2 のベンダー発注時に Stripe API を呼び出す |
| **ユーザー認証情報（名前・メール等）** | Firebase Authentication | Firebase Auth に委任。自社 DB には `firebase_uid` のみ保持 |
| **カード情報** | 自社では**一切保持しない** | Stripe Checkout により処理。PCI DSS 対応済み（SAQ A スコープ） |

## 配送先住所について

- Stripe Checkout Session のデータは **Stripe 側に無期限で保存され、API から取得可能**。
- 自社 DB に住所を保存すると削除タイミングが曖昧になるため、保存しない。
- ベンダー（Fujiplus 等）への発注時は、`orders.stripe_checkout_session_id` を使って Stripe API から住所を取得して発注する（Phase 2-2 実装）。
