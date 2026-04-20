# ディレクトリ構成と命名ルール

## 概要

本プロジェクトは **モノレポ構成** を採用し、`frontend/` と `backend/` をトップレベルで分離します。  
3人チーム開発を前提に、機能（feature）単位でフォルダを分割し、メンバー間のコンフリクトを最小化する構成です。

---

## ディレクトリ構成

```
weave-dev/
├── frontend/                      ... Next.js Webアプリケーション
│   └── src/
│       ├── app/                   ... App Router（ページ・ルーティング）
│       ├── features/              ... 機能別モジュール（後述）
│       ├── components/            ... 共通UIコンポーネント（Button, Modal 等）
│       ├── hooks/                 ... 共通カスタムフック
│       ├── lib/                   ... API設定・ユーティリティ関数
│       ├── store/                 ... 共通の状態管理（Zustand ストア）
│       └── types/                 ... 共通の TypeScript 型定義
│
├── backend/                       ... FastAPI バックエンド
│   ├── app/
│   │   ├── core/                  ... 設定・DB接続・ミドルウェア
│   │   │   └── models/            ... DBモデル定義（SQLAlchemy）
│   │   ├── features/              ... 機能別モジュール（後述）
│   │   └── main.py                ... FastAPI エントリーポイント
│   ├── alembic/                   ... DBマイグレーション
│   └── tests/                     ... テストコード
│
├── infra/                         ... インフラ設定（AWS 等）
├── docs/                          ... 設計書・仕様書
│   ├── specs/                     ... 技術仕様
│   └── plans/                     ... 計画書
├── scripts/                       ... 自動化スクリプト
└── data_model/                    ... データモデル設計（既存）
```

---

## features/ の構成ルール

`features/` は機能単位でフォルダを分割します。  
各メンバーは自身が担当する feature フォルダ内で作業することで、コンフリクトを抑えます。

### フロントエンド `frontend/src/features/`

```
features/
├── auth/                ... 認証（ログイン・ログアウト）
│   ├── components/      ... この機能専用のコンポーネント
│   ├── hooks/           ... この機能専用のフック
│   └── types.ts         ... この機能専用の型定義
├── editor/              ... エディタ（キャンバス操作）
│   ├── components/
│   ├── hooks/
│   ├── store/           ... エディタ専用のZustandストア
│   └── types.ts
└── payment/             ... 決済
    ├── components/
    ├── hooks/
    └── types.ts
```

### バックエンド `backend/app/features/`

```
features/
├── auth/                ... 認証
│   ├── router.py        ... APIエンドポイント定義
│   ├── service.py       ... ビジネスロジック
│   └── schemas.py       ... Pydantic スキーマ（リクエスト/レスポンス）
├── editor/              ... エディタ
│   ├── router.py
│   ├── service.py
│   └── schemas.py
└── payment/             ... 決済
    ├── router.py
    ├── service.py
    └── schemas.py
```

---

## DBモデルの配置ルール

| 種類 | 配置場所 | 説明 |
|------|----------|------|
| DBモデル (SQLAlchemy) | `backend/app/core/models/` | テーブル定義。リレーション管理のため集約 |
| APIスキーマ (Pydantic) | `backend/app/features/xxx/schemas.py` | 各機能のリクエスト・レスポンス型 |
| マイグレーション | `backend/alembic/` | Alembic による差分管理 |

**理由**: DBモデルはテーブル間の外部キー参照が跨ぐため、一箇所に集約した方がマイグレーション管理が安全です。  
一方、APIスキーマは機能ごとに独立しているため、各 feature 内に配置します。

---

## テスト配置方針

| 領域 | 種類 | 配置場所 | 命名規則 |
|------|------|----------|----------|
| フロントエンド | ユニット・結合 (Vitest) | 各対象ファイルと同じディレクトリに併置（コロケーション） | `*.test.ts`, `*.test.tsx` |
| フロントエンド | E2E (Playwright) | `frontend/e2e/` 配下に集約 | `*.spec.ts` |
| バックエンド | ユニット・API統合 (pytest) | `backend/tests/` 配下に `app/` の構造を模して配置 | `test_*.py` |

**理由**:
- **フロントエンド（単体）**: コンポーネントとそのテストが近いことで、モジュールの独立性が高まり、機能修正時のテスト追従がしやすくなります。
- **E2E / バックエンド**: ブラウザ操作全体やデータベースを跨ぐシステム結合テストが多くなるため、専用の `e2e/` や `tests/` に集約する方が管理しやすくなります。

---

## 命名ルール

### ファイル名

| 対象 | ルール | 例 |
|------|--------|-----|
| コンポーネント (`.tsx`) | PascalCase | `PhotoCard.tsx`, `LoginForm.tsx` |
| フック・ユーティリティ (`.ts`) | camelCase | `useAuth.ts`, `formatDate.ts` |
| Python | snake_case | `auth_service.py`, `user_model.py` |
| ディレクトリ (frontend) | kebab-case | `user-profile/`, `order-history/` |
| ディレクトリ (backend) | snake_case | `user_profile/`, `order_history/` |

### コード内

| 対象 | ルール | 例 |
|------|--------|-----|
| React コンポーネント | PascalCase | `EditorCanvas`, `PhotoCard` |
| TypeScript 関数・変数 | camelCase | `handleClick`, `userData` |
| TypeScript 型・インターフェース | PascalCase | `UserProfile`, `EditorState` |
| Python クラス | PascalCase | `UserModel`, `PaymentService` |
| Python 関数・変数 | snake_case | `create_user`, `payment_amount` |
| 定数 | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE`, `API_BASE_URL` |
| 環境変数 | UPPER_SNAKE_CASE | `DATABASE_URL`, `NEXT_PUBLIC_API_URL` |

### ブランチ名

```
feature/issue-{番号}-{概要}    例: feature/issue-3-tech-stack
fix/issue-{番号}-{概要}        例: fix/issue-12-login-error
```
