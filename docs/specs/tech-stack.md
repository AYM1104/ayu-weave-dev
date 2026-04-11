# 技術スタック

## 概要

Weave はフォトアルバムエディタのWebアプリケーションです。  
フロントエンド（Next.js）とバックエンド（FastAPI）を分離したモノレポ構成で開発します。

---

## 採用技術一覧

### フロントエンド (`frontend/`)

| カテゴリ | 技術 | 採用理由 |
|----------|------|----------|
| フレームワーク | Next.js 16.1 (App Router) + React 19 | React ベースで SSR/SSG を柔軟に選択可能。App Router による直感的なルーティング |
| 言語 | TypeScript | 型安全性によりチーム開発時のバグを早期発見 |
| スタイリング | Tailwind CSS v4 | ユーティリティファーストで高速なUI構築。デザイントークンとの統合が容易 |
| アイコン | Lucide React | 軽量で統一感のあるアイコンセット |
| キャンバス描画 | react-konva (Konva) | 写真配置・編集に必要な高性能 2D キャンバス |
| 状態管理 | Zustand + Immer | 軽量かつ直感的。Immer で不変性を保ちながらスムーズに状態更新 |
| API通信 | Axios | インターセプターやエラーハンドリングが充実 |
| 認証 (クライアント) | Firebase (Google OAuth) | Google 認証を最小コストで実装可能 |
| ローカルストレージ | idb (IndexedDB) | 画像データのオフラインキャッシュに利用 |
| ユニットテスト | Vitest + React Testing Library | Vite ベースで高速。React コンポーネントのテストに最適 |
| E2Eテスト | Playwright | クロスブラウザ対応の信頼性の高い E2E テスト |

### バックエンド (`backend/`)

| カテゴリ | 技術 | 採用理由 |
|----------|------|----------|
| フレームワーク | FastAPI (Python 3.13) | 非同期対応・自動 OpenAPI ドキュメント生成。Python 型ヒントとの親和性が高い |
| サーバー | Uvicorn | ASGI 対応の高速サーバー |
| ORM | SQLAlchemy (asyncio) | Python の標準的な ORM。非同期対応で高パフォーマンス |
| DB ドライバ | asyncpg | PostgreSQL 向け高速な非同期ドライバ |
| マイグレーション | Alembic | SQLAlchemy と統合されたDBマイグレーション管理 |
| 認証 (サーバー) | firebase-admin | Firebase トークンのサーバーサイド検証 |
| クラウドストレージ | Amazon S3 | 画像ファイル等のリモート保存 |
| 画像処理 | Pillow | 画像のリサイズ・変換処理 |
| PDF生成 | ReportLab | 印刷用データの書き出し |
| バリデーション | Pydantic | FastAPI 標準。リクエスト/レスポンスの型安全な検証 |

### インフラ (`infra/`)

| カテゴリ | 技術 | 採用理由 |
|----------|------|----------|
| デプロイ先 (Backend) | AWS ECS (Fargate) または App Runner (ap-northeast-1) | コンテナベースでスケーラブルな環境。日本リージョン対応 |
| デプロイ先 (Frontend) | AWS S3 + CloudFront | Next.jsの静的エクスポート (`output: 'export'`) による低コストかつ高速な配信 |
| CI/CD | GitHub Actions | GitHub との統合が容易。PR ベースの自動テスト・デプロイ |
| DB | PostgreSQL (Amazon RDS / Aurora 想定) | 信頼性の高いリレーショナルDB |

---

## フロントエンド実装上のアーキテクチャ制約

フロントエンドは静的ホスティング (S3 + CloudFront) に配置されるため、Next.js の **Static Export (`output: 'export'`)** でビルドされます。これにより以下の実装制約があります。

1. **サーバー依存機能の禁止**
   - `app/api/` (API Routes), Server Actions (`use server`), `cookies()`, `headers()`, Next.jsの `redirect`/`rewrite` は動作しないため使用禁止。
2. **動的ルーティング (`[id]`) の代用ルール**
   - データベースのIDなど、ビルド時に値が確定しない動的ルート（例: `app/album/[id]/page.tsx`）はStatic Exportでは使用できません。
   - 代わりにクエリパラメータを活用したSPA的な実装（例: `/album/upload?id=123`）を行い、クライアント側で `useSearchParams` を用いて取得します。
   - `useSearchParams` を呼び出すコンポーネントは、ルーティングのビルドエラーを防ぐために必ず `<Suspense>` でラップする必要があります。

---

## 不採用とした候補

| 候補 | 不採用理由 |
|------|-----------|
| Prisma (ORM) | TypeScript 向け。Python バックエンドでは SQLAlchemy が標準的 |
| Supabase | Firebase で認証・ストレージ要件を満たしており移行コストに見合わない |
| Redux | エディタアプリの状態管理には Zustand + Immer の方がシンプルで適切 |
| styled-components | Tailwind CSS の方がチーム間でスタイルの一貫性を保ちやすい |
| pnpm / yarn | npm で十分。チーム全員が追加ツールなしで即開発可能 |

---

## パッケージマネージャ

| 領域 | ツール | ロックファイル |
|------|--------|---------------|
| フロントエンド | npm | `package-lock.json` |
| バックエンド | pip + venv | `requirements.txt` |

**ルール**:
- ロックファイル（`package-lock.json`, `requirements.txt`）は**必ず Git にコミットする**
- パッケージの追加・更新時は PR の説明に理由を明記する
- `node_modules/` や `.venv/` は `.gitignore` で除外する

---

## スタイリング方針

Tailwind CSS v4 を使用し、チーム間でスタイルの一貫性を保つ。

**基本ルール**:
- **Tailwind のユーティリティクラスを優先して使用する**（インラインスタイル `style={}` は原則禁止）
- 共通のデザイントークン（色・間隔・フォントサイズ等）は Tailwind の設定ファイルで一元管理する
- 繰り返し使うスタイルの組み合わせは **コンポーネントとして切り出す**（`@apply` の多用は避ける）
- レスポンシブ対応は Tailwind のブレークポイント（`sm:`, `md:`, `lg:`）を活用する

**やらないこと**:
- CSS Modules や styled-components との混在
- グローバルCSS での個別スタイル定義（`globals.css` はリセットと基本設定のみ）

---

## 状態管理方針

Zustand + Immer を採用し、以下のルールで状態を管理する。

### 状態の分類と管理場所

| 種類 | 管理方法 | 例 |
|------|----------|-----|
| サーバーデータ（API取得） | React の `useState` / `useEffect` またはキャッシュライブラリ | ユーザー情報、注文履歴 |
| グローバルUI状態 | Zustand ストア（`frontend/src/store/`） | 認証状態、モーダル開閉 |
| 機能固有の複雑な状態 | Zustand ストア（`frontend/src/features/xxx/store/`） | エディタのキャンバス状態 |
| コンポーネント内の一時的な状態 | React の `useState` | フォーム入力値、ホバー状態 |

**基本ルール**:
- **まず `useState` で済むかを考える**。グローバルに共有する必要がある場合のみ Zustand ストアを作る
- Zustand ストアの更新には **Immer を使い、不変性を保ちます**
- 1つのストアが肥大化しないよう、機能単位でストアを分割する
