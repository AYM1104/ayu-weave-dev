from __future__ import annotations

from functools import lru_cache
from urllib.parse import urlsplit

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse

from app.core.config import Settings, get_settings
from app.features.uploads.repository import InMemoryMediaRepository
from app.features.uploads.schemas import (
    MediaListResponse,
    MediaListResponseData,
    MediaResponse,
    UploadInitRequest,
    UploadInitResponse,
)
from app.features.uploads.service import (
    InvalidMediaStateError,
    MediaNotFoundError,
    MediaService,
    UploadObjectMissingError,
)
from app.features.uploads.storage import S3UploadStorage, StorageNotConfiguredError

router = APIRouter(prefix="/albums", tags=["media"])


@lru_cache(maxsize=1)
def get_media_repository() -> InMemoryMediaRepository:
    return InMemoryMediaRepository()


def get_storage(settings: Settings = Depends(get_settings)) -> S3UploadStorage:
    return S3UploadStorage(settings)


def get_media_service(
    repository: InMemoryMediaRepository = Depends(get_media_repository),
    storage: S3UploadStorage = Depends(get_storage),
) -> MediaService:
    return MediaService(repository, storage)


def _build_preview_url(
    request: Request,
    settings: Settings,
    *,
    album_id: str,
    media_id: str,
) -> str:
    if settings.public_api_base_url:
        path = request.app.url_path_for(
            "get_media_preview",
            album_id=album_id,
            media_id=media_id,
        )
        return f"{settings.public_api_base_url.rstrip('/')}{path}"
    return str(request.url_for("get_media_preview", album_id=album_id, media_id=media_id))


def _translate_exception(exc: Exception) -> HTTPException:
    if isinstance(exc, StorageNotConfiguredError):
        return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    if isinstance(exc, MediaNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, UploadObjectMissingError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, InvalidMediaStateError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    raise exc


@router.post(
    "/{album_id}/media/uploads",
    response_model=UploadInitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def initialize_media_upload(
    album_id: str,
    payload: UploadInitRequest,
    service: MediaService = Depends(get_media_service),
    settings: Settings = Depends(get_settings),
) -> UploadInitResponse:
    try:
        data = service.initialize_upload(
            tenant_id=settings.default_tenant_id,
            album_id=album_id,
            file_name=payload.file_name,
            mime_type=payload.mime_type,
            byte_size=payload.byte_size,
        )
    except Exception as exc:  # pragma: no cover - translated and re-raised
        raise _translate_exception(exc) from exc

    return UploadInitResponse(data=data)


@router.get("/{album_id}/media", response_model=MediaListResponse)
async def list_album_media(
    album_id: str,
    request: Request,
    limit: int = 100,
    service: MediaService = Depends(get_media_service),
    settings: Settings = Depends(get_settings),
) -> MediaListResponse:
    try:
        items = service.list_media(
            album_id=album_id,
            preview_url_builder=lambda current_album_id, media_id: _build_preview_url(
                request,
                settings,
                album_id=current_album_id,
                media_id=media_id,
            ),
        )
    except Exception as exc:  # pragma: no cover - translated and re-raised
        raise _translate_exception(exc) from exc

    return MediaListResponse(data=MediaListResponseData(items=items[: max(1, min(limit, 100))]))


@router.post("/{album_id}/media/{media_id}/complete", response_model=MediaResponse)
async def complete_media_upload(
    album_id: str,
    media_id: str,
    request: Request,
    _: dict[str, object] | None = Body(default=None),
    service: MediaService = Depends(get_media_service),
    settings: Settings = Depends(get_settings),
) -> MediaResponse:
    try:
        data = service.complete_upload(
            album_id=album_id,
            media_id=media_id,
            preview_url_builder=lambda current_album_id, current_media_id: _build_preview_url(
                request,
                settings,
                album_id=current_album_id,
                media_id=current_media_id,
            ),
        )
    except Exception as exc:  # pragma: no cover - translated and re-raised
        raise _translate_exception(exc) from exc

    return MediaResponse(data=data)


@router.get(
    "/{album_id}/media/{media_id}/preview",
    include_in_schema=False,
    name="get_media_preview",
)
async def get_media_preview(
    album_id: str,
    media_id: str,
    service: MediaService = Depends(get_media_service),
) -> Response:
    try:
        download_url = service.create_preview_download_url(album_id=album_id, media_id=media_id)
    except Exception as exc:  # pragma: no cover - translated and re-raised
        raise _translate_exception(exc) from exc

    redirect = RedirectResponse(download_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    if urlsplit(download_url).scheme in {"http", "https"}:
        redirect.headers["Cache-Control"] = "private, max-age=300"
    return redirect
