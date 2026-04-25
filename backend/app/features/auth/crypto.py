from __future__ import annotations

import base64
import binascii
import hashlib
import secrets

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings


NONCE_SIZE_BYTES = 12
MIN_SECRET_BYTES = 32


class AuthCryptoConfigurationError(RuntimeError):
    """Raised when token encryption cannot be configured safely."""


def _get_encryption_key() -> bytes:
    secret = get_settings().auth_cookie_secret.encode("utf-8")
    if len(secret) < MIN_SECRET_BYTES:
        raise AuthCryptoConfigurationError("AUTH_COOKIE_SECRET must be at least 32 bytes")
    return hashlib.sha256(secret).digest()


def encrypt_token(plaintext: str) -> str:
    nonce = secrets.token_bytes(NONCE_SIZE_BYTES)
    ciphertext = AESGCM(_get_encryption_key()).encrypt(
        nonce,
        plaintext.encode("utf-8"),
        None,
    )
    return base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt_token(ciphertext: str) -> str:
    try:
        payload = base64.b64decode(ciphertext.encode("ascii"), validate=True)
        if len(payload) <= NONCE_SIZE_BYTES:
            raise ValueError("ciphertext is too short")
        nonce = payload[:NONCE_SIZE_BYTES]
        encrypted_token = payload[NONCE_SIZE_BYTES:]
        plaintext = AESGCM(_get_encryption_key()).decrypt(nonce, encrypted_token, None)
        return plaintext.decode("utf-8")
    except (
        InvalidTag,
        ValueError,
        UnicodeDecodeError,
        UnicodeEncodeError,
        binascii.Error,
    ) as exc:
        raise ValueError("Invalid encrypted token") from exc
