from fastapi.testclient import TestClient

from app.blockchain import submit_merkle_root, verify_anchor
from app.db import init_db
from app.jobs import baseline_score
from app.main import app
from app.ml_pipeline import evaluate
from app import models
from app.tasks import celery_app


client = TestClient(app)


def test_database_models_import_and_init_helper() -> None:
    assert all(hasattr(models, name) for name in ("Zone", "ATM", "Complaint", "Alert", "LedgerAnchor"))
    assert isinstance(init_db(), bool)


def test_complaint_endpoint_queues_without_celery() -> None:
    response = client.post("/complaints", json={"description": "Suspicious cash withdrawal", "amount": 12000, "velocity": 4})
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "RECEIVED"
    assert body["queue"]["backend"] == ("celery" if celery_app is not None else "local")


def test_celery_fallback_keeps_baseline_deterministic() -> None:
    assert baseline_score({"velocity": 10, "telemetry_anomaly": 5, "amount": 500000}) == 0.99


def test_baseline_evaluation_metrics_are_stable() -> None:
    metrics = evaluate([0.9, 0.2, 0.8], [1, 0, 1], top_k=2)
    assert metrics["recall_at_40"] == 1.0
    assert metrics["ndcg"] == 1.0
    assert metrics["brier"] >= 0


def test_blockchain_local_fallback_round_trip() -> None:
    submitted = submit_merkle_root("abc123", {"object_id": "complaint-1"})
    assert submitted["chain"] in {"local", "web3"}
    verified = verify_anchor("abc123", "complaint-1")
    assert verified["verified"] is True
