from __future__ import annotations

from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import DatabaseNotConfiguredError, get_sessionmaker
from app.features.auth.crypto import AuthCryptoConfigurationError
from app.features.auth.schemas import AuthSessionCreateRequest, AuthSessionCreateResponse
from app.features.auth.service import create_session


router = APIRouter(prefix="/internal/auth", tags=["auth"])


async def get_db_session(
    settings: Settings = Depends(get_settings),
) -> AsyncIterator[AsyncSession]:
    try:
        sessionmaker = get_sessionmaker(settings.database_url)
    except DatabaseNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    async with sessionmaker() as db:
        yield db


async def _find_user_id_by_sub(db: AsyncSession, user_sub: str) -> UUID | str | None:
    result = await db.execute(
        text("SELECT id FROM users WHERE auth_subject = :auth_subject LIMIT 1"),
        {"auth_subject": user_sub},
    )
    return result.scalar_one_or_none()


@router.post(
    "/sessions",
    response_model=AuthSessionCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_auth_session(
    payload: AuthSessionCreateRequest,
    db: AsyncSession = Depends(get_db_session),
) -> AuthSessionCreateResponse:
    user_id = await _find_user_id_by_sub(db, payload.user_sub)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    try:
        _, session_key = await create_session(
            db,
            user_id=user_id,
            access_token=payload.access_token,
            refresh_token=payload.refresh_token,
            access_token_expires_at=payload.access_token_expires_at,
            refresh_token_expires_at=payload.refresh_token_expires_at,
        )
    except AuthCryptoConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return AuthSessionCreateResponse(session_key=session_key)
