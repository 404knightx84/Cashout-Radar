from app.ledger import AuditLedger, canonical_json, merkle_proof, merkle_root, sha256_hex, verify_merkle_proof


def test_canonical_json_is_key_order_independent() -> None:
    assert canonical_json({"b": 2, "a": 1}) == canonical_json({"a": 1, "b": 2})
    assert sha256_hex({"b": 2, "a": 1}) == sha256_hex({"a": 1, "b": 2})


def test_merkle_proof_round_trips_with_odd_leaf_count() -> None:
    leaves = [sha256_hex(value) for value in ("a", "b", "c")]
    proof = merkle_proof(leaves, 2)
    assert verify_merkle_proof(leaves[2], proof, merkle_root(leaves))


def test_audit_anchor_detects_tampering() -> None:
    ledger = AuditLedger()
    ledger.append({"object_type": "alert", "object_id": "a-1", "action": "created"})
    ledger.anchor("alert", "a-1")
    assert ledger.verify("alert", "a-1")["status"] == "VERIFIED"
    ledger.events[0]["action"] = "tampered"
    assert ledger.verify("alert", "a-1")["status"] == "TAMPERED"
    ledger.events[0]["event_hash"] = "0" * 64
    assert ledger.verify("alert", "a-1")["status"] == "TAMPERED"