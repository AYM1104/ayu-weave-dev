from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class AuthSessionCreateRequest(BaseModel):
    user_sub: str = Field(min_length=1, max_length=255)
    access_token: str = Field(min_length=1)
    refresh_token: str = Field(min_length=1)
    access_token_expires_at: datetime | None = None
    refresh_token_expires_at: datetime

    @field_validator("access_token_expires_at", "refresh_token_expires_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("datetime must include timezone")
        return value


class AuthSessionCreateResponse(BaseModel):
    session_key: str
