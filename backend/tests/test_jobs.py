import asyncio

from app.jobs import deliver_with_retry, sign_webhook, verify_webhook_signature


def test_hmac_signature_is_deterministic_and_verifiable() -> None:
    payload = {"alert_id": "a-1", "action": "hold"}
    signature = sign_webhook(payload, "secret", "1700000000")
    assert verify_webhook_signature(payload, "secret", "1700000000", signature)
    assert not verify_webhook_signature({**payload, "action": "release"}, "secret", "1700000000", signature)


def test_webhook_retry_stops_after_success() -> None:
    attempts = 0

    async def sender(payload: dict, signature: str) -> bool:
        nonlocal attempts
        attempts += 1
        return attempts == 2

    assert asyncio.run(deliver_with_retry(sender, {"id": "a-1"}, "secret", "now", retries=3, base_delay=0))
    assert attempts == 2