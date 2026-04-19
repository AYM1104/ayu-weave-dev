from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal


MediaStatus = Literal["pending", "processing", "ready", "failed", "deleted"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class MediaRecord:
    id: str
    album_id: str
    tenant_id: str
    file_name: str
    mime_type: str
    byte_size: int
    object_key: str
    preview_object_key: str | None = None
    thumbnail_object_key: str | None = None
    width: int | None = None
    height: int | None = None
    status: MediaStatus = "pending"
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
