from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Iterator

try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
except ImportError:  # pragma: no cover - exercised in minimal installs
    create_engine = None  # type: ignore[assignment]
    DeclarativeBase = object  # type: ignore[misc,assignment]
    Session = Any  # type: ignore[misc,assignment]
    sessionmaker = None  # type: ignore[assignment]


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./atm_sentinel.db")
SQLALCHEMY_AVAILABLE = create_engine is not None


if SQLALCHEMY_AVAILABLE:
    class Base(DeclarativeBase):
        pass
else:
    class Base:  # type: ignore[no-redef]
        metadata = None


engine = None
SessionLocal = None
if SQLALCHEMY_AVAILABLE:
    engine_kwargs: dict[str, Any] = {"pool_pre_ping": True}
    if DATABASE_URL.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    try:
        engine = create_engine(DATABASE_URL, **engine_kwargs)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    except Exception:
        engine = None
        SessionLocal = None


def init_db() -> bool:
    """Create configured tables; return False when the optional DB stack is unavailable."""
    if engine is None or Base.metadata is None:
        return False
    try:
        from . import models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        return True
    except Exception:
        return False


@contextmanager
def session_scope() -> Iterator[Session | None]:
    """Yield a session when available and always roll back failed transactions."""
    if SessionLocal is None:
        yield None
        return
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


get_db = session_scope
