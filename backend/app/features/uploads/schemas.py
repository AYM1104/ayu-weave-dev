from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.features.uploads.models import MediaStatus


class UploadInitRequest(BaseModel):
    file_name: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(min_length=1, max_length=255)
    byte_size: int = Field(gt=0, le=50 * 1024 * 1024)


class UploadInitResponseData(BaseModel):
    id: str
    upload_url: str
    upload_headers: dict[str, str] | None = None


class UploadInitResponse(BaseModel):
    data: UploadInitResponseData


class MediaSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_name: str
    mime_type: str
    byte_size: int
    status: MediaStatus
    preview_url: str | None
    created_at: datetime


class MediaListResponseData(BaseModel):
    items: list[MediaSummary]


class MediaListResponse(BaseModel):
    data: MediaListResponseData


class MediaResponse(BaseModel):
    data: MediaSummary
