from __future__ import annotations

from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import get_settings
from app.features.uploads.repository import InMemoryMediaRepository
from app.features.uploads.router import get_media_repository, get_storage
from app.main import create_app


class FakeStorage:
    def __init__(self) -> None:
        self.uploaded_keys: set[str] = set()
        self.objects: dict[str, bytes] = {}
        self.content_types: dict[str, str] = {}

    def create_upload_target(self, *, key: str, content_type: str) -> tuple[str, dict[str, str]]:
        self.uploaded_keys.add(key)
        self.objects[key] = _create_sample_image_bytes()
        self.content_types[key] = content_type
        return (
            f"https://uploads.example.test/{key}",
            {"content-type": content_type},
        )

    def create_download_url(self, *, key: str) -> str:
        return f"https://downloads.example.test/{key}"

    def download_object_bytes(self, *, key: str) -> bytes:
        return self.objects[key]

    def upload_object_bytes(self, *, key: str, content: bytes, content_type: str) -> None:
        self.uploaded_keys.add(key)
        self.objects[key] = content
        self.content_types[key] = content_type

    def assert_object_exists(self, *, key: str) -> None:
        if key not in self.uploaded_keys:
            raise RuntimeError(f"missing object: {key}")


def _create_sample_image_bytes() -> bytes:
    image = Image.new("RGB", (2400, 1800), color=(120, 80, 32))
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def create_test_client() -> tuple[TestClient, InMemoryMediaRepository, FakeStorage]:
    app = create_app()
    repository = InMemoryMediaRepository()
    storage = FakeStorage()
    app.dependency_overrides[get_media_repository] = lambda: repository
    app.dependency_overrides[get_storage] = lambda: storage
    return TestClient(app), repository, storage


def _tenant_id() -> str:
    return get_settings().default_tenant_id


def test_initialize_upload_returns_signed_target() -> None:
    client, _, _ = create_test_client()

    response = client.post(
        "/api/v1/albums/album-123/media/uploads",
        json={
            "file_name": "hero.jpg",
            "mime_type": "image/jpeg",
            "byte_size": 1024,
        },
    )

    assert response.status_code == 201
    payload = response.json()["data"]
    assert payload["id"]
    assert payload["upload_url"].startswith(
        f"https://uploads.example.test/tenants/{_tenant_id()}/albums/album-123/media/"
    )
    assert payload["upload_headers"] == {"content-type": "image/jpeg"}


def test_complete_upload_and_list_media_return_preview_url() -> None:
    client, _, _ = create_test_client()

    init_response = client.post(
        "/api/v1/albums/album-123/media/uploads",
        json={
            "file_name": "hero.jpg",
            "mime_type": "image/jpeg",
            "byte_size": 1024,
        },
    )
    media_id = init_response.json()["data"]["id"]

    complete_response = client.post(
        f"/api/v1/albums/album-123/media/{media_id}/complete",
        json={},
    )
    assert complete_response.status_code == 200
    completed = complete_response.json()["data"]
    assert completed["status"] == "ready"
    assert completed["preview_url"].endswith(f"/api/v1/albums/album-123/media/{media_id}/preview")
    assert completed["thumbnail_url"].endswith(f"/api/v1/albums/album-123/media/{media_id}/thumbnail")

    list_response = client.get("/api/v1/albums/album-123/media")
    assert list_response.status_code == 200
    items = list_response.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["id"] == media_id
    assert items[0]["preview_url"] == completed["preview_url"]
    assert items[0]["thumbnail_url"] == completed["thumbnail_url"]


def test_preview_endpoint_redirects_to_signed_download_url() -> None:
    client, _, _ = create_test_client()

    init_response = client.post(
        "/api/v1/albums/album-123/media/uploads",
        json={
            "file_name": "hero.jpg",
            "mime_type": "image/jpeg",
            "byte_size": 1024,
        },
    )
    media_id = init_response.json()["data"]["id"]
    client.post(f"/api/v1/albums/album-123/media/{media_id}/complete", json={})

    preview_response = client.get(
        f"/api/v1/albums/album-123/media/{media_id}/preview",
        follow_redirects=False,
    )

    assert preview_response.status_code == 307
    assert preview_response.headers["location"].startswith(
        f"https://downloads.example.test/tenants/{_tenant_id()}/albums/album-123/media/{media_id}/derived/preview.webp",
    )


def test_thumbnail_endpoint_redirects_to_signed_download_url() -> None:
    client, _, _ = create_test_client()

    init_response = client.post(
        "/api/v1/albums/album-123/media/uploads",
        json={
            "file_name": "hero.jpg",
            "mime_type": "image/jpeg",
            "byte_size": 1024,
        },
    )
    media_id = init_response.json()["data"]["id"]
    client.post(f"/api/v1/albums/album-123/media/{media_id}/complete", json={})

    thumbnail_response = client.get(
        f"/api/v1/albums/album-123/media/{media_id}/thumbnail",
        follow_redirects=False,
    )

    assert thumbnail_response.status_code == 307
    assert thumbnail_response.headers["location"].startswith(
        f"https://downloads.example.test/tenants/{_tenant_id()}/albums/album-123/media/{media_id}/derived/thumbnail.webp",
    )
