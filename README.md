# Cashout-Radar: ATM-Sentinel National ATM Crime Dashboard & Officer Portal

A comprehensive, production-grade frontend platform implementing **S5: Geospatial Risk Dashboard** and **S6: Officer Incident & Case Portal** for monitoring ATM crimes, money mule networks, and tactical law enforcement dispatch.

The complete prototype-only S1-S9 build specification, including data/ML pipelines, backend contracts, security controls, DevOps services, alerting, and blockchain verification, is in [docs/PROTOTYPE_IMPLEMENTATION_PLAN.md](docs/PROTOTYPE_IMPLEMENTATION_PLAN.md).

---

## Architecture & Specification Fulfillment

### S5: Geospatial Risk Dashboard
- **5.1 Base Map with ATM Points (`MapLibre GL`, `OpenStreetMap`, `Tailwind`, `deck.gl`)**:
  - OpenStreetMap raster basemap using MapLibre GL (`maplibregl.Map`), with visible attribution.
  - Terminal markers rendered via Deck.gl `ScatterplotLayer` with status-based colors (Operational: Green, High Risk: Orange, Compromised: Pulsing Crimson).
  - Hover tooltip with terminal metadata, bank name, cash throughput, and sensor flags.
  - Toggleable `/heatmap` density layer (`HeatmapLayer` from `@deck.gl/aggregation-layers`) visualizing crime concentration.
  - Quick city jumping: Mumbai, Delhi, Bengaluru, Hyderabad, Kolkata, Chennai.

- **5.2 H3 Risk Layer & Live/Historical Modes (`deck.gl`, `h3-js`)**:
  - Uber `h3-js` hexagonal grid integration (`PolygonLayer`) rendering real H3 boundaries.
  - Probability color grading (Emerald < 45% -> Amber 45-65% -> Orange 65-80% -> Crimson > 80%).
  - 3D Hexagon Extrusion with elevation proportional to risk probability and alert density.
  - **Live Mode vs Historical Mode**: Real-time streaming vs 24-hour historical time-scrubbing slider with automated playback loop (`isPlayingHistorical`).

- **5.3 Filters & URL Parameter Synchronization (`React`, `URLSearchParams`)**:
  - Filters: State, Crime Type, Minimum Amount (₹), and Time Range (1h, 6h, 24h, 7d, All).
  - Real-time two-way synchronization with browser URL query parameters (`?state=...&crime=...&minAmount=...&mode=historical`) for shareable, bookmarkable operational views.

- **5.4 Zone Drill-Down & Recharts Panels (`Recharts`, `/zones`)**:
  - Top Risk Corridors horizontal bar chart.
  - Alert Influx Volume (12h trend) dual-gradient area chart.
  - Modus Operandi breakdown donut chart.
  - Interactive Zone Drill-Down Drawer showing 24h risk trajectory, AI model contributing factors (+45% Mule Velocity, +30% Bezel Anomaly), list of ATMs in zone, active alerts, and "Deploy PCR Patrol" dispatch action.

- **5.5 Live Updates WebSocket Client (`Task 4.6`)**:
  - WebSocket client service (`websocketService.ts`) attempting connection to `ws://localhost:8000/ws/alerts` with automatic fallback to high-fidelity simulation engine.
  - Controls: Live feed indicator, Pause/Resume, and "Inject Alert" button to trigger instant real-time telemetry spikes and alerts across the dashboard and officer inbox.

---

### S6: Officer Incident & Case Portal
- **6.1 Alert Inbox & Alert Detail (`React`, `/alerts`, `/predictions`)**:
  - Searchable alert inbox with severity badges, status filters (Active, Acknowledged, Investigating, Resolved), and suspected amounts.
  - Alert Detail Modal showing risk probability dial, explainable AI prediction reasons (confidence %, anomaly metrics), and hardware telemetry sensors (bezel vibration G-force, card reader latency, cash shutter anomalies, optical face concealment).

- **6.2 Case View: Mule Chain Graph (`Cytoscape.js`, `/accounts/{hash}/chain`)**:
  - Multi-hop transaction network graph: Victim -> Tier 1 Mules -> Tier 2 Mules -> ATM Terminals & Crypto P2P Exits -> Syndicate Head.
  - Layout options: Hierarchical (breadthfirst), Physics (cose), and Concentric.
  - **Role-based PII Masking Switch**:
    - **Officer View**: Full unmasked names (`Anjali Sharma`, `Ramesh Verma`), account numbers, IFSC codes, IP addresses.
    - **Bank AML Compliance View**: Masked PII (`A**** S****`, `XXXX-XXXX-7465`, `PUNB012****`) adhering to banking confidentiality laws.
  - Interactive Node Inspector with "Freeze Account (Sec 91 CrPC)" action and real-time frozen asset tracking.
    - Selected officer-view IPs are checked against the supplied Tor exit-node, AWS, and Google Cloud feeds in `public/geolocation/`. MaxMind `.mmdb` files remain suitable for a backend geolocation service rather than direct browser use.

- **6.3 Evidence PDF with Audit Hash & QR Code (`qrcode.react`, WeasyPrint)**:
  - Forensic Evidentiary Dossier formatted under Section 65B of the Indian Evidence Act.
  - Cryptographic **SHA-256 Audit Hash** ensuring chain of custody integrity.
  - Dynamic **QR Code** encoding verification portal URL and case audit hash.
  - Court-admissible tables for seized balances, ATM logs, chronology, and digital signature stamp.
  - Single-click "Print / Save PDF (6.3)" optimized with `@media print` CSS for A4 export, plus JSON manifest export.

- **6.4 Acknowledge & Useful/False Feedback Buttons (`/ack`, `/feedback`)**:
  - "Acknowledge" button calling `/ack`, updating alert status and recording officer badge and timestamp.
  - "Useful (True Positive)" and "False Positive" buttons calling `/feedback` with prompt dialog to capture investigative reasons and reinforce detection models.

---

## Getting Started

```bash
cd d:\Cashtrace\atm-crime-officer-portal
npm run dev
```

Visit the local development URL (typically `http://localhost:5173`) in your browser.

### Release Handoff Checklist

A release-ready demo checklist is available in [docs/RELEASE_HANDOFF_CHECKLIST.md](docs/RELEASE_HANDOFF_CHECKLIST.md). It captures the current prototype status, validation steps, launch commands, and known limitations for internal handoff.

### Backend Wiring

The frontend services support both the built-in mock mode and the prototype API contract described in [docs/PROTOTYPE_IMPLEMENTATION_PLAN.md](docs/PROTOTYPE_IMPLEMENTATION_PLAN.md).

```bash
copy .env.example .env.local
npm run dev
```

With `VITE_API_BASE_URL` empty, the app runs entirely offline using the existing mock data and simulated WebSocket feed. Set it to a running FastAPI service to switch REST reads and mutations to the backend; set `VITE_WS_URL` when the WebSocket host differs. Failed or unavailable backend requests fall back to mock data so the UI remains usable during incremental backend development.

### Backend adapters

```powershell
cd d:\Cashtrace\atm-crime-officer-portal
& d:\Cashtrace\.venv-1\Scripts\python.exe -m pip install -r backend\requirements.txt
& d:\Cashtrace\.venv-1\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Run backend tests with `& d:\Cashtrace\.venv-1\Scripts\python.exe -m pytest backend\tests -q`.

The API always has a deterministic in-memory path. SQLAlchemy uses `DATABASE_URL` when installed, otherwise `db.py` exposes a no-op-safe initialization helper. Celery is enabled only when both the package and `REDIS_URL` are available; complaint scoring otherwise goes to the local async queue. LightGBM, SHAP, scikit-learn, Web3, and PostGIS/GeoAlchemy support are optional at runtime and each adapter falls back to deterministic baseline or local behavior when unavailable. Set `WEB3_PROVIDER_URL` to enable the Web3 adapter; without it ledger anchors remain verifiable in memory.

### Start Live Prototype

From PowerShell, run the included launcher from the project directory:

```powershell
.\start-live.ps1
```

It opens separate PowerShell windows for the FastAPI backend and Vite frontend. The launcher uses paths relative to itself, so it also works when the project is extracted somewhere other than `D:\Cashtrace`.
