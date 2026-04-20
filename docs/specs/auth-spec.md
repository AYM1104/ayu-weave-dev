# 認証仕様（MVP）

## 1. 目的

本ドキュメントは、weave の MVP における認証方式の正本を定義する。

- 認証基盤は Amazon Cognito を採用する
- フロントエンドは Next.js BFF を前提に、安全に認証を扱える方式にする

関連ドキュメント:

- `docs/specs/tech-stack.md`
- `docs/specs/user-flow.md`
- `docs/specs/mvp-api.md`
- `docs/specs/data_model.md`

---

## 2. 採用方針

### 認証基盤

- 認証基盤は `Amazon Cognito User Pool` を使う
- リージョンは他 AWS 基盤に合わせて `ap-northeast-1` を前提とする
- `Amazon Cognito Identity Pool` は MVP では使わない
- Firebase Authentication は使わない

### ログイン手段

- MVP のログイン手段は `Google` のみとする
- メールアドレス + パスワード認証は MVP では実装しない
- Apple ログイン、LINE ログイン等の追加 IdP は MVP スコープ外とする
- MFA は MVP スコープ外とする

### OAuth フロー

- フローは `Authorization Code Flow + PKCE` を使う
- Cognito の app client は `confidential client` とし、client secret は Next.js サーバー側だけで保持する
- Cognito の app client は `AllowedOAuthFlows=code` のみを有効化する
- Cognito User Pool API/SDK の username/password 系 `ExplicitAuthFlows` は MVP の認証導線では使わない
- `/oauth2/authorize` 呼び出し時は `identity_provider=Google` を付与し、Google 認証画面へ直接遷移させる

---

## 3. 画面と導線

### `/login`

- ログイン画面は自前 UI で実装する
- CTA は `Google で続行` のみとする
- CTA は Next.js の `/auth/login` に遷移し、認証開始はサーバー側で行う
- 見出しは「アルバム作成には新規登録が必要です」を基本文言とする
- 「新規登録」と「ログイン」は UI 上の説明だけを分け、実際の認証フローは同一とする
- 利用規約とプライバシーポリシーへのリンクを画面内に表示する
- 規約文言は「登録することで当社の利用規約・プライバシーポリシーに同意したものとみなします」を基本とする

### `/auth/login`

- Next.js Route Handler として実装する認証開始用エンドポイントとする
- サーバー側で `code_verifier`, `code_challenge`, `state` を生成する
- `state`, `code_verifier`, `returnTo` は一時 cookie または server-side session に保持する
- その後 Cognito の `/oauth2/authorize` に 302 リダイレクトする

### `/auth/callback`

- Cognito からの認可コード受け取り専用の Next.js Route Handler とする
- サーバー側で `state` を検証し、Cognito の `/oauth2/token` と認可コード交換を行う
- token 交換成功後は server-side session を作成し、`HttpOnly` cookie を発行する
- 通常ユーザーが手動で開く画面ではなく、失敗時は `/login` に戻してエラーメッセージを表示する

### 保護画面

- 少なくとも以下の画面はログイン必須とする
- `/dashboard`
- `/album/upload`
- `/album/info`
- `/album/design`
- `/album/edit`
- `/cart`
- `/account/settings`
- `/account/orders`

### 未ログイン時の遷移

- 保護画面に未ログインで到達した場合は `/login?returnTo=<元のURL>` にリダイレクトする
- `returnTo` にはクエリパラメータ込みの相対 URL を入れる
- 認証完了後は `returnTo` があればその URL に戻し、なければ `/dashboard` に遷移する

### ログアウト

- ログアウト導線は Next.js の `/auth/logout` を経由する
- `/auth/logout` では `auth_sessions` と session cookie を失効させる
- その後 Cognito の `/logout` に遷移し、終了後は `/` に戻す
- Cognito の `/logout` は Google 側セッションまでは確実に切らないため、次回ログイン時にアカウント選択が省略されることは許容する

---

## 4. 認証フロー

### ログイン開始

1. ユーザーが `/login` の `Google で続行` を押す
2. ブラウザは `/auth/login?returnTo=<元のURL>` に遷移する
3. Next.js サーバー側で `code_verifier`, `code_challenge`, `state` を生成し、一時 cookie または server-side session に保持する
4. サーバーがブラウザを Cognito の `/oauth2/authorize` にリダイレクトする

主なリクエストパラメータ:

- `response_type=code`
- `client_id=<cognito_app_client_id>`
- `redirect_uri=<frontend_origin>/auth/callback`
- `scope=openid email profile`
- `code_challenge_method=S256`
- `code_challenge=<generated_value>`
- `state=<generated_value>`
- `identity_provider=Google`

### コールバック処理

1. `/auth/callback` で `code` と `state` を受け取る
2. Next.js サーバー側で保持していた `state` と一致するか検証する
3. Cognito の `/oauth2/token` に対して、`client_id`, `client_secret`, `code_verifier` を用いて認可コードを交換し、`access token`, `id token`, `refresh token` を取得する
4. 取得した token を server-side session store に保存し、`HttpOnly` cookie を発行する
5. `returnTo` または `/dashboard` にリダイレクトする

### 初回ログイン時の自動作成

- 初回の認証済み API アクセス時に、バックエンドは `sub` をキーにローカル user を自動作成する
- 同時に `tenant` と `tenant_membership` を作成する
- toC 前提のため MVP では `1 user = 1 tenant` とする

### ログイン失敗時

- 認証キャンセル、token 交換失敗、`state` 不一致、JWT 検証失敗時はセッションを作らない
- `/login` に戻し、再試行可能なエラー表示を行う

---

## 5. セッションとトークン

### API に使うトークン

- Next.js BFF からバックエンド API に送るのは `access token` とする
- 送信方法は `Authorization: Bearer <access_token>` とする
- ブラウザは Cognito token を直接保持せず、FastAPI に直接送らない
- `id token` は必要に応じて Next.js サーバー側の表示情報取得にのみ使い、API 認証には使わない

### バックエンドでの検証

- バックエンドは Cognito User Pool の JWKS を使って JWT 署名を検証する
- あわせて以下を必須チェックとする
- `iss`
- `token_use=access`
- `client_id`
- `exp`
- ユーザー識別子は `sub` を正とする

### ブラウザ保存方針

- MVP ではブラウザには `HttpOnly` の session cookie のみを保持する
- `access token`, `id token`, `refresh token` は server-side session store (`auth_sessions`) に暗号化して保存する
- ブラウザ JavaScript から Cognito token を参照できない構成にする
- セッション cookie の失効または refresh token の期限切れ後は再ログインを要求する

### 推奨 TTL

- `access token`: 1 時間
- `id token`: 1 時間
- `refresh token`: 30 日

> 継続期間はブラウザタブの寿命ではなく、session cookie と refresh token の失効方針に依存する。

---

## 6. データ保存方針

### 自社 DB に必須で持つもの

- `auth_provider`
- `auth_subject`
- `last_login_at`
- 利用規約 / プライバシーポリシーへの同意ログ

### 自社 DB に必須で持たないもの

- Google アカウントのパスワード
- カード情報
- 配送先住所
- 名前、メールアドレス等のプロフィール情報

> 名前やメールアドレスは Cognito 側の属性として扱い、MVP では自社 DB の必須項目にしない。

### 規約同意

- 初回登録時に `利用規約` と `プライバシーポリシー` への同意を記録する
- 同意は画面文言表示だけで終わらせず、DB に履歴を残す
- 同意ログは少なくとも `user_id`, `policy_type`, `policy_version`, `consented_at` を持つ

---

## 7. セキュリティ要件

- Cognito callback URL と sign-out URL は事前登録した URL のみ許可する
- 本番環境の callback URL と sign-out URL は HTTPS のみ許可する
- `state` は CSRF 対策として必須とする
- PKCE の `code_challenge_method` は `S256` を必須とする
- `client secret` は Next.js サーバー側の secret manager または未追跡 env のみで保持し、ブラウザへ露出しない
- JWT は署名検証なしで信用しない
- ブラウザには `HttpOnly` cookie のみを配布するが、CSP や cookie 属性設定による XSS / CSRF 対策は前提とする

---

## 8. MVP スコープ外

- メールアドレス + パスワード認証
- MFA
- Apple / LINE などの追加 IdP
- 複数ユーザーが同じ tenant に所属する招待制
- 管理者向け権限 UI

---

## 付録: Dev 環境変数

### 確定済み Dev Cognito 設定

- AWS Account ID: `139185876274`
- AWS region: `ap-northeast-1`
- User Pool ID: `ap-northeast-1_yU5Ikc7F1`
- App Client ID: `1g4549boovrjkthiheamgtk09`
- App Client type: `confidential client`
- Allowed OAuth flows: `code`
- Cognito domain: `https://ap-northeast-1yu5ikc7f1.auth.ap-northeast-1.amazoncognito.com`
- Frontend origin: `http://localhost:3000`
- Callback URL: `http://localhost:3000/auth/callback`
- Sign-out URL: `http://localhost:3000/`
- Google identity provider name: `Google`

### フロントエンド / Next.js 用

| 変数名 | 例 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Next.js から FastAPI を呼ぶベース URL |
| `APP_BASE_URL` | `http://localhost:3000` | Next.js 自身の origin |
| `COGNITO_REGION` | `ap-northeast-1` | Cognito のリージョン |
| `COGNITO_USER_POOL_ID` | `ap-northeast-1_yU5Ikc7F1` | User Pool ID |
| `COGNITO_APP_CLIENT_ID` | `1g4549boovrjkthiheamgtk09` | App Client ID |
| `COGNITO_APP_CLIENT_SECRET` | `<set-in-local-secret>` | Next.js サーバー側から `/oauth2/token` を呼ぶための App Client secret。ブラウザには露出しない |
| `COGNITO_DOMAIN` | `https://ap-northeast-1yu5ikc7f1.auth.ap-northeast-1.amazoncognito.com` | `/oauth2/authorize`, `/oauth2/token`, `/logout` のベース URL |
| `COGNITO_ISSUER` | `https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_yU5Ikc7F1` | token `iss` の期待値 |
| `COGNITO_JWKS_URL` | `https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_yU5Ikc7F1/.well-known/jwks.json` | JWT 検証用 JWKS |
| `COGNITO_IDENTITY_PROVIDER` | `Google` | `/oauth2/authorize` に付ける `identity_provider` |
| `AUTH_CALLBACK_URL` | `http://localhost:3000/auth/callback` | Cognito callback URL |
| `AUTH_SIGNOUT_URL` | `http://localhost:3000/` | Cognito sign-out 後の戻り先 |
| `AUTH_COOKIE_SECRET` | `<long-random-string>` | session cookie 署名・暗号化用 secret |

### バックエンド / FastAPI 用

| 変数名 | 例 | 用途 |
| --- | --- | --- |
| `AWS_REGION` | `ap-northeast-1` | AWS 共通リージョン |
| `AWS_S3_BUCKET` | `weave-dev-images` | 画像保存先 S3 bucket |
| `PUBLIC_API_BASE_URL` | `http://localhost:8000` | バックエンド自身のベース URL |
| `COGNITO_REGION` | `ap-northeast-1` | Cognito のリージョン |
| `COGNITO_USER_POOL_ID` | `ap-northeast-1_yU5Ikc7F1` | User Pool ID |
| `COGNITO_APP_CLIENT_ID` | `1g4549boovrjkthiheamgtk09` | `client_id` 検証用 |
| `COGNITO_ISSUER` | `https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_yU5Ikc7F1` | JWT `iss` 検証用 |
| `COGNITO_JWKS_URL` | `https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_yU5Ikc7F1/.well-known/jwks.json` | JWT 署名検証用 JWKS |

### 運用メモ

- `COGNITO_APP_CLIENT_SECRET` は AWS Console から確認した値をローカル secret manager または `secrets/` 配下の未追跡ファイルで管理する
- `client_secret_*.json` や `.env.local` の実値は Git にコミットしない
