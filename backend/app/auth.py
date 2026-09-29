from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext

ROLE_I4C_ADMIN = "I4C_ADMIN"
ROLE_STATE_OFFICER = "STATE_OFFICER"
ROLE_BANK_OFFICER = "BANK_OFFICER"
VALID_ROLES = {ROLE_I4C_ADMIN, ROLE_STATE_OFFICER, ROLE_BANK_OFFICER}

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-change-me-use-env-in-real-deploy")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
DEV_FALLBACK_ENABLED = os.getenv("AUTH_DEV_FALLBACK", "true").lower() == "true"

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class User:
    username: str
    role: str
    state_scope: str | None = None
    bank_scope: str | None = None

    def claims(self) -> dict[str, str]:
        claims = {"sub": self.username, "role": self.role}
        if self.state_scope:
            claims["state_scope"] = self.state_scope
        if self.bank_scope:
            claims["bank_scope"] = self.bank_scope
        return claims


def _password(value: str) -> str:
    return password_context.hash(value)


DEMO_USERS: dict[str, dict[str, object]] = {
    "admin": {"password": _password(os.getenv("DEMO_ADMIN_PASSWORD", "admin123")), "user": User("admin", ROLE_I4C_ADMIN)},
    "state.mh": {"password": _password(os.getenv("DEMO_STATE_PASSWORD", "state123")), "user": User("state.mh", ROLE_STATE_OFFICER, state_scope="Maharashtra")},
    "bank.hdfc": {"password": _password(os.getenv("DEMO_BANK_PASSWORD", "bank123")), "user": User("bank.hdfc", ROLE_BANK_OFFICER, bank_scope="HDFC Bank")},
}


def authenticate_user(username: str, password: str) -> User | None:
    record = DEMO_USERS.get(username)
    if not record or not password_context.verify(password, str(record["password"])):
        return None
    return record["user"]  # type: ignore[return-value]


def create_access_token(user: User, expires_delta: timedelta | None = None) -> str:
    now = datetime.now(timezone.utc)
    expires = now + (expires_delta or timedelta(minutes=JWT_EXPIRE_MINUTES))
    payload = {**user.claims(), "iat": now, "exp": expires}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> User:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = str(payload["sub"])
        role = str(payload["role"])
        if role not in VALID_ROLES:
            raise ValueError("invalid role")
        return User(username, role, payload.get("state_scope"), payload.get("bank_scope"))
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from error


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> User:
    if credentials is None:
        if DEV_FALLBACK_ENABLED:
            return User("dev-fallback", ROLE_I4C_ADMIN)
        raise HTTPException(status_code=401, detail="Authentication required")
    return decode_access_token(credentials.credentials)


def require_roles(*roles: str) -> Callable[[User], User]:
    allowed = set(roles)

    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user

    return dependency


def in_scope(user: User, *, state: str | None = None, bank: str | None = None) -> bool:
    return user.role == ROLE_I4C_ADMIN or (
        (not user.state_scope or user.state_scope == state)
        and (not user.bank_scope or user.bank_scope == bank)
    )


def require_scope(user: User, *, state: str | None = None, bank: str | None = None) -> None:
    if not in_scope(user, state=state, bank=bank):
        raise HTTPException(status_code=403, detail="Resource is outside your assigned scope")