import hashlib
import secrets
from typing import Annotated

from fastapi import Header, HTTPException
from db.models import User
from repositories.user_repository import UserRepository


def hash_password(password: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        b"interview-disco",
        100_000,
    ).hex()


def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == password_hash


def create_session_token() -> str:
    return secrets.token_urlsafe(32)


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    return token


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    token = _extract_bearer_token(authorization)
    user = UserRepository.get_by_session_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user
