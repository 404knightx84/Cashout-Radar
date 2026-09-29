# ATM-Sentinel Prototype API

## Run

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API serves the frontend contract with seeded prototype data. It is intentionally in-memory; replace the stores with PostgreSQL, Redis, Celery, and model workers as described in `docs/PROTOTYPE_IMPLEMENTATION_PLAN.md`.

## Prototype auth

`POST /auth/login` accepts JSON with `username` and `password` and returns a JWT bearer token. Seeded demo users are:

| Username | Password | Role | Scope |
| --- | --- | --- | --- |
| `admin` | `admin123` | `I4C_ADMIN` | unrestricted |
| `state.mh` | `state123` | `STATE_OFFICER` | Maharashtra |
| `bank.hdfc` | `bank123` | `BANK_OFFICER` | HDFC Bank |

Set `JWT_SECRET` and the `DEMO_*_PASSWORD` values in the environment for local use. For current frontend compatibility, requests without a bearer token use an in-memory admin development fallback while `AUTH_DEV_FALLBACK=true`. Supplied tokens are always validated and scoped; set it to `false` to require login for every route.

## Run tests

```powershell
cd backend
pip install -r requirements.txt
python -m pytest -q
```

## Docker profile

From the repository root, run `docker compose -f infra/docker-compose.yml up --build`. This starts the API, PostGIS, Redis, and Mailhog. The data services are included as infrastructure targets; the current prototype API remains in-memory.

## Ledger tamper demo

From the repository root, run `python backend/scripts/tamper_demo.py`. It demonstrates a verified anchor becoming `TAMPERED` after either payload or stored-hash mutation.
