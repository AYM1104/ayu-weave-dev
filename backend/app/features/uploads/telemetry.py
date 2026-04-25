from __future__ import annotations

import json
import logging
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from threading import Lock
from time import perf_counter
from typing import Any


logger = logging.getLogger("app.features.uploads")


@dataclass(frozen=True, slots=True)
class UploadLogContext:
    album_id: str
    media_id: str | None = None
    tenant_id: str | None = None
    batch_id: str | None = None
    client_upload_id: str | None = None


class UploadProcessingCounter:
    def __init__(self) -> None:
        self._lock = Lock()
        self._active = 0
        self._peak = 0

    def enter(self) -> tuple[int, int]:
        with self._lock:
            self._active += 1
            self._peak = max(self._peak, self._active)
            return self._active, self._peak

    def exit(self) -> tuple[int, int]:
        with self._lock:
            self._active = max(0, self._active - 1)
            return self._active, self._peak


processing_counter = UploadProcessingCounter()


def create_upload_log_context(
    *,
    album_id: str,
    media_id: str | None = None,
    tenant_id: str | None = None,
    batch_id: str | None = None,
    client_upload_id: str | None = None,
) -> UploadLogContext:
    return UploadLogContext(
        album_id=album_id,
        media_id=media_id,
        tenant_id=tenant_id,
        batch_id=batch_id,
        client_upload_id=client_upload_id,
    )


def update_upload_log_context(
    context: UploadLogContext | None,
    **changes: str | None,
) -> UploadLogContext | None:
    if context is None:
        return None

    next_values = {
        key: value
        for key, value in changes.items()
        if value is not None
    }
    return replace(context, **next_values)


def start_timer() -> float:
    return perf_counter()


def elapsed_ms(started_at: float) -> float:
    return round((perf_counter() - started_at) * 1000, 2)


def error_fields(error: Exception) -> dict[str, str]:
    return {
        "error_type": error.__class__.__name__,
        "error_message": str(error),
    }


def log_upload_event(
    event: str,
    context: UploadLogContext | None = None,
    **fields: Any,
) -> None:
    # 手動検証時に grep や転記をしやすくするため、
    # 外部監視基盤に依存せず dedicated logger へ JSON を出す。
    payload: dict[str, Any] = {
        "event": event,
        "recorded_at": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
    }

    if context is not None:
        payload["album_id"] = context.album_id
        if context.media_id is not None:
            payload["media_id"] = context.media_id
        if context.tenant_id is not None:
            payload["tenant_id"] = context.tenant_id
        if context.batch_id is not None:
            payload["batch_id"] = context.batch_id
        if context.client_upload_id is not None:
            payload["client_upload_id"] = context.client_upload_id

    payload.update(fields)
    logger.info(json.dumps(payload, ensure_ascii=True, default=str, sort_keys=True))
