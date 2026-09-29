from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .auth import (
    ROLE_BANK_OFFICER,
    ROLE_I4C_ADMIN,
    JWT_EXPIRE_MINUTES,
    User,
    authenticate_user,
    create_access_token,
    current_user,
    decode_access_token,
    require_scope,
)
from .ledger import AuditLedger
from .blockchain import submit_merkle_root, verify_anchor
from .tasks import enqueue_complaint

app = FastAPI(title="ATM-Sentinel Prototype API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def zone(zone_id: str, name: str, city: str, state: str, lat: float, lng: float, risk: float, crime: str) -> dict[str, Any]:
    return {
        "h3Index": zone_id,
        "zoneName": name,
        "city": city,
        "state": state,
        "center": [lat, lng],
        "boundary": [[lng - 0.025, lat - 0.02], [lng + 0.025, lat - 0.02], [lng + 0.025, lat + 0.02], [lng - 0.025, lat + 0.02], [lng - 0.025, lat - 0.02]],
        "riskProbability": risk,
        "riskLevel": "CRITICAL" if risk >= 0.8 else "HIGH" if risk >= 0.65 else "MEDIUM",
        "primaryCrimeType": crime,
        "atmCount": 2,
        "activeAlertsCount": 1,
        "historicalProbabilities": [{"timestamp": f"2026-09-29T{hour:02d}:00:00Z", "probability": round(max(0.1, risk - (11 - hour) * 0.01), 2)} for hour in range(12)],
        "contributingFactors": [
            {"factor": "Mule velocity", "weight": 0.45, "description": "Rapid cross-zone withdrawals"},
            {"factor": "Terminal telemetry", "weight": 0.30, "description": "Bezel and reader anomalies"},
        ],
    }


ZONES = [
    zone("8928308280fffff", "Andheri East Corridor", "Mumbai", "Maharashtra", 19.1197, 72.8468, 0.91, "Mule Cash-Out"),
    zone("89283082807ffff", "Connaught Place Grid", "Delhi", "Delhi", 28.6315, 77.2167, 0.78, "ATM Skimming"),
    zone("89618d2a6cfffff", "Koramangala Cluster", "Bengaluru", "Karnataka", 12.9352, 77.6245, 0.68, "Card Cloning"),
    zone("89283082817ffff", "Bandra Kurla Banking Enclave", "Mumbai", "Maharashtra", 19.0596, 72.8656, 0.84, "ATM Skimming"),
    zone("89283082837ffff", "Nehru Place Financial Market", "Delhi", "Delhi", 28.5494, 77.2526, 0.73, "Card Cloning"),
    zone("89618d2a6bfffff", "HITEC City Tech Centre", "Hyderabad", "Telangana", 17.4474, 78.3762, 0.86, "Mule Cash-Out"),
    zone("8929a2d2c3fffff", "Park Street Financial Boulevard", "Kolkata", "West Bengal", 22.5521, 88.3533, 0.71, "Card Cloning"),
    zone("8944a1ad2bfffff", "T Nagar Retail Hub", "Chennai", "Tamil Nadu", 13.0418, 80.2341, 0.81, "Cash Trapping"),
    zone("8961a1ad2bfffff", "SG Highway Commercial Corridor", "Ahmedabad", "Gujarat", 23.0338, 72.5074, 0.67, "Mule Cash-Out"),
    zone("89283082827ffff", "Dadar Central Transit Hub", "Mumbai", "Maharashtra", 19.0178, 72.8478, 0.65, "Cash Trapping"),
    zone("89283082847ffff", "Thane West Banking Strip", "Thane", "Maharashtra", 19.2183, 72.9781, 0.82, "Mule Cash-Out"),
    zone("89283082857ffff", "Karol Bagh Commercial Zone", "New Delhi", "Delhi", 28.6514, 77.1907, 0.79, "Cash Trapping"),
    zone("89283082867ffff", "Rohini Sector 10 Cluster", "New Delhi", "Delhi", 28.7159, 77.1132, 0.58, "Physical Tampering"),
    zone("89283082877ffff", "Gurugram Cyber City Border", "Gurugram", "Delhi", 28.4950, 77.0895, 0.72, "Mule Cash-Out"),
    zone("89618d2a7bfffff", "Indiranagar Metro Corridor", "Bengaluru", "Karnataka", 12.9784, 77.6408, 0.68, "ATM Skimming"),
    zone("89618d2a8bfffff", "Whitefield IT Export Zone", "Bengaluru", "Karnataka", 12.9698, 77.7499, 0.52, "Card Cloning"),
    zone("89618d2a9bfffff", "Electronic City Terminal", "Bengaluru", "Karnataka", 12.8399, 77.6770, 0.61, "Coercion / Robbery"),
    zone("89618d2aabfffff", "Banjara Hills Road 12", "Hyderabad", "Telangana", 17.4156, 78.4354, 0.64, "ATM Skimming"),
    zone("89618d2abbfffff", "Secunderabad Station Area", "Secunderabad", "Telangana", 17.4399, 78.4983, 0.77, "Cash Trapping"),
    zone("8929a2d2d3fffff", "Salt Lake Sector V Tech Hub", "Kolkata", "West Bengal", 22.5804, 88.4378, 0.59, "ATM Skimming"),
    zone("8944a1ad3bfffff", "OMR Cyber Corridor", "Chennai", "Tamil Nadu", 12.9255, 80.2298, 0.49, "Mule Cash-Out"),
    zone("8961a1ad3bfffff", "Ashram Road Banking Row", "Ahmedabad", "Gujarat", 23.0258, 72.5714, 0.62, "ATM Skimming"),
]

ATMS = [
    {"id": "atm-mum-001", "terminalId": "MUM-HDFC-0041", "bankName": "HDFC Bank", "locationName": "Andheri East Metro", "address": "Mahakali Caves Road, Mumbai", "city": "Mumbai", "state": "Maharashtra", "latitude": 19.1197, "longitude": 72.8468, "h3Index": ZONES[0]["h3Index"], "riskScore": 94, "riskLevel": "CRITICAL", "status": "Compromised", "dailyVolume": 840000, "incidentCount": 6, "hasSkimmerReport": True, "hasTamperAlert": True},
    {"id": "atm-mum-002", "terminalId": "MUM-ICICI-0108", "bankName": "ICICI Bank", "locationName": "SEEPZ Gate", "address": "MIDC Central Road, Mumbai", "city": "Mumbai", "state": "Maharashtra", "latitude": 19.1152, "longitude": 72.8581, "h3Index": ZONES[0]["h3Index"], "riskScore": 78, "riskLevel": "HIGH", "status": "Under Investigation", "dailyVolume": 610000, "incidentCount": 3},
    {"id": "atm-del-001", "terminalId": "DEL-SBI-0220", "bankName": "State Bank of India", "locationName": "Rajiv Chowk", "address": "Connaught Place, New Delhi", "city": "Delhi", "state": "Delhi", "latitude": 28.6315, "longitude": 77.2167, "h3Index": ZONES[1]["h3Index"], "riskScore": 81, "riskLevel": "CRITICAL", "status": "Compromised", "dailyVolume": 720000, "incidentCount": 4, "hasTamperAlert": True},
    {"id": "atm-blr-001", "terminalId": "BLR-AXIS-0099", "bankName": "Axis Bank", "locationName": "Koramangala 5th Block", "address": "80 Feet Road, Bengaluru", "city": "Bengaluru", "state": "Karnataka", "latitude": 12.9352, "longitude": 77.6245, "h3Index": ZONES[2]["h3Index"], "riskScore": 69, "riskLevel": "HIGH", "status": "Operational", "dailyVolume": 510000, "incidentCount": 2},
    {"id": "atm-mum-003", "terminalId": "MUM-ICICI-0114", "bankName": "ICICI Bank", "locationName": "Bandra Kurla Complex", "address": "G Block, Bandra East, Mumbai", "city": "Mumbai", "state": "Maharashtra", "latitude": 19.0596, "longitude": 72.8656, "h3Index": ZONES[3]["h3Index"], "riskScore": 86, "riskLevel": "CRITICAL", "status": "Under Investigation", "dailyVolume": 930000, "incidentCount": 5, "hasSkimmerReport": True},
    {"id": "atm-del-002", "terminalId": "DEL-HDFC-0231", "bankName": "HDFC Bank", "locationName": "Nehru Place", "address": "Nehru Place, New Delhi", "city": "Delhi", "state": "Delhi", "latitude": 28.5494, "longitude": 77.2526, "h3Index": ZONES[4]["h3Index"], "riskScore": 75, "riskLevel": "HIGH", "status": "Operational", "dailyVolume": 640000, "incidentCount": 3},
    {"id": "atm-hyd-001", "terminalId": "HYD-SBI-0312", "bankName": "State Bank of India", "locationName": "HITEC City Metro", "address": "Madhapur, Hyderabad", "city": "Hyderabad", "state": "Telangana", "latitude": 17.4474, "longitude": 78.3762, "h3Index": ZONES[5]["h3Index"], "riskScore": 83, "riskLevel": "CRITICAL", "status": "Compromised", "dailyVolume": 780000, "incidentCount": 4, "hasTamperAlert": True},
    {"id": "atm-kol-001", "terminalId": "KOL-AXIS-0407", "bankName": "Axis Bank", "locationName": "Park Street", "address": "Park Street, Kolkata", "city": "Kolkata", "state": "West Bengal", "latitude": 22.5521, "longitude": 88.3533, "h3Index": ZONES[6]["h3Index"], "riskScore": 72, "riskLevel": "HIGH", "status": "Operational", "dailyVolume": 470000, "incidentCount": 2},
    {"id": "atm-che-001", "terminalId": "CHE-HDFC-0518", "bankName": "HDFC Bank", "locationName": "T Nagar Panagal Park", "address": "T Nagar, Chennai", "city": "Chennai", "state": "Tamil Nadu", "latitude": 13.0418, "longitude": 80.2341, "h3Index": ZONES[7]["h3Index"], "riskScore": 79, "riskLevel": "HIGH", "status": "Under Investigation", "dailyVolume": 560000, "incidentCount": 3},
    {"id": "atm-ahm-001", "terminalId": "AHM-BOB-0604", "bankName": "Bank of Baroda", "locationName": "SG Highway", "address": "SG Highway, Ahmedabad", "city": "Ahmedabad", "state": "Gujarat", "latitude": 23.0338, "longitude": 72.5074, "h3Index": ZONES[8]["h3Index"], "riskScore": 66, "riskLevel": "HIGH", "status": "Operational", "dailyVolume": 390000, "incidentCount": 2},
]

for index, live_zone in enumerate(ZONES[9:], start=9):
    risk_score = round(live_zone["riskProbability"] * 100)
    risk_level = "CRITICAL" if risk_score >= 80 else "HIGH" if risk_score >= 65 else "MEDIUM"
    ATMS.append({
        "id": f"atm-demo-{index:03d}",
        "terminalId": f"DEMO-{index:03d}",
        "bankName": ["HDFC Bank", "ICICI Bank", "Axis Bank", "State Bank of India"][index % 4],
        "locationName": live_zone["zoneName"],
        "address": f"{live_zone['city']} monitored corridor",
        "city": live_zone["city"],
        "state": live_zone["state"],
        "latitude": live_zone["center"][0],
        "longitude": live_zone["center"][1],
        "h3Index": live_zone["h3Index"],
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "status": "Under Investigation" if risk_score >= 80 else "Operational",
        "dailyVolume": 300000 + index * 17000,
        "incidentCount": max(1, round(live_zone["riskProbability"] * 5)),
        "hasTamperAlert": risk_score >= 80,
    })


def reason(reason_id: str, factor: str, confidence: int, description: str, severity: str, metric: str) -> dict[str, Any]:
    return {"id": reason_id, "factor": factor, "confidence": confidence, "description": description, "severity": severity, "anomalyMetric": metric}


ALERTS: list[dict[str, Any]] = [
    {
        "id": "alt-api-001", "alertNumber": "ALT-2026-API-0001", "timestamp": "2026-09-29 14:20:00", "atmId": "atm-mum-001", "terminalId": "MUM-HDFC-0041", "bankName": "HDFC Bank", "zoneId": ZONES[0]["h3Index"], "zoneName": ZONES[0]["zoneName"], "city": "Mumbai", "state": "Maharashtra", "crimeType": "Mule Cash-Out", "riskProbability": 0.91, "riskLevel": "CRITICAL", "status": "ACTIVE", "suspectedAmount": 186000, "caseId": "CASE-2026-MUM-891", "reasons": [reason("api-r1", "Withdrawal velocity spike", 94, "Nine linked accounts withdrew in a 12-minute window.", "critical", "+240% baseline")], "telemetry": {"bezelVibrationG": 1.8, "cardReaderLatencyMs": 487, "cashShutterAnomalies": 4, "cameraOpticalFlow": 82.4, "cardClusterVelocity": "High-frequency burst"},
    },
    {
        "id": "alt-api-002", "alertNumber": "ALT-2026-API-0002", "timestamp": "2026-09-29 13:58:00", "atmId": "atm-del-001", "terminalId": "DEL-SBI-0220", "bankName": "State Bank of India", "zoneId": ZONES[1]["h3Index"], "zoneName": ZONES[1]["zoneName"], "city": "Delhi", "state": "Delhi", "crimeType": "ATM Skimming", "riskProbability": 0.81, "riskLevel": "CRITICAL", "status": "ACKNOWLEDGED", "acknowledgedBy": "State Control Room", "acknowledgedAt": "2026-09-29 14:05:00", "suspectedAmount": 92000, "caseId": "CASE-2026-MUM-891", "reasons": [reason("api-r2", "Bezel vibration anomaly", 88, "Sensor vibration is above the tamper threshold.", "warning", "1.7G")], "telemetry": {"bezelVibrationG": 1.7, "cardReaderLatencyMs": 390, "cashShutterAnomalies": 2, "cameraOpticalFlow": 75.1, "cardClusterVelocity": "Elevated"},
    },
]

COMPLAINTS: list[dict[str, Any]] = []

for index, live_atm in enumerate(ATMS[4:16], start=3):
    live_zone = next(item for item in ZONES if item["h3Index"] == live_atm["h3Index"])
    probability = round(live_atm["riskScore"] / 100, 2)
    ALERTS.append({
        "id": f"alt-demo-{index:03d}",
        "alertNumber": f"ALT-2026-DEMO-{index:04d}",
        "timestamp": f"2026-09-29 {12 + index % 6:02d}:{(index * 7) % 60:02d}:00",
        "atmId": live_atm["id"],
        "terminalId": live_atm["terminalId"],
        "bankName": live_atm["bankName"],
        "zoneId": live_zone["h3Index"],
        "zoneName": live_zone["zoneName"],
        "city": live_zone["city"],
        "state": live_zone["state"],
        "crimeType": live_zone["primaryCrimeType"],
        "riskProbability": probability,
        "riskLevel": "CRITICAL" if probability >= 0.8 else "HIGH" if probability >= 0.65 else "MEDIUM",
        "status": "ACTIVE" if index % 3 else "ACKNOWLEDGED",
        "suspectedAmount": 45000 + index * 11000,
        "caseId": "CASE-2026-MUM-891",
        "reasons": [reason(f"demo-r-{index}", "Historical demo signal", round(probability * 100), "Synthetic demo activity matches a known corridor pattern.", "warning", f"{round(probability * 100)}% model score")],
        "telemetry": {"bezelVibrationG": round(0.7 + probability, 2), "cardReaderLatencyMs": 250 + index * 11, "cashShutterAnomalies": index % 4, "cameraOpticalFlow": round(66 + probability * 20, 1), "cardClusterVelocity": "Elevated corridor activity"},
    })

CASE_DATA: dict[str, Any] = {
    "caseId": "CASE-2026-MUM-891", "title": "Andheri East Mule Cash-Out Syndicate", "createdDate": "2026-09-29", "assignedOfficer": {"name": "Inspector R. Sangwan", "badgeNumber": "MH-CYBER-8841", "unit": "Mumbai Cyber Crime Cell"}, "status": "Investigation", "totalDefraudedAmount": 428000, "frozenAmount": 172000, "associatedAlerts": ALERTS[:1],
    "nodes": [
        {"id": "victim-1", "type": "victim", "label": "Victim cluster", "accountNumber": "001122334455", "maskedAccountNumber": "XXXX-XXXX-4455", "accountHolder": "Anjali Sharma", "maskedAccountHolder": "A**** S****", "bankName": "HDFC Bank", "maskedBankName": "HDFC Bank", "ifsc": "HDFC0001234", "maskedIfsc": "HDFC000****", "balance": 0, "frozen": False, "kycStatus": "Verified", "riskScore": 61},
        {"id": "mule-1", "type": "mule_tier1", "label": "Tier 1 mule", "accountNumber": "778899001122", "maskedAccountNumber": "XXXX-XXXX-1122", "accountHolder": "Ramesh Verma", "maskedAccountHolder": "R**** V****", "bankName": "Punjab National Bank", "maskedBankName": "Punjab National Bank", "ifsc": "PUNB0123456", "maskedIfsc": "PUNB012****", "balance": 172000, "frozen": True, "kycStatus": "Compromised", "riskScore": 94, "deviceIp": "103.21.244.18", "location": "Mumbai, Maharashtra"},
        {"id": "atm-out-1", "type": "atm_cashout", "label": "ATM cash-out", "accountNumber": "ATM-MUM-0041", "maskedAccountNumber": "ATM-****-0041", "accountHolder": "MUM-HDFC-0041", "maskedAccountHolder": "MUM-****-0041", "bankName": "HDFC Bank", "maskedBankName": "HDFC Bank", "ifsc": "N/A", "maskedIfsc": "N/A", "balance": 0, "frozen": False, "kycStatus": "Unknown", "riskScore": 87},
    ],
    "edges": [{"id": "edge-1", "source": "victim-1", "target": "mule-1", "amount": 172000, "timestamp": "2026-09-29 14:08:00", "channel": "UPI", "referenceHash": "sha256:prototype-transfer-1", "flaggedAnomaly": True}, {"id": "edge-2", "source": "mule-1", "target": "atm-out-1", "amount": 168000, "timestamp": "2026-09-29 14:17:00", "channel": "ATM_CASH", "referenceHash": "sha256:prototype-withdrawal-1", "flaggedAnomaly": True}],
    "auditHash": "prototype-api-audit-hash", "qrCodeUrl": "http://localhost:5173/verify/CASE-2026-MUM-891", "timeline": [{"time": "2026-09-29 14:08:00", "event": "Funds consolidated into Tier 1 mule account", "officer": "Model scoring worker"}, {"time": "2026-09-29 14:20:00", "event": "Critical alert issued", "officer": "ATM-Sentinel"}],
}


class AcknowledgeRequest(BaseModel):
    officerName: str = Field(min_length=1, max_length=120)


class FeedbackRequest(BaseModel):
    isUseful: bool
    reason: str = Field(default="", max_length=500)
    officerId: str = Field(min_length=1, max_length=80)


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.connections.discard(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        for connection in self.connections:
            try:
                await connection.send_json(message)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)


manager = ConnectionManager()
ledger = AuditLedger()


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class LedgerAnchorRequest(BaseModel):
    objectType: str = Field(min_length=1, max_length=80)
    objectId: str = Field(min_length=1, max_length=160)


class ComplaintRequest(BaseModel):
    complaintId: str | None = Field(default=None, max_length=80)
    atmId: str | None = Field(default=None, max_length=120)
    zoneId: str | None = Field(default=None, max_length=40)
    incidentFamily: str = Field(default="complaint", min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=2000)
    amount: float = Field(default=0, ge=0)
    velocity: float = Field(default=0, ge=0)
    telemetryAnomaly: float = Field(default=0, ge=0)


@app.post("/auth/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    user = authenticate_user(payload.username, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "expires_in": 60 * JWT_EXPIRE_MINUTES,
        "user": user.claims(),
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "prototype-api"}


@app.get("/zones")
def get_zones(user: User = Depends(current_user)) -> list[dict[str, Any]]:
    return [deepcopy(item) for item in ZONES if _in_user_scope(user, item.get("state"))]


@app.get("/zones/{h3_index}")
def get_zone(h3_index: str, user: User = Depends(current_user)) -> dict[str, Any]:
    item = next((value for value in ZONES if value["h3Index"] == h3_index), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    require_scope(user, state=item["state"])
    return deepcopy(item)


@app.get("/atms")
def get_atms(user: User = Depends(current_user)) -> list[dict[str, Any]]:
    return [deepcopy(item) for item in ATMS if _in_user_scope(user, item.get("state"), item.get("bankName"))]


@app.get("/heatmap")
def get_heatmap(user: User = Depends(current_user)) -> list[dict[str, float]]:
    return [{"latitude": atm["latitude"], "longitude": atm["longitude"], "weight": atm["riskScore"] / 100 * (atm["incidentCount"] + 1)} for atm in get_atms(user)]


@app.get("/alerts")
def get_alerts(user: User = Depends(current_user)) -> list[dict[str, Any]]:
    return [deepcopy(item) for item in ALERTS if _in_user_scope(user, item.get("state"), item.get("bankName"))]


@app.get("/predictions/{alert_id}")
def get_prediction(alert_id: str, user: User = Depends(current_user)) -> dict[str, Any]:
    alert = next((value for value in ALERTS if value["id"] == alert_id), None)
    if alert is None:
        raise HTTPException(status_code=404, detail="Prediction not found")
    require_scope(user, state=alert.get("state"), bank=alert.get("bankName"))
    return {"alertId": alert["id"], **{key: alert[key] for key in ("riskProbability", "riskLevel", "crimeType", "reasons", "telemetry")}}


@app.post("/complaints", status_code=202)
def create_complaint(payload: ComplaintRequest, user: User = Depends(current_user)) -> dict[str, Any]:
    complaint_id = payload.complaintId or f"CMP-{len(COMPLAINTS) + 1:06d}"
    complaint = {"complaintId": complaint_id, **payload.model_dump(exclude={"complaintId"}), "status": "RECEIVED", "createdAt": now()}
    job_payload = {
        "amount": complaint["amount"],
        "velocity": complaint["velocity"],
        "telemetry_anomaly": complaint["telemetryAnomaly"],
        "zone_id": complaint["zoneId"],
        "incident_family": complaint["incidentFamily"],
    }
    complaint["queue"] = enqueue_complaint(job_payload)
    COMPLAINTS.append(complaint)
    return complaint


@app.get("/accounts/{account_hash}/chain")
def get_chain(account_hash: str, role: str = "OFFICER", user: User = Depends(current_user)) -> dict[str, Any]:
    if account_hash not in {"CASE-2026-MUM-891", "demo-account"}:
        raise HTTPException(status_code=404, detail="Case not found")
    require_scope(user, state="Maharashtra", bank="HDFC Bank")
    result = deepcopy(CASE_DATA)
    if user.role == ROLE_BANK_OFFICER or role == "BANK_COMPLIANCE":
        for node in result["nodes"]:
            node["accountNumber"] = node["maskedAccountNumber"]
            node["accountHolder"] = node["maskedAccountHolder"]
            node["bankName"] = node["maskedBankName"]
            node["ifsc"] = node["maskedIfsc"]
            node["deviceIp"] = "PROTECTED / PRIVILEGED"
    return result


@app.post("/alerts/{alert_id}/ack")
async def acknowledge(alert_id: str, payload: AcknowledgeRequest, user: User = Depends(current_user)) -> dict[str, Any]:
    alert = next((value for value in ALERTS if value["id"] == alert_id), None)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    require_scope(user, state=alert.get("state"), bank=alert.get("bankName"))
    alert["status"] = "ACKNOWLEDGED"
    alert["acknowledgedBy"] = payload.officerName
    alert["acknowledgedAt"] = now()
    await manager.broadcast({"type": "ALERT_UPDATED", "timestamp": now(), "data": deepcopy(alert)})
    return {"success": True, "alert": deepcopy(alert)}


@app.post("/alerts/{alert_id}/feedback")
async def feedback(alert_id: str, payload: FeedbackRequest, user: User = Depends(current_user)) -> dict[str, Any]:
    alert = next((value for value in ALERTS if value["id"] == alert_id), None)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    require_scope(user, state=alert.get("state"), bank=alert.get("bankName"))
    alert["status"] = "INVESTIGATING" if payload.isUseful else "FALSE_POSITIVE"
    alert["feedback"] = {"isUseful": payload.isUseful, "reason": payload.reason, "timestamp": now(), "officerId": payload.officerId}
    await manager.broadcast({"type": "ALERT_UPDATED", "timestamp": now(), "data": deepcopy(alert)})
    return {"success": True, "alert": deepcopy(alert)}


@app.get("/reports/{case_id}")
def get_report(case_id: str, user: User = Depends(current_user)) -> dict[str, Any]:
    if case_id != CASE_DATA["caseId"]:
        raise HTTPException(status_code=404, detail="Case not found")
    require_scope(user, state="Maharashtra", bank="HDFC Bank")
    return deepcopy(CASE_DATA)


@app.post("/accounts/{node_id}/freeze")
def toggle_freeze(node_id: str, user: User = Depends(current_user)) -> dict[str, Any]:
    node = next((value for value in CASE_DATA["nodes"] if value["id"] == node_id), None)
    if node is None:
        raise HTTPException(status_code=404, detail="Account node not found")
    if user.role == ROLE_BANK_OFFICER:
        raise HTTPException(status_code=403, detail="Bank officers cannot freeze accounts in this prototype")
    require_scope(user, state="Maharashtra", bank="HDFC Bank")
    node["frozen"] = not node["frozen"]
    CASE_DATA["frozenAmount"] = sum(value["balance"] for value in CASE_DATA["nodes"] if value["frozen"])
    return {"success": True, "frozen": node["frozen"]}


@app.post("/ledger/anchor")
def anchor_ledger(payload: LedgerAnchorRequest, user: User = Depends(current_user)) -> dict[str, Any]:
    if user.role != ROLE_I4C_ADMIN:
        raise HTTPException(status_code=403, detail="Only I4C administrators can anchor the ledger")
    result = ledger.anchor(payload.objectType, payload.objectId)
    return {**result, "chain": submit_merkle_root(result["merkle_root"], {"object_id": payload.objectId})}


@app.get("/ledger/{object_type}/{object_id}/verify")
def verify_ledger(object_type: str, object_id: str, user: User = Depends(current_user)) -> dict[str, Any]:
    require_scope(user, state="Maharashtra")
    result = ledger.verify(object_type, object_id)
    return {**result, "chain": verify_anchor(result.get("merkle_root", ""), object_id)}


def _in_user_scope(user: User, state: str | None, bank: str | None = None) -> bool:
    try:
        require_scope(user, state=state, bank=bank)
        return True
    except HTTPException:
        return False


@app.websocket("/ws/alerts")
async def alerts_socket(websocket: WebSocket) -> None:
    authorization = websocket.headers.get("authorization")
    if authorization:
        try:
            decode_access_token(authorization.removeprefix("Bearer ").strip())
        except HTTPException:
            await websocket.close(code=1008)
            return
    await manager.connect(websocket)
    try:
        await websocket.send_json({"type": "HEARTBEAT", "timestamp": now(), "data": {"status": "CONNECTED", "isSimulated": False}})
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "HEARTBEAT", "timestamp": now(), "data": {"status": "CONNECTED", "isSimulated": False}})
    except (WebSocketDisconnect, asyncio.CancelledError):
        manager.disconnect(websocket)
