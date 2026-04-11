# Weave Album

## Goal
ウェディングアルバム業界に存在する「高額・長納期・不自由」という構造的課題を解消し、  
写真データを起点に、上質な上製本アルバムをより自由かつ納得感のある形で制作できる体験を実現する。

## Value
プリントテックを活用し、上質でおしゃれなアルバムを、誰でも直感的に作れるプロダクトを目指す。  
価格の安さだけではなく、体験の質と納得感で選ばれるアルバム体験を提供する。

## Primary User
- フォト婚・少人数婚・前撮り / 後撮りを行った20代後半〜30代前半のユーザー
- 写真データは受け取っているが、式場アルバムは高額で選びにくい人
- 市販フォトブックではデザイン性・品質に満足できない人
- 自分らしい世界観や美意識を大切にしたい人

## Problem
- 式場アルバムは価格が高く、何にお金を払っているのかが見えにくい
- 納期が長く、完成までの体験が遅い
- 写真選定やレイアウトの自由度が低い
- 写真データを受け取っても、上質なアルバムとして残す手段が少ない
- 既存フォトブックは安いが、デザイン性・高級感・納得感が弱い

## MVP Scope
- 写真データをアップロードできる
- アルバムの基本仕様を選べる
- 用意したテンプレートを選択できる
- テンプレートまたは自動整列でレイアウト案を作れる
- テンプレートの枠内で写真の位置を簡易に調整できる
  - 縦方向・横方向の移動
- アルバムのプレビューを確認できる
- 上製本アルバムとして成立する形を画面上で確認できる
- 注文内容を確認・確定できる
- Stripe を用いて決済できる
- 印刷会社APIを通じて製本依頼データを連携できる

## Non-Goals
- 式場提携
- BtoB向け管理機能
- 複数人共同編集
- 高度な自由編集機能
- テンプレート外の自由レイアウト編集
- ページ構成を大きく変える高度編集
- スマホネイティブアプリの本格実装
- 他商材展開（家族アルバム、ギフト等）
- SaaS化や海外展開

## MVP 完了条件
- ユーザーが写真データをアップロードし、アルバム案を作成できる
- テンプレートベースで写真位置の簡易調整ができる
- アルバムの完成イメージをプレビューで確認できる
- 注文内容を確定し、Stripe で決済できる
- 製本依頼に必要なデータを印刷会社へ連携できる

## Tech Stack

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Next.js 16.1 (App Router) / React 19 / TypeScript |
| スタイリング | Tailwind CSS v4 |
| キャンバス | react-konva (Konva) |
| 状態管理 | Zustand + Immer |
| 認証 | Firebase (Google OAuth) |
| バックエンド | FastAPI (Python 3.13) / Uvicorn |
| DB / ORM | PostgreSQL / SQLAlchemy (asyncio) / Alembic |
| ストレージ | Google Cloud Storage |
| デプロイ | Cloud Run / GitHub Actions |
| テスト | Vitest / Playwright |

詳細: [docs/specs/tech-stack.md](docs/specs/tech-stack.md)

## リポジトリ構成

```
weave-dev/
├── frontend/          ... Next.js Webアプリケーション
│   └── src/
│       ├── app/       ... App Router（ルーティング）
│       ├── features/  ... 機能別モジュール（auth, editor, payment 等）
│       ├── components/... 共通UIコンポーネント
│       ├── hooks/     ... 共通カスタムフック
│       ├── lib/       ... ユーティリティ・API設定
│       ├── store/     ... 共通の状態管理
│       └── types/     ... 共通型定義
├── backend/           ... FastAPI バックエンド
│   ├── app/
│   │   ├── core/      ... 設定・DB接続・モデル定義
│   │   └── features/  ... 機能別モジュール（auth, editor, payment 等）
│   ├── alembic/       ... DBマイグレーション
│   └── tests/
├── infra/             ... インフラ設定（GCP）
├── docs/              ... 設計書・仕様書
└── data_model/        ... データモデル設計
```

詳細: [docs/specs/directory-structure.md](docs/specs/directory-structure.md)

## 主要ドキュメント

- [MVP API 設計](docs/specs/mvp-api.md)
- [ユーザーフロー](docs/specs/user-flow.md)
- [データモデル](data_model/data_model.md)

backend 実装に着手する際は、`docs/specs/mvp-api.md` と `data_model/data_model.md` を優先して参照してください。
