from __future__ import annotations

from fastapi.testclient import TestClient

from app.features.uploads.repository import InMemoryMediaRepository
from app.features.uploads.router import get_media_repository, get_storage
from app.main import create_app


class FakeStorage:
    def __init__(self) -> None:
        self.uploaded_keys: set[str] = set()

    def create_upload_target(self, *, key: str, content_type: str) -> tuple[str, dict[str, str]]:
        self.uploaded_keys.add(key)
        return (
            f"https://uploads.example.test/{key}",
            {"content-type": content_type},
        )

    def create_download_url(self, *, key: str) -> str:
        return f"https://downloads.example.test/{key}"

    def assert_object_exists(self, *, key: str) -> None:
        if key not in self.uploaded_keys:
            raise RuntimeError(f"missing object: {key}")


def create_test_client() -> tuple[TestClient, InMemoryMediaRepository, FakeStorage]:
    app = create_app()
    repository = InMemoryMediaRepository()
    storage = FakeStorage()
    app.dependency_overrides[get_media_repository] = lambda: repository
    app.dependency_overrides[get_storage] = lambda: storage
    return TestClient(app), repository, storage


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
    assert payload["upload_url"].startswith("https://uploads.example.test/albums/album-123/media/")
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

    list_response = client.get("/api/v1/albums/album-123/media")
    assert list_response.status_code == 200
    items = list_response.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["id"] == media_id
    assert items[0]["preview_url"] == completed["preview_url"]


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
        "https://downloads.example.test/albums/album-123/media/",
    )
