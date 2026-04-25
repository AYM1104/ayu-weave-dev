# 実装計画: `/auth/callback` コールバック処理

作成日: 2026-04-26

関連仕様: [`docs/specs/auth-spec.md`](../specs/auth-spec.md)

---

## 現状のおさらい

| 項目 | 状態 |
|---|---|
| `/auth/login` (Cognito 開始) | ✅ 実装済み |
| `/auth/callback` (本タスク) | ❌ 未実装 |
| `/auth/logout` | ❌ 未実装 |
| `auth_sessions` テーブル (backend) | ❌ 未実装（モデル/マイグレーションなし） |
| 保護ページのミドルウェア | ❌ 未実装 (`/dashboard` ノーガード) |
| JWT 検証ライブラリ (`jose` 等) | ❌ 未導入 |
| 環境変数 | ✅ `COGNITO_APP_CLIENT_SECRET` / `AUTH_COOKIE_SECRET` を `.env.local.example` に定義済み |

`/auth/login` で `state` / `codeVerifier` / `returnTo` を `path=/auth` の HttpOnly Cookie に保存しているため、`/auth/callback` でその値を読める前提が成立している。

---

## 仕様と現状のギャップ（要確認ポイント）

[auth-spec.md §5](../specs/auth-spec.md) が明確に「**Cognito の access/id/refresh token は backend の `auth_sessions` に暗号化保存し、ブラウザには不透明な session key の HttpOnly Cookie のみを配布する**」と規定しているが、backend 側にはまだ何も無い状態。

`/auth/callback` を仕様通り完成させるには frontend だけでは閉じない。

### 進め方の選択肢

| 案 | スコープ | メリット | デメリット |
|---|---|---|---|
| **A. 仕様準拠フル実装** | backend `auth_sessions` テーブル + マイグレーション + session 発行 API → frontend callback はそれを呼ぶ | 仕様一致。後戻りなし | PR が大きい。backend 着手が必要 |
| **B. frontend 内で完結する暫定セッション** | 暗号化した token を HttpOnly Cookie に直接格納（`AUTH_COOKIE_SECRET` で AES-GCM）。仕様の「server-side session store」部分は TODO とする | frontend だけで動くログイン体験が完成。並行開発できる | 仕様 §5「ブラウザは生 token を持たない」と局所的にズレる（後で差し替え必要） |
| **C. 最小実装** | callback を作って token 交換だけ実施 → 一旦 `returnTo` にリダイレクトのみ。セッション保存は別 PR | 一番小さく出せる | ログイン後の状態が保持されないので「動くログイン」にならない |

---

## 実装ステップ（案 A: 仕様準拠フル実装 前提）

### Phase A-1: backend `auth_sessions` 基盤

1. SQLAlchemy モデル: `backend/app/core/models/auth_session.py`
   - スキーマは [`data_model.md` L31-48](../specs/data_model.md) に準拠
2. Alembic マイグレーション
3. `backend/app/features/auth/`：
   - `service.py` — session 作成・参照・失効
   - `crypto.py` — `AUTH_COOKIE_SECRET` で refresh/access token を AES-GCM 暗号化
   - `router.py` — `POST /api/v1/internal/auth/sessions`（Next.js BFF からのみ）
4. backend の `config.py` に `AUTH_COOKIE_SECRET` を追加

### Phase A-2: frontend `/auth/callback`

1. **新規ファイル** `frontend/src/app/auth/callback/route.ts`

   処理の流れ:
   1. `code` / `state` / `error` をクエリから取得
   2. Cookie の `weave_oauth_state` と照合 → 不一致なら `/login?error=state_mismatch`
   3. Cognito `/oauth2/token` に POST
      - Basic 認証 (`client_id:client_secret`)
      - `grant_type=authorization_code` / `code` / `redirect_uri` / `code_verifier`
   4. `id_token` を JWKS で検証（`iss`, `aud=client_id`, `exp`, `token_use=id`） → `sub` 取得
   5. backend の session 作成 API を呼んで session_key を発行
   6. `weave_oauth_*` の一時 Cookie をクリア
   7. `weave_session` HttpOnly Cookie に session_key を載せて `returnTo` に 302

2. **新規ファイル** `frontend/src/lib/auth/callback.ts`
   - `exchangeCodeForTokens()` — Cognito トークンエンドポイントへの POST
   - `verifyIdToken()` — JWKS ベースの JWT 検証
   - `createBffSession()` — backend session 作成 API の呼び出し
   - `getSessionCookieOptions()` — `weave_session` Cookie の設定値

3. **新規依存**: `jose`
   - Cognito 公式・Next.js 公式ドキュメントでも採用
   - Edge Runtime 互換
   - JWKS リモートフェッチに対応

4. **共有定数** (`frontend/src/lib/auth/callback.ts` か `login.ts` に追記):
   - `AUTH_SESSION_COOKIE = "weave_session"`
   - Cookie オプション: `path=/`, `secure`, `sameSite=lax`, `maxAge` は refresh token 寿命（30日）

### Phase A-3: 保護ページのガード（別 PR でも可）

- `frontend/src/middleware.ts` を新規作成
- `auth-spec.md §3` に明記された 8 経路を `/login?returnTo=...` にリダイレクト
  - `/dashboard`, `/album/upload`, `/album/info`, `/album/design`, `/album/edit`
  - `/cart`, `/account/settings`, `/account/orders`
- `weave_session` Cookie の有無で判定（値の検証は Route Handler 側で行う）

---

## 今回やらないこと（明示）

- `/auth/logout` の実装
- backend の JWT 検証ミドルウェア（access token を受けて検証する側）
- ユーザー自動作成（`users` / `tenants` / `tenant_memberships`）
- token refresh ロジック（access token 失効時の再取得）
- 規約同意ログ（`user_policy_consents`）

---

## テスト観点

| ケース | 期待挙動 |
|---|---|
| 正常系 | `/auth/login` → Cognito → `/auth/callback` → `returnTo`（デフォルト `/dashboard`） |
| `state` 不一致 | `/login?error=state_mismatch` にリダイレクト |
| Cognito でキャンセル | `error=access_denied` クエリで callback 着 → `/login?error=...` |
| token 交換失敗 | `/login?error=token_exchange_failed` にリダイレクト |
| JWT 署名不正 | セッション作成しない → `/login?error=...` |
| `returnTo` オープンリダイレクト | `normalizeReturnTo()` で既に対策済み（`login.ts` から流用） |

---

## 確認事項（実装前に決める必要があるもの）

- [x] 進め方は A 
- [x] ブランチ運用：callback 実装は別ブランチを切る
- [x] `jose` 導入
- [x] backend と frontend の PR を分ける
