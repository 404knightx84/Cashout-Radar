from __future__ import annotations

from datetime import datetime
from typing import Any

try:
    from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String, Text
    from sqlalchemy.orm import Mapped, mapped_column
    from .db import Base
    SQLALCHEMY_AVAILABLE = Base.metadata is not None
except ImportError:  # pragma: no cover - exercised in minimal installs
    SQLALCHEMY_AVAILABLE = False


if SQLALCHEMY_AVAILABLE:
    try:
        from geoalchemy2 import Geometry
    except ImportError:
        Geometry = None  # type: ignore[assignment]

    def geometry_column() -> Any:
        return Geometry("GEOMETRY", srid=4326) if Geometry is not None else Text()

    class Zone(Base):
        __tablename__ = "zones"
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        h3_index: Mapped[str] = mapped_column(String(32), unique=True, index=True)
        name: Mapped[str] = mapped_column(String(160))
        state: Mapped[str] = mapped_column(String(80), index=True)
        geometry: Mapped[Any] = mapped_column(geometry_column(), nullable=True)
        risk_probability: Mapped[float] = mapped_column(Float, default=0.0)

    class ATM(Base):
        __tablename__ = "atms"
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        external_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
        zone_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
        bank_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
        geometry: Mapped[Any] = mapped_column(geometry_column(), nullable=True)
        status: Mapped[str] = mapped_column(String(40), default="Operational")

    class Complaint(Base):
        __tablename__ = "complaints"
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        complaint_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
        payload: Mapped[dict[str, Any]] = mapped_column(JSON)
        status: Mapped[str] = mapped_column(String(40), default="RECEIVED")
        created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    class Transaction(Base):
        __tablename__ = "transactions"
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        reference: Mapped[str] = mapped_column(String(160), unique=True, index=True)
        account_hash: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
        amount: Mapped[float] = mapped_column(Float, default=0.0)
        occurred_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
        payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    class Withdrawal(Base):
        __tablename__ = "withdrawals"
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        reference: Mapped[str] = mapped_column(String(160), unique=True, index=True)
        atm_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
        amount: Mapped[float] = mapped_column(Float, default=0.0)
        payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    class Prediction(Base):
        __tablename__ = "predictions"
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        subject_id: Mapped[str] = mapped_column(String(160), index=True)
        score: Mapped[float] = mapped_column(Float, default=0.0)
        model_version: Mapped[str] = mapped_column(String(80), default="baseline-v1")
        explanation: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    class Alert(Base):
        __tablename__ = "alerts"
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        alert_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
        dedup_key: Mapped[str] = mapped_column(String(240), index=True)
        status: Mapped[str] = mapped_column(String(40), default="ACTIVE")
        score: Mapped[float] = mapped_column(Float, default=0.0)
        payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    class AuditLog(Base):
        __tablename__ = "audit_log"
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        object_type: Mapped[str] = mapped_column(String(80), index=True)
        object_id: Mapped[str] = mapped_column(String(160), index=True)
        action: Mapped[str] = mapped_column(String(80))
        event_hash: Mapped[str] = mapped_column(String(64), index=True)
        payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    class LedgerAnchor(Base):
        __tablename__ = "ledger_anchors"
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        object_type: Mapped[str] = mapped_column(String(80), index=True)
        object_id: Mapped[str] = mapped_column(String(160), index=True)
        merkle_root: Mapped[str] = mapped_column(String(64))
        chain: Mapped[str] = mapped_column(String(40), default="local")
        tx_hash: Mapped[str | None] = mapped_column(String(160), nullable=True)
        verified: Mapped[bool] = mapped_column(Boolean, default=False)
        created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

else:
    class _UnavailableModel:
        """Import-safe marker when SQLAlchemy is not installed."""

    Zone = ATM = Complaint = Transaction = Withdrawal = Prediction = Alert = AuditLog = LedgerAnchor = _UnavailableModel
