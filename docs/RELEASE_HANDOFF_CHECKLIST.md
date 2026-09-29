# ATM-Sentinel Release Handoff Checklist

## Product status

Status: Prototype / demo-ready local deployment

This handoff package documents the current state of the ATM-Sentinel project for a demo or internal review. It is not a production banking, telecom, or law-enforcement system. Data is local and in-memory unless explicitly connected to a real backend source.

---

## 1. Functional checklist

### Frontend
- [x] Vite app loads successfully in the browser
- [x] React dashboard renders the map, filters, and KPI cards
- [x] State/crime filters respond and update URL parameters
- [x] Map controls remain usable without the quick city row
- [x] Live alert simulation can inject alerts without runtime crashes
- [x] Officer portal flows remain accessible in the current prototype mode

### Backend
- [x] FastAPI app starts successfully on localhost:8000
- [x] Health endpoint responds
- [x] Auth flow is available for app access
- [x] Alert, zone, and complaint endpoints are reachable
- [x] In-memory demo data remains available if backend services are unavailable

### Data model and logic
- [x] Risk score computation is explainable and deterministic
- [x] Baseline model fallback works for prototype mode
- [x] WebSocket feed falls back to simulation instead of failing silently
- [x] ML path is documented as prototype-only and not production-trained

---

## 2. Current limitations and explicit exclusions

- [ ] Real production data source is not connected
- [ ] Real bank feed or NCRP integration is not enabled
- [ ] Real-time external geolocation stream is not connected
- [ ] No live ML model deployment is configured
- [ ] No production database or Redis cluster is required for demo mode
- [ ] No production SSO or hardened identity system is configured
- [ ] No compliance-grade retention, audit, or legal controls are in place beyond prototype scaffolding

---

## 3. Launch / run checklist

### Start the backend

```powershell
cd D:\Cashtrace\atm-crime-officer-portal\backend
& 'D:\Cashtrace\.venv-1\Scripts\python.exe' -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Start the frontend

```powershell
Set-Location 'D:\Cashtrace\atm-crime-officer-portal'
npm run dev -- --host 127.0.0.1
```

### Validate the build

```powershell
Set-Location 'D:\Cashtrace\atm-crime-officer-portal'
npm run build
```

### Validate endpoints

```powershell
Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8000/health'
Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:5173/'
```

---

## 4. Demo script checklist

- [ ] Open the dashboard at localhost:5173
- [ ] Confirm the filters work and URL sync reflects changes
- [ ] Confirm map renders without broken worker or tile issues in the current browser session
- [ ] Click a zone and confirm drill-down data loads
- [ ] Trigger an alert from the live simulation flow
- [ ] Open the officer inbox and inspect the alert detail
- [ ] Review the score explanation and telemetry details
- [ ] Confirm that the prototype clearly communicates its non-production status

---

## 5. Release sign-off

### Recommended sign-off wording

> This project is a working prototype and internal demo deployment. It is suitable for stakeholder review, feature validation, and user experience walkthroughs, but it is not yet production-ready and does not ingest live production banking or fraud data.

### Owner
- Internal demo / prototype review: product owner or technical lead

### Evidence required before broader rollout
- Real data feed contract review
- Security review and RBAC gap assessment
- Model governance review and training data approval
- Production infra design and ops runbook
- Compliance and legal review for case data handling

---

## 6. Known handoff notes

- The project is intentionally structured to allow a later move from mock/in-memory mode to real services via the existing `apiService` and `websocketService` adapters.
- The codebase is already organized for incremental replacement: frontend interface abstraction, backend routes, and prototype-only fallback logic are in place.
- The app should be treated as a demonstrator and validation tool until the production integration backlog is completed.
