import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ledger import AuditLedger


def main() -> None:
    ledger = AuditLedger()
    ledger.append({"object_type": "case", "object_id": "CASE-2026-MUM-891", "action": "created"})
    ledger.append({"object_type": "case", "object_id": "CASE-2026-MUM-891", "action": "evidence-exported"})
    print("before tamper:", ledger.anchor("case", "CASE-2026-MUM-891"))
    print("verification:", ledger.verify("case", "CASE-2026-MUM-891"))
    ledger.events[0]["action"] = "tampered"
    print("after payload tamper:", ledger.verify("case", "CASE-2026-MUM-891"))
    ledger.events[0]["event_hash"] = "0" * 64
    print("after hash tamper:", ledger.verify("case", "CASE-2026-MUM-891"))


if __name__ == "__main__":
    main()