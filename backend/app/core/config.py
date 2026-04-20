from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import os
from pathlib import Path


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue

        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"\"", "'"}:
            value = value[1:-1]

        # Real environment variables should win over local template files.
        os.environ.setdefault(key, value)


def _load_local_env() -> None:
    config_path = Path(__file__).resolve()
    backend_root = config_path.parents[2]
    repo_root = config_path.parents[3]

    for env_path in (repo_root / ".env", backend_root / ".env"):
        _load_env_file(env_path)


_load_local_env()


def _split_csv(value: str | None, default: tuple[str, ...]) -> tuple[str, ...]:
    if value is None:
        return default

    items = tuple(item.strip() for item in value.split(",") if item.strip())
    return items or default


DEFAULT_TENANT_ID = "00000000-0000-4000-8000-000000000001"


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
    default_tenant_id: str = DEFAULT_TENANT_ID
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
        default_tenant_id=os.getenv("DEFAULT_TENANT_ID", DEFAULT_TENANT_ID).strip()
        or DEFAULT_TENANT_ID,
        allowed_origins=_split_csv(
            os.getenv("ALLOWED_ORIGINS"),
            ("http://localhost:3000", "http://127.0.0.1:3000"),
        ),
    )
