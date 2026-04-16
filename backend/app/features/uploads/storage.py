from __future__ import annotations

import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError

from app.core.config import Settings


class StorageNotConfiguredError(RuntimeError):
    """Raised when S3 settings are not configured."""


class StorageObjectNotFoundError(RuntimeError):
    """Raised when a stored object is missing."""


class S3UploadStorage:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = None

    def create_upload_target(self, *, key: str, content_type: str) -> tuple[str, dict[str, str]]:
        client = self._get_client()
        url = client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": self._settings.s3_bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=self._settings.s3_presign_expires_seconds,
            HttpMethod="PUT",
        )
        return url, {"content-type": content_type}

    def create_download_url(self, *, key: str) -> str:
        client = self._get_client()
        return client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": self._settings.s3_bucket,
                "Key": key,
            },
            ExpiresIn=self._settings.s3_presign_expires_seconds,
            HttpMethod="GET",
        )

    def assert_object_exists(self, *, key: str) -> None:
        client = self._get_client()
        try:
            client.head_object(Bucket=self._settings.s3_bucket, Key=key)
        except ClientError as exc:
            error_code = str(exc.response.get("Error", {}).get("Code", ""))
            if error_code in {"404", "NoSuchKey", "NotFound"}:
                raise StorageObjectNotFoundError(f"S3 object not found: {key}") from exc
            raise

    def _get_client(self):
        if self._client is not None:
            return self._client

        if not self._settings.s3_bucket:
            raise StorageNotConfiguredError(
                "AWS_S3_BUCKET is not configured. Set S3 credentials and bucket settings first.",
            )

        self._client = boto3.client(
            "s3",
            region_name=self._settings.aws_region,
            endpoint_url=self._settings.s3_endpoint_url,
            aws_access_key_id=self._settings.aws_access_key_id,
            aws_secret_access_key=self._settings.aws_secret_access_key,
            aws_session_token=self._settings.aws_session_token,
            config=BotoConfig(signature_version="s3v4"),
        )
        return self._client
