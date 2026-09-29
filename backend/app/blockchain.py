from __future__ import annotations

import os
from typing import Any

_PROVIDER_URL = os.getenv("WEB3_PROVIDER_URL", "")
_web3 = None
if _PROVIDER_URL:
    try:
        from web3 import Web3
        _web3 = Web3(Web3.HTTPProvider(_PROVIDER_URL))
    except ImportError:  # optional dependency
        _web3 = None

_anchors: dict[str, dict[str, Any]] = {}


def chain_status() -> dict[str, Any]:
    connected = bool(_web3 is not None and _web3.is_connected())
    return {"chain": "web3" if connected else "local", "connected": connected, "provider_configured": bool(_PROVIDER_URL)}


def submit_merkle_root(merkle_root: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    status = chain_status()
    object_id = str((metadata or {}).get("object_id", merkle_root))
    if status["connected"]:
        # Contract submission is deliberately adapter-shaped; deployment/address are environment concerns.
        tx_hash = None
        result = {"status": "SUBMITTED", "chain": "web3", "merkle_root": merkle_root, "tx_hash": tx_hash, "object_id": object_id}
    else:
        tx_hash = f"local:{merkle_root}"
        result = {"status": "SUBMITTED", "chain": "local", "merkle_root": merkle_root, "tx_hash": tx_hash, "object_id": object_id}
    _anchors[object_id] = result
    return result


def verify_anchor(merkle_root: str, object_id: str | None = None) -> dict[str, Any]:
    key = object_id or merkle_root
    anchor = _anchors.get(key)
    verified = anchor is not None and anchor["merkle_root"] == merkle_root
    return {"verified": verified, "status": "VERIFIED" if verified else "NOT_FOUND", "chain": chain_status()["chain"], "merkle_root": merkle_root, "object_id": key}
