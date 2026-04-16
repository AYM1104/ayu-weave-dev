from __future__ import annotations

from copy import deepcopy
from threading import RLock

from app.features.uploads.models import MediaRecord


class InMemoryMediaRepository:
    def __init__(self) -> None:
        self._lock = RLock()
        self._albums: dict[str, dict[str, MediaRecord]] = {}

    def create(self, record: MediaRecord) -> MediaRecord:
        with self._lock:
            album_records = self._albums.setdefault(record.album_id, {})
            album_records[record.id] = deepcopy(record)
            return deepcopy(album_records[record.id])

    def save(self, record: MediaRecord) -> MediaRecord:
        with self._lock:
            album_records = self._albums.setdefault(record.album_id, {})
            album_records[record.id] = deepcopy(record)
            return deepcopy(album_records[record.id])

    def get(self, album_id: str, media_id: str) -> MediaRecord | None:
        with self._lock:
            record = self._albums.get(album_id, {}).get(media_id)
            return deepcopy(record) if record else None

    def list_by_album(self, album_id: str) -> list[MediaRecord]:
        with self._lock:
            records = list(self._albums.get(album_id, {}).values())

        return sorted(
            (deepcopy(record) for record in records if record.status != "deleted"),
            key=lambda record: (record.created_at, record.id),
            reverse=True,
        )
