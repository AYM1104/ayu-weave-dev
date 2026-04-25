from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import re
from typing import Callable
from uuid import uuid4

from app.features.uploads.image_variants import (
    ImageVariantError,
    derive_variant_key,
    generate_image_variants,
)
from app.features.uploads.models import MediaRecord
from app.features.uploads.repository import InMemoryMediaRepository
from app.features.uploads.schemas import MediaSummary, UploadInitResponseData
from app.features.uploads.storage import (
    S3UploadStorage,
    StorageObjectNotFoundError,
)
from app.features.uploads.telemetry import (
    UploadLogContext,
    elapsed_ms,
    error_fields,
    log_upload_event,
    processing_counter,
    start_timer,
    update_upload_log_context,
)


PreviewUrlBuilder = Callable[[str, str], str]
ThumbnailUrlBuilder = Callable[[str, str], str]


class MediaNotFoundError(LookupError):
    """指定された media record が存在しないときに送出する。"""


class InvalidMediaStateError(RuntimeError):
    """現在の status では許可されない操作を行ったときに送出する。"""


class UploadObjectMissingError(RuntimeError):
    """complete 時に original object が見つからないときに送出する。"""


def _sanitize_file_name(file_name: str) -> str:
    """storage key に使えるようにファイル名を安全な文字へ寄せる。"""

    safe_name = Path(file_name).name.strip()
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", safe_name)
    safe_name = safe_name.strip("-.")
    return safe_name or "upload.bin"


def _to_preview_url(record: MediaRecord, preview_url_builder: PreviewUrlBuilder) -> str | None:
    # preview は ready になるまで外部へ公開しない。
    if record.status != "ready":
        return None
    if _get_preview_object_key(record) is None:
        return None
    return preview_url_builder(record.album_id, record.id)


def _to_thumbnail_url(
    record: MediaRecord,
    thumbnail_url_builder: ThumbnailUrlBuilder,
) -> str | None:
    # thumbnail も preview と同様に ready までは返さない。
    if record.status != "ready":
        return None
    if _get_thumbnail_object_key(record) is None:
        return None
    return thumbnail_url_builder(record.album_id, record.id)


def _to_media_summary(
    record: MediaRecord,
    preview_url_builder: PreviewUrlBuilder,
    thumbnail_url_builder: ThumbnailUrlBuilder,
) -> MediaSummary:
    """内部 record を API 返却用の summary へ詰め替える。"""

    return MediaSummary(
        id=record.id,
        file_name=record.file_name,
        mime_type=record.mime_type,
        byte_size=record.byte_size,
        status=record.status,
        preview_url=_to_preview_url(record, preview_url_builder),
        thumbnail_url=_to_thumbnail_url(record, thumbnail_url_builder),
        created_at=record.created_at,
    )


def _get_preview_object_key(record: MediaRecord) -> str | None:
    # preview 専用 key が未設定でも original を最後のフォールバックにする。
    return record.preview_object_key or record.object_key


def _get_thumbnail_object_key(record: MediaRecord) -> str | None:
    # thumbnail が未設定でも preview / original の順で参照できるようにする。
    return record.thumbnail_object_key or record.preview_object_key or record.object_key


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
        """upload 開始時に media record を作成し、presigned URL を払い出す。"""

        media_id = str(uuid4())
        # original / preview / thumbnail の保存先を先に確定しておくと、
        # complete 側は media_id だけで後続処理を進められる。
        object_key = (
            f"tenants/{tenant_id}/albums/{album_id}/media/{media_id}/original/"
            f"{_sanitize_file_name(file_name)}"
        )
        preview_object_key = derive_variant_key(object_key, "preview")
        thumbnail_object_key = derive_variant_key(object_key, "thumbnail")
        now = datetime.now(timezone.utc)
        record = MediaRecord(
            id=media_id,
            album_id=album_id,
            tenant_id=tenant_id,
            file_name=file_name,
            mime_type=mime_type,
            byte_size=byte_size,
            object_key=object_key,
            preview_object_key=preview_object_key,
            thumbnail_object_key=thumbnail_object_key,
            status="pending",
            created_at=now,
            updated_at=now,
        )
        self._repository.create(record)

        # initialize では実データをまだ受け取らず、upload 先だけ返す。
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
        thumbnail_url_builder: ThumbnailUrlBuilder,
    ) -> list[MediaSummary]:
        """album 単位で media を取得し、API 返却形式へ変換する。"""

        return [
            _to_media_summary(record, preview_url_builder, thumbnail_url_builder)
            for record in self._repository.list_by_album(album_id)
        ]

    def complete_upload(
        self,
        *,
        album_id: str,
        media_id: str,
        preview_url_builder: PreviewUrlBuilder,
        thumbnail_url_builder: ThumbnailUrlBuilder,
        log_context: UploadLogContext | None = None,
    ) -> MediaSummary:
        """original upload 完了後に派生画像を生成し、media を ready へ進める。"""

        record = self._get_or_raise(album_id, media_id)
        log_context = update_upload_log_context(
            log_context,
            media_id=record.id,
            tenant_id=record.tenant_id,
        )

        if record.status in {"failed", "deleted"}:
            raise InvalidMediaStateError(f"Cannot complete media in status={record.status}")

        if record.status != "ready":
            # ready 済みなら再生成せず、そのまま summary を返す。
            processing_started_at = start_timer()
            active_processing, peak_processing = processing_counter.enter()
            original_exists_ms: float | None = None
            original_download_ms: float | None = None
            variants_generate_ms: float | None = None
            preview_upload_ms: float | None = None
            thumbnail_upload_ms: float | None = None
            current_processing_stage = "assert_original_exists"

            try:
                # complete の同期処理を、ユーザー影響の流れに沿って
                # object 確認 -> download -> 派生生成 -> upload の順に測る。
                stage_started_at = start_timer()
                self._storage.assert_object_exists(key=record.object_key)
                original_exists_ms = elapsed_ms(stage_started_at)
                record.status = "processing"
                record.updated_at = datetime.now(timezone.utc)
                record = self._repository.save(record)

                current_processing_stage = "download_original"
                stage_started_at = start_timer()
                original_bytes = self._storage.download_object_bytes(key=record.object_key)
                original_download_ms = elapsed_ms(stage_started_at)

                current_processing_stage = "generate_variants"
                stage_started_at = start_timer()
                variants = generate_image_variants(original_bytes)
                variants_generate_ms = elapsed_ms(stage_started_at)
                preview_object_key = _get_preview_object_key(record)
                thumbnail_object_key = _get_thumbnail_object_key(record)

                if preview_object_key is not None:
                    current_processing_stage = "upload_preview"
                    stage_started_at = start_timer()
                    self._storage.upload_object_bytes(
                        key=preview_object_key,
                        content=variants.preview_bytes,
                        content_type="image/webp",
                    )
                    preview_upload_ms = elapsed_ms(stage_started_at)
                if thumbnail_object_key is not None:
                    current_processing_stage = "upload_thumbnail"
                    stage_started_at = start_timer()
                    self._storage.upload_object_bytes(
                        key=thumbnail_object_key,
                        content=variants.thumbnail_bytes,
                        content_type="image/webp",
                    )
                    thumbnail_upload_ms = elapsed_ms(stage_started_at)
            except StorageObjectNotFoundError as exc:
                remaining_processing, _ = processing_counter.exit()
                # どこまで進んで失敗したかを残し、
                # missing object と画像処理失敗を切り分けられるようにする。
                log_upload_event(
                    "backend_upload_complete_processing_failed",
                    log_context,
                    complete_processing_ms=elapsed_ms(processing_started_at),
                    current_processing_count=active_processing,
                    remaining_processing_count=remaining_processing,
                    peak_processing_count=peak_processing,
                    failure_stage=current_processing_stage,
                    original_exists_ms=original_exists_ms,
                    original_download_ms=original_download_ms,
                    preview_upload_ms=preview_upload_ms,
                    thumbnail_upload_ms=thumbnail_upload_ms,
                    variants_generate_ms=variants_generate_ms,
                    **error_fields(exc),
                )
                raise UploadObjectMissingError(str(exc)) from exc
            except ImageVariantError:
                record.status = "failed"
                record.updated_at = datetime.now(timezone.utc)
                self._repository.save(record)
                remaining_processing, _ = processing_counter.exit()
                log_upload_event(
                    "backend_upload_complete_processing_failed",
                    log_context,
                    complete_processing_ms=elapsed_ms(processing_started_at),
                    current_processing_count=active_processing,
                    remaining_processing_count=remaining_processing,
                    peak_processing_count=peak_processing,
                    failure_stage=current_processing_stage,
                    original_exists_ms=original_exists_ms,
                    original_download_ms=original_download_ms,
                    preview_upload_ms=preview_upload_ms,
                    thumbnail_upload_ms=thumbnail_upload_ms,
                    variants_generate_ms=variants_generate_ms,
                    error_type="ImageVariantError",
                    error_message="Failed to generate preview or thumbnail variants",
                )
                raise
            except Exception as exc:
                record.status = "failed"
                record.updated_at = datetime.now(timezone.utc)
                self._repository.save(record)
                remaining_processing, _ = processing_counter.exit()
                log_upload_event(
                    "backend_upload_complete_processing_failed",
                    log_context,
                    complete_processing_ms=elapsed_ms(processing_started_at),
                    current_processing_count=active_processing,
                    remaining_processing_count=remaining_processing,
                    peak_processing_count=peak_processing,
                    failure_stage=current_processing_stage,
                    original_exists_ms=original_exists_ms,
                    original_download_ms=original_download_ms,
                    preview_upload_ms=preview_upload_ms,
                    thumbnail_upload_ms=thumbnail_upload_ms,
                    variants_generate_ms=variants_generate_ms,
                    **error_fields(exc),
                )
                raise

            record.status = "ready"
            record.width = variants.width
            record.height = variants.height
            record.updated_at = datetime.now(timezone.utc)
            record = self._repository.save(record)
            remaining_processing, _ = processing_counter.exit()

            # 成功時は各 stage の所要時間をまとめて残し、
            # 後続の耐性検証でボトルネックを比較できるようにする。
            log_upload_event(
                "backend_upload_complete_processing_completed",
                log_context,
                complete_processing_ms=elapsed_ms(processing_started_at),
                current_processing_count=active_processing,
                remaining_processing_count=remaining_processing,
                peak_processing_count=peak_processing,
                media_status=record.status,
                original_exists_ms=original_exists_ms,
                original_download_ms=original_download_ms,
                preview_upload_ms=preview_upload_ms,
                thumbnail_upload_ms=thumbnail_upload_ms,
                variants_generate_ms=variants_generate_ms,
                width=record.width,
                height=record.height,
            )

        return _to_media_summary(record, preview_url_builder, thumbnail_url_builder)

    def create_preview_download_url(self, *, album_id: str, media_id: str) -> str:
        """ready な media に対する preview download URL を生成する。"""

        record = self._get_or_raise(album_id, media_id)
        if record.status != "ready":
            raise InvalidMediaStateError(f"Preview is unavailable in status={record.status}")
        preview_key = _get_preview_object_key(record)
        if preview_key is None:
            raise InvalidMediaStateError("Preview object is unavailable")
        return self._storage.create_download_url(key=preview_key)

    def create_thumbnail_download_url(self, *, album_id: str, media_id: str) -> str:
        """ready な media に対する thumbnail download URL を生成する。"""

        record = self._get_or_raise(album_id, media_id)
        if record.status != "ready":
            raise InvalidMediaStateError(f"Thumbnail is unavailable in status={record.status}")
        thumbnail_key = _get_thumbnail_object_key(record)
        if thumbnail_key is None:
            raise InvalidMediaStateError("Thumbnail object is unavailable")
        return self._storage.create_download_url(key=thumbnail_key)

    def _get_or_raise(self, album_id: str, media_id: str) -> MediaRecord:
        """album 配下の media を取得し、なければ明示的に失敗させる。"""

        record = self._repository.get(album_id, media_id)
        if record is None:
            raise MediaNotFoundError(f"Media not found: album_id={album_id} media_id={media_id}")
        return record
