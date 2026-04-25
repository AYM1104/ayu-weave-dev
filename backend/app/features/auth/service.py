from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import secrets
from uuid import UUID

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models.auth_session import AuthSession
from app.features.auth.crypto import encrypt_token


def hash_session_key(session_key: str) -> str:
    return hashlib.sha256(session_key.encode("utf-8")).hexdigest()


async def create_session(
    db: AsyncSession,
    user_id: UUID | str,
    access_token: str | None,
    refresh_token: str,
    access_token_expires_at: datetime | None,
    refresh_token_expires_at: datetime,
) -> tuple[AuthSession, str]:
    session_key = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    auth_session = AuthSession(
        user_id=user_id if isinstance(user_id, UUID) else UUID(str(user_id)),
        session_key_hash=hash_session_key(session_key),
        access_token_ciphertext=encrypt_token(access_token) if access_token is not None else None,
        refresh_token_ciphertext=encrypt_token(refresh_token),
        access_token_expires_at=access_token_expires_at,
        refresh_token_expires_at=refresh_token_expires_at,
        last_seen_at=now,
        created_at=now,
        updated_at=now,
    )

    db.add(auth_session)
    await db.commit()
    await db.refresh(auth_session)
    return auth_session, session_key


async def revoke_session(db: AsyncSession, session_key_hash: str) -> None:
    now = datetime.now(timezone.utc)
    await db.execute(
        update(AuthSession)
        .where(AuthSession.session_key_hash == session_key_hash)
        .where(AuthSession.revoked_at.is_(None))
        .values(revoked_at=now, updated_at=now)
    )
    await db.commit()
