from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.models.auth_session import AuthSession
from app.features.auth.crypto import AuthCryptoConfigurationError, decrypt_token, encrypt_token
from app.features.auth.router import get_db_session
from app.features.auth.service import hash_session_key
from app.main import create_app


class FakeScalarResult:
    def __init__(self, value: UUID | None) -> None:
        self._value = value

    def scalar_one_or_none(self) -> UUID | None:
        return self._value


class FakeDb:
    def __init__(self, user_id: UUID | None) -> None:
        self.user_id = user_id
        self.added: list[AuthSession] = []
        self.commits = 0
        self.execute_params: list[dict[str, object] | None] = []

    async def execute(self, statement, params=None):  # noqa: ANN001
        self.execute_params.append(params)
        return FakeScalarResult(self.user_id)

    def add(self, auth_session: AuthSession) -> None:
        self.added.append(auth_session)

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, auth_session: AuthSession) -> None:
        if auth_session.id is None:
            auth_session.id = uuid4()


@pytest.fixture(autouse=True)
def clear_settings_cache() -> Iterator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _configure_crypto_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AUTH_COOKIE_SECRET", "x" * 32)
    get_settings.cache_clear()


def _auth_payload() -> dict[str, str]:
    now = datetime.now(timezone.utc)
    return {
        "user_sub": "cognito-sub-123",
        "access_token": "access-token",
        "refresh_token": "refresh-token",
        "access_token_expires_at": (now + timedelta(hours=1)).isoformat(),
        "refresh_token_expires_at": (now + timedelta(days=30)).isoformat(),
    }


def _create_auth_test_client(fake_db: FakeDb) -> TestClient:
    app = create_app()

    async def override_db_session():
        yield fake_db

    app.dependency_overrides[get_db_session] = override_db_session
    return TestClient(app)


def test_encrypt_token_round_trips(monkeypatch: pytest.MonkeyPatch) -> None:
    _configure_crypto_secret(monkeypatch)

    ciphertext = encrypt_token("refresh-token")

    assert ciphertext != "refresh-token"
    assert decrypt_token(ciphertext) == "refresh-token"


def test_encrypt_token_rejects_short_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AUTH_COOKIE_SECRET", "short")
    get_settings.cache_clear()

    with pytest.raises(AuthCryptoConfigurationError, match="AUTH_COOKIE_SECRET"):
        encrypt_token("refresh-token")


def test_create_auth_session_returns_session_key_and_stores_encrypted_tokens(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _configure_crypto_secret(monkeypatch)
    user_id = uuid4()
    fake_db = FakeDb(user_id=user_id)
    client = _create_auth_test_client(fake_db)

    response = client.post("/api/v1/internal/auth/sessions", json=_auth_payload())

    assert response.status_code == 201
    session_key = response.json()["session_key"]
    assert session_key
    assert fake_db.execute_params == [{"auth_subject": "cognito-sub-123"}]
    assert fake_db.commits == 1
    assert len(fake_db.added) == 1

    stored_session = fake_db.added[0]
    assert stored_session.user_id == user_id
    assert stored_session.session_key_hash == hash_session_key(session_key)
    assert stored_session.access_token_ciphertext != "access-token"
    assert stored_session.refresh_token_ciphertext != "refresh-token"
    assert decrypt_token(stored_session.access_token_ciphertext or "") == "access-token"
    assert decrypt_token(stored_session.refresh_token_ciphertext) == "refresh-token"


def test_create_auth_session_returns_404_when_user_sub_is_unknown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _configure_crypto_secret(monkeypatch)
    fake_db = FakeDb(user_id=None)
    client = _create_auth_test_client(fake_db)

    response = client.post("/api/v1/internal/auth/sessions", json=_auth_payload())

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"
    assert fake_db.added == []
    assert fake_db.commits == 0
