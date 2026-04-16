from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import os


def _split_csv(value: str | None, default: tuple[str, ...]) -> tuple[str, ...]:
    if value is None:
        return default

    items = tuple(item.strip() for item in value.split(",") if item.strip())
    return items or default


@dataclass(frozen=True, slots=True)
class Settings:
    api_prefix: str = "/api/v1"
    aws_region: str = "ap-northeast-1"
    s3_bucket: str = ""
    s3_endpoint_url: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_session_token: str | None = None
    s3_presign_expires_seconds: int = 900
    public_api_base_url: str | None = None
    allowed_origins: tuple[str, ...] = (
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        api_prefix=os.getenv("API_PREFIX", "/api/v1").rstrip("/") or "/api/v1",
        aws_region=os.getenv("AWS_REGION", "ap-northeast-1"),
        s3_bucket=os.getenv("AWS_S3_BUCKET", "").strip(),
        s3_endpoint_url=os.getenv("AWS_S3_ENDPOINT_URL", "").strip() or None,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "").strip() or None,
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "").strip() or None,
        aws_session_token=os.getenv("AWS_SESSION_TOKEN", "").strip() or None,
        s3_presign_expires_seconds=max(
            60,
            int(os.getenv("AWS_S3_PRESIGN_EXPIRES_SECONDS", "900")),
        ),
        public_api_base_url=os.getenv("PUBLIC_API_BASE_URL", "").strip() or None,
        allowed_origins=_split_csv(
            os.getenv("ALLOWED_ORIGINS"),
            ("http://localhost:3000", "http://127.0.0.1:3000"),
        ),
    )
