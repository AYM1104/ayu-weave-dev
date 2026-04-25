from __future__ import annotations

from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


class DatabaseNotConfiguredError(RuntimeError):
    """環境変数「DATABASE_URL」が設定されていない状態で、データベースにアクセスしようとした際に発生するエラーです。"""


@lru_cache(maxsize=8)
def get_sessionmaker(database_url: str) -> async_sessionmaker[AsyncSession]:
    """
    データベース接続の設定を行います。
    :param database_url: データベース接続文字列
    :return: セッションメーカー
    """

    # データベースのURLが存在するか確認
    if not database_url:
        raise DatabaseNotConfiguredError("DATABASE_URLが設定されていません")

    # データベース接続エンジンの作成
    engine = create_async_engine(database_url, pool_pre_ping=True)

    # セッションメーカーの作成
    return async_sessionmaker(engine, expire_on_commit=False)
