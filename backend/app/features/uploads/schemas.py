from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.features.uploads.models import MediaStatus


class UploadInitRequest(BaseModel):
    """initialize API に渡すアップロード対象ファイルの基本情報。"""

    file_name: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(min_length=1, max_length=255)
    byte_size: int = Field(gt=0, le=50 * 1024 * 1024)


class UploadInitResponseData(BaseModel):
    """initialize 成功時に返す media_id と presigned upload 情報。"""

    id: str
    upload_url: str
    upload_headers: dict[str, str] | None = None


class UploadInitResponse(BaseModel):
    """initialize API のトップレベルレスポンス。"""

    data: UploadInitResponseData


class MediaSummary(BaseModel):
    """一覧取得と complete 応答で共通利用する media の要約情報。"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    file_name: str
    mime_type: str
    byte_size: int
    status: MediaStatus
    # ready になるまでは派生画像 URL が未確定なので null を取りうる。
    preview_url: str | None
    thumbnail_url: str | None
    created_at: datetime


class MediaListResponseData(BaseModel):
    """media 一覧 API の payload 本体。"""

    items: list[MediaSummary]


class MediaListResponse(BaseModel):
    """media 一覧 API のトップレベルレスポンス。"""

    data: MediaListResponseData


class MediaResponse(BaseModel):
    """1件の media を返す complete API のトップレベルレスポンス。"""

    data: MediaSummary
