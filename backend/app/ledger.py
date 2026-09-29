from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Any


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def sha256_hex(value: Any) -> str:
    return hashlib.sha256(canonical_json(value)).hexdigest()


def merkle_root(leaves: list[str]) -> str:
    if not leaves:
        return sha256_hex("")
    level = list(leaves)
    while len(level) > 1:
        if len(level) % 2:
            level.append(level[-1])
        level = [hashlib.sha256((level[index] + level[index + 1]).encode("ascii")).hexdigest() for index in range(0, len(level), 2)]
    return level[0]


def merkle_proof(leaves: list[str], index: int) -> list[dict[str, str]]:
    if index < 0 or index >= len(leaves):
        raise IndexError("leaf index out of range")
    proof: list[dict[str, str]] = []
    level = list(leaves)
    cursor = index
    while len(level) > 1:
        if len(level) % 2:
            level.append(level[-1])
        sibling = cursor - 1 if cursor % 2 else cursor + 1
        proof.append({"position": "left" if cursor % 2 else "right", "hash": level[sibling]})
        level = [hashlib.sha256((level[item] + level[item + 1]).encode("ascii")).hexdigest() for item in range(0, len(level), 2)]
        cursor //= 2
    return proof


def verify_merkle_proof(leaf: str, proof: list[dict[str, str]], root: str) -> bool:
    value = leaf
    for item in proof:
        pair = item["hash"] + value if item["position"] == "left" else value + item["hash"]
        value = hashlib.sha256(pair.encode("ascii")).hexdigest()
    return value == root


@dataclass
class AuditLedger:
    events: list[dict[str, Any]] = field(default_factory=list)
    anchors: dict[tuple[str, str], dict[str, Any]] = field(default_factory=dict)

    def append(self, event: dict[str, Any]) -> dict[str, Any]:
        previous = self.events[-1]["event_hash"] if self.events else "0" * 64
        record = {**event, "prev_hash": previous}
        record["event_hash"] = hashlib.sha256(canonical_json(record)).hexdigest()
        self.events.append(record)
        return record

    def anchor(self, object_type: str, object_id: str) -> dict[str, Any]:
        matching = [item for item in self.events if item.get("object_type") == object_type and item.get("object_id") == object_id]
        leaves = [item["event_hash"] for item in matching]
        anchor = {"object_type": object_type, "object_id": object_id, "merkle_root": merkle_root(leaves), "leaf_count": len(leaves)}
        self.anchors[(object_type, object_id)] = anchor
        return anchor

    def verify(self, object_type: str, object_id: str) -> dict[str, Any]:
        anchor = self.anchors.get((object_type, object_id))
        if not anchor:
            return {"status": "TAMPERED", "reason": "No ledger anchor found"}
        matching = [item for item in self.events if item.get("object_type") == object_type and item.get("object_id") == object_id]
        previous = "0" * 64
        valid_chain = True
        for item in matching:
            stored_hash = item.get("event_hash")
            record = {key: value for key, value in item.items() if key != "event_hash"}
            expected_hash = hashlib.sha256(canonical_json(record)).hexdigest()
            if item.get("prev_hash") != previous or stored_hash != expected_hash:
                valid_chain = False
                break
            previous = str(stored_hash)
        current = merkle_root([item["event_hash"] for item in matching])
        status = "VERIFIED" if valid_chain and current == anchor["merkle_root"] else "TAMPERED"
        return {**anchor, "status": status, "current_root": current}