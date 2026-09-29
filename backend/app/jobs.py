from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Any, Awaitable, Callable


def baseline_score(signal: dict[str, Any]) -> float:
    """Deterministic prototype score from bounded, explainable signal weights."""
    velocity = min(float(signal.get("velocity", 0)) / 10, 1)
    telemetry = min(float(signal.get("telemetry_anomaly", 0)) / 5, 1)
    amount = min(float(signal.get("amount", 0)) / 500_000, 1)
    return round(min(0.99, 0.5 * velocity + 0.3 * telemetry + 0.2 * amount), 4)


def alert_dedup_key(zone_id: str, incident_family: str, bucket: int) -> str:
    return f"{zone_id}:{incident_family}:{bucket}"


class InMemoryJobQueue:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()

    async def enqueue(self, job: dict[str, Any]) -> None:
        await self._queue.put(job)

    async def dequeue(self) -> dict[str, Any]:
        return await self._queue.get()

    def __len__(self) -> int:
        return self._queue.qsize()


def canonical_payload(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def sign_webhook(payload: dict[str, Any], secret: str, timestamp: str) -> str:
    message = timestamp.encode("utf-8") + b"." + canonical_payload(payload)
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def verify_webhook_signature(payload: dict[str, Any], secret: str, timestamp: str, signature: str) -> bool:
    return hmac.compare_digest(sign_webhook(payload, secret, timestamp), signature)


async def deliver_with_retry(
    sender: Callable[[dict[str, Any], str], Awaitable[bool]],
    payload: dict[str, Any],
    secret: str,
    timestamp: str,
    retries: int = 3,
    base_delay: float = 0.05,
) -> bool:
    signature = sign_webhook(payload, secret, timestamp)
    for attempt in range(retries + 1):
        if await sender(payload, signature):
            return True
        if attempt < retries:
            await asyncio.sleep(base_delay * (2**attempt))
    return False


@dataclass
class JobStats:
    accepted: int = 0
    deduplicated: int = 0