export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CrimeType = 
  | 'ATM Skimming'
  | 'Cash Trapping'
  | 'Physical Tampering'
  | 'Mule Cash-Out'
  | 'Card Cloning'
  | 'Coercion / Robbery';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface ATMPoint {
  id: string;
  terminalId: string;
  bankName: string;
  locationName: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  h3Index: string;
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  status: 'Operational' | 'Compromised' | 'Under Investigation' | 'Offline';
  dailyVolume: number; // in INR
  incidentCount: number;
  lastIncidentTime?: string;
  hasSkimmerReport?: boolean;
  hasTamperAlert?: boolean;
}

export interface H3Zone {
  h3Index: string;
  zoneName: string;
  city: string;
  state: string;
  center: [number, number]; // [lat, lng]
  boundary: [number, number][]; // [ [lng, lat], ... ] for polygon rendering
  riskProbability: number; // 0.0 - 1.0
  riskLevel: RiskLevel;
  primaryCrimeType: CrimeType;
  atmCount: number;
  activeAlertsCount: number;
  historicalProbabilities: {
    timestamp: string;
    probability: number;
  }[];
  contributingFactors: {
    factor: string;
    weight: number;
    description: string;
  }[];
}

export interface PredictionReason {
  id: string;
  factor: string;
  confidence: number; // 0 - 100%
  description: string;
  severity: 'critical' | 'warning' | 'info';
  anomalyMetric?: string;
}

export interface AlertItem {
  id: string;
  alertNumber: string;
  timestamp: string;
  atmId: string;
  terminalId: string;
  bankName: string;
  zoneId: string;
  zoneName: string;
  city: string;
  state: string;
  crimeType: CrimeType;
  riskProbability: number; // 0.0 - 1.0
  riskLevel: RiskLevel;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  feedback?: {
    isUseful: boolean;
    reason?: string;
    timestamp: string;
    officerId: string;
  };
  suspectedAmount: number;
  caseId?: string;
  reasons: PredictionReason[];
  telemetry: {
    bezelVibrationG: number;
    cardReaderLatencyMs: number;
    cashShutterAnomalies: number;
    cameraOpticalFlow: number;
    cardClusterVelocity: string;
  };
}

export type RoleType = 'OFFICER' | 'BANK_COMPLIANCE';

export interface MuleNode {
  id: string;
  type: 'victim' | 'mule_tier1' | 'mule_tier2' | 'atm_cashout' | 'crypto_exit' | 'ringleader';
  label: string;
  accountNumber: string;
  maskedAccountNumber: string;
  accountHolder: string;
  maskedAccountHolder: string;
  bankName: string;
  maskedBankName: string;
  ifsc: string;
  maskedIfsc: string;
  balance: number;
  frozen: boolean;
  kycStatus: 'Verified' | 'Forged/Synthetic' | 'Compromised' | 'Unknown';
  riskScore: number;
  deviceIp?: string;
  location?: string;
}

export interface MuleEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  timestamp: string;
  channel: 'IMPS' | 'UPI' | 'NEFT' | 'ATM_CASH' | 'CRYPTO_SWAP';
  referenceHash: string;
  flaggedAnomaly: boolean;
}

export interface CaseData {
  caseId: string;
  title: string;
  createdDate: string;
  assignedOfficer: {
    name: string;
    badgeNumber: string;
    unit: string;
  };
  status: 'Open' | 'Investigation' | 'Charges Filed' | 'Closed';
  totalDefraudedAmount: number;
  frozenAmount: number;
  associatedAlerts: AlertItem[];
  nodes: MuleNode[];
  edges: MuleEdge[];
  auditHash?: string;
  qrCodeUrl?: string;
  timeline: {
    time: string;
    event: string;
    officer: string;
  }[];
}

export interface FilterState {
  state: string;
  crimeType: string;
  amountMin: number;
  amountMax: number;
  timeRange: '1h' | '6h' | '24h' | '7d' | 'all';
  historicalHourOffset: number; // 0 to 24 for scrubbing in historical mode
}
