from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from .jobs import InMemoryJobQueue, alert_dedup_key, baseline_score

try:
    from celery import Celery
except ImportError:  # pragma: no cover
    Celery = None  # type: ignore[assignment]

REDIS_URL = os.getenv("REDIS_URL", "")
celery_app = None
if Celery is not None and REDIS_URL:
    celery_app = Celery("atm_sentinel", broker=REDIS_URL, backend=REDIS_URL)
local_queue = InMemoryJobQueue()


def _score(payload: dict[str, Any]) -> dict[str, Any]:
    score = baseline_score(payload)
    return {"score": score, "model": "baseline-v1", "scored_at": datetime.now(timezone.utc).isoformat()}


def score_complaint(payload: dict[str, Any]) -> dict[str, Any]:
    return _score(payload)


def _task(name: str, fn: Any) -> Any:
    if celery_app is not None:
        return celery_app.task(name=f"atm_sentinel.{name}")(fn)
    return fn


score_task = _task("score_complaint", score_complaint)


def deduplicate_alert(payload: dict[str, Any]) -> dict[str, Any]:
    key = alert_dedup_key(str(payload.get("zone_id", "unknown")), str(payload.get("incident_family", "complaint")), int(payload.get("bucket", 0)))
    return {"deduplicated": key in _seen_alerts, "dedup_key": key}


_seen_alerts: set[str] = set()

def _dedup_and_remember(payload: dict[str, Any]) -> dict[str, Any]:
    result = deduplicate_alert(payload)
    _seen_alerts.add(result["dedup_key"])
    return result


dedup_task = _task("deduplicate_alert", _dedup_and_remember)


def escalate_critical(payload: dict[str, Any]) -> dict[str, Any]:
    return {"escalated": float(payload.get("score", 0)) >= 0.8, "severity": "CRITICAL" if float(payload.get("score", 0)) >= 0.8 else "STANDARD"}


critical_escalation_task = _task("critical_escalation", escalate_critical)


def anchor_ledger_task(payload: dict[str, Any]) -> dict[str, Any]:
    from .blockchain import submit_merkle_root
    return submit_merkle_root(str(payload["merkle_root"]), payload)


anchor_task = _task("anchor_ledger", anchor_ledger_task)


def enqueue_complaint(payload: dict[str, Any]) -> dict[str, Any]:
    """Dispatch through Celery when configured, otherwise retain a local job envelope."""
    if celery_app is not None:
        result = score_task.delay(payload)
        return {"queued": True, "backend": "celery", "task_id": result.id}
    import asyncio
    asyncio.run(local_queue.enqueue({"type": "score_complaint", "payload": payload}))
    return {"queued": True, "backend": "local", "task_id": None}
