from fastapi.testclient import TestClient

from app.auth import authenticate_user, create_access_token
from app.main import app


client = TestClient(app)


def token(username: str, password: str) -> str:
    user = authenticate_user(username, password)
    assert user is not None
    return create_access_token(user)


def test_dev_fallback_keeps_frontend_read_contract() -> None:
    response = client.get("/zones")
    assert response.status_code == 200
    assert response.json()[0]["h3Index"]


def test_state_officer_only_sees_assigned_state() -> None:
    response = client.get("/zones", headers={"Authorization": f"Bearer {token('state.mh', 'state123')}"})
    assert response.status_code == 200
    assert {zone["state"] for zone in response.json()} == {"Maharashtra"}


def test_bank_officer_only_sees_assigned_bank() -> None:
    response = client.get("/atms", headers={"Authorization": f"Bearer {token('bank.hdfc', 'bank123')}"})
    assert response.status_code == 200
    assert {atm["bankName"] for atm in response.json()} == {"HDFC Bank"}


def test_login_returns_bearer_token() -> None:
    response = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"


def test_invalid_supplied_token_is_not_allowed_by_fallback() -> None:
    response = client.get("/zones", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401