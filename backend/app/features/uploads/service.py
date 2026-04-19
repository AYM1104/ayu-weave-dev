from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import re
from typing import Callable
from uuid import uuid4

from app.features.uploads.models import MediaRecord
from app.features.uploads.repository import InMemoryMediaRepository
from app.features.uploads.schemas import MediaSummary, UploadInitResponseData
from app.features.uploads.storage import (
    S3UploadStorage,
    StorageObjectNotFoundError,
)


PreviewUrlBuilder = Callable[[str, str], str]


class MediaNotFoundError(LookupError):
    """Raised when a media record does not exist."""


class InvalidMediaStateError(RuntimeError):
    """Raised when an operation is not allowed for the current media state."""


class UploadObjectMissingError(RuntimeError):
    """Raised when the uploaded S3 object is missing on complete."""


def _sanitize_file_name(file_name: str) -> str:
    safe_name = Path(file_name).name.strip()
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", safe_name)
    safe_name = safe_name.strip("-.")
    return safe_name or "upload.bin"


def _to_preview_url(record: MediaRecord, preview_url_builder: PreviewUrlBuilder) -> str | None:
    if record.status != "ready":
        return None
    return preview_url_builder(record.album_id, record.id)


def _to_media_summary(record: MediaRecord, preview_url_builder: PreviewUrlBuilder) -> MediaSummary:
    return MediaSummary(
        id=record.id,
        file_name=record.file_name,
        mime_type=record.mime_type,
        byte_size=record.byte_size,
        status=record.status,
        preview_url=_to_preview_url(record, preview_url_builder),
        created_at=record.created_at,
    )


class MediaService:
    def __init__(
        self,
        repository: InMemoryMediaRepository,
        storage: S3UploadStorage,
    ) -> None:
        self._repository = repository
        self._storage = storage

    def initialize_upload(
        self,
        *,
        tenant_id: str,
        album_id: str,
        file_name: str,
        mime_type: str,
        byte_size: int,
    ) -> UploadInitResponseData:
        media_id = str(uuid4())
        object_key = (
            f"tenants/{tenant_id}/albums/{album_id}/media/{media_id}/original/"
            f"{_sanitize_file_name(file_name)}"
        )
        now = datetime.now(timezone.utc)
        record = MediaRecord(
            id=media_id,
            album_id=album_id,
            tenant_id=tenant_id,
            file_name=file_name,
            mime_type=mime_type,
            byte_size=byte_size,
            object_key=object_key,
            status="pending",
            created_at=now,
            updated_at=now,
        )
        self._repository.create(record)

        upload_url, upload_headers = self._storage.create_upload_target(
            key=object_key,
            content_type=mime_type,
        )
        return UploadInitResponseData(
            id=media_id,
            upload_url=upload_url,
            upload_headers=upload_headers,
        )

    def list_media(
        self,
        *,
        album_id: str,
        preview_url_builder: PreviewUrlBuilder,
    ) -> list[MediaSummary]:
        return [
            _to_media_summary(record, preview_url_builder)
            for record in self._repository.list_by_album(album_id)
        ]

    def complete_upload(
        self,
        *,
        album_id: str,
        media_id: str,
        preview_url_builder: PreviewUrlBuilder,
    ) -> MediaSummary:
        record = self._get_or_raise(album_id, media_id)

        if record.status in {"failed", "deleted"}:
            raise InvalidMediaStateError(f"Cannot complete media in status={record.status}")

        if record.status != "ready":
            try:
                self._storage.assert_object_exists(key=record.object_key)
            except StorageObjectNotFoundError as exc:
                raise UploadObjectMissingError(str(exc)) from exc

            record.status = "ready"
            record.updated_at = datetime.now(timezone.utc)
            record = self._repository.save(record)

        return _to_media_summary(record, preview_url_builder)

    def create_preview_download_url(self, *, album_id: str, media_id: str) -> str:
        record = self._get_or_raise(album_id, media_id)
        if record.status != "ready":
            raise InvalidMediaStateError(f"Preview is unavailable in status={record.status}")
        return self._storage.create_download_url(key=record.object_key)

    def _get_or_raise(self, album_id: str, media_id: str) -> MediaRecord:
        record = self._repository.get(album_id, media_id)
        if record is None:
            raise MediaNotFoundError(f"Media not found: album_id={album_id} media_id={media_id}")
        return record
