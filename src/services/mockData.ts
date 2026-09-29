import type { ATMPoint, H3Zone, AlertItem, CaseData } from '../types';
import { getH3CellForCoord, getH3BoundaryCoordinates, getH3Center } from './h3Service';

// Raw coordinate anchors for major financial hubs
const ZONE_ANCHORS = [
  // Mumbai
  { name: 'Mumbai South - Fort / Colaba Financial Hub', city: 'Mumbai', state: 'Maharashtra', lat: 18.9322, lng: 72.8335, risk: 0.94, crime: 'Mule Cash-Out' as const },
  { name: 'Bandra-Kurla Complex (BKC) Banking Enclave', city: 'Mumbai', state: 'Maharashtra', lat: 19.0657, lng: 72.8687, risk: 0.88, crime: 'ATM Skimming' as const },
  { name: 'Andheri West Commercial Strip', city: 'Mumbai', state: 'Maharashtra', lat: 19.1197, lng: 72.8464, risk: 0.76, crime: 'Card Cloning' as const },
  { name: 'Dadar Central Transit Hub', city: 'Mumbai', state: 'Maharashtra', lat: 19.0178, lng: 72.8478, risk: 0.65, crime: 'Cash Trapping' as const },
  { name: 'Thane West Ghodbunder Road', city: 'Thane', state: 'Maharashtra', lat: 19.2183, lng: 72.9781, risk: 0.82, crime: 'Mule Cash-Out' as const },
  
  // Delhi NCR
  { name: 'Connaught Place Central Circle', city: 'New Delhi', state: 'Delhi', lat: 28.6304, lng: 77.2177, risk: 0.91, crime: 'ATM Skimming' as const },
  { name: 'Nehru Place IT & Financial Market', city: 'New Delhi', state: 'Delhi', lat: 28.5494, lng: 77.2526, risk: 0.85, crime: 'Card Cloning' as const },
  { name: 'Karol Bagh Commercial Zone', city: 'New Delhi', state: 'Delhi', lat: 28.6514, lng: 77.1907, risk: 0.79, crime: 'Cash Trapping' as const },
  { name: 'Rohini Sector 10 Banking Cluster', city: 'New Delhi', state: 'Delhi', lat: 28.7159, lng: 77.1132, risk: 0.58, crime: 'Physical Tampering' as const },
  { name: 'Gurugram Cyber City Border', city: 'Gurugram', state: 'Delhi', lat: 28.4950, lng: 77.0895, risk: 0.72, crime: 'Mule Cash-Out' as const },

  // Bengaluru
  { name: 'Koramangala 80 Feet Road Corridor', city: 'Bengaluru', state: 'Karnataka', lat: 12.9352, lng: 77.6245, risk: 0.89, crime: 'Mule Cash-Out' as const },
  { name: 'Indiranagar 100ft Metro Corridor', city: 'Bengaluru', state: 'Karnataka', lat: 12.9784, lng: 77.6408, risk: 0.68, crime: 'ATM Skimming' as const },
  { name: 'Whitefield IT Export Zone', city: 'Bengaluru', state: 'Karnataka', lat: 12.9698, lng: 77.7499, risk: 0.52, crime: 'Card Cloning' as const },
  { name: 'Electronic City Phase 1 Terminal', city: 'Bengaluru', state: 'Karnataka', lat: 12.8399, lng: 77.6770, risk: 0.61, crime: 'Coercion / Robbery' as const },

  // Hyderabad
  { name: 'HITEC City Tech Center', city: 'Hyderabad', state: 'Telangana', lat: 17.4474, lng: 78.3762, risk: 0.86, crime: 'Mule Cash-Out' as const },
  { name: 'Banjara Hills Road No 12', city: 'Hyderabad', state: 'Telangana', lat: 17.4156, lng: 78.4354, risk: 0.64, crime: 'ATM Skimming' as const },
  { name: 'Secunderabad Station Commercial Area', city: 'Secunderabad', state: 'Telangana', lat: 17.4399, lng: 78.4983, risk: 0.77, crime: 'Cash Trapping' as const },

  // Kolkata
  { name: 'Park Street Financial Boulevard', city: 'Kolkata', state: 'West Bengal', lat: 22.5521, lng: 88.3533, risk: 0.83, crime: 'Card Cloning' as const },
  { name: 'Salt Lake Sector V Tech Hub', city: 'Kolkata', state: 'West Bengal', lat: 22.5804, lng: 88.4378, risk: 0.59, crime: 'ATM Skimming' as const },

  // Chennai
  { name: 'T. Nagar Panagal Park Retail Hub', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0418, lng: 80.2341, risk: 0.81, crime: 'Cash Trapping' as const },
  { name: 'OMR Cyber Corridor', city: 'Chennai', state: 'Tamil Nadu', lat: 12.9255, lng: 80.2298, risk: 0.49, crime: 'Mule Cash-Out' as const },

  // Ahmedabad
  { name: 'SG Highway Commercial Corridor', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0338, lng: 72.5074, risk: 0.75, crime: 'Mule Cash-Out' as const },
  { name: 'Ashram Road Banking Row', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0258, lng: 72.5714, risk: 0.62, crime: 'ATM Skimming' as const },
];

export const INITIAL_ZONES: H3Zone[] = ZONE_ANCHORS.map((anchor, idx) => {
  const h3Index = getH3CellForCoord(anchor.lat, anchor.lng, 7);
  const boundary = getH3BoundaryCoordinates(h3Index);
  const center = getH3Center(h3Index);

  const getRiskLevel = (p: number) => {
    if (p >= 0.8) return 'CRITICAL';
    if (p >= 0.65) return 'HIGH';
    if (p >= 0.45) return 'MEDIUM';
    return 'LOW';
  };

  // Generate 12 historical data points for past 24 hours
  const historicalProbabilities = Array.from({ length: 12 }, (_, hIdx) => {
    const hoursAgo = (11 - hIdx) * 2;
    const wave = Math.sin((hIdx + idx) * 0.7) * 0.15;
    const p = Math.min(0.98, Math.max(0.12, anchor.risk + wave));
    return {
      timestamp: `${hoursAgo === 0 ? 'Now' : `-${hoursAgo}h`}`,
      probability: Number(p.toFixed(3)),
    };
  });

  return {
    h3Index,
    zoneName: anchor.name,
    city: anchor.city,
    state: anchor.state,
    center: [center[0] || anchor.lat, center[1] || anchor.lng],
    boundary,
    riskProbability: anchor.risk,
    riskLevel: getRiskLevel(anchor.risk),
    primaryCrimeType: anchor.crime,
    atmCount: 12 + ((idx * 7) % 24),
    activeAlertsCount: anchor.risk > 0.8 ? Math.floor(anchor.risk * 8) : Math.floor(anchor.risk * 3),
    historicalProbabilities,
    contributingFactors: [
      {
        factor: 'Mule Cashout Velocity',
        weight: Math.round(anchor.risk * 45),
        description: 'Burst of high-frequency debit card cash-outs under ₹20,000 threshold within 10 min window.'
      },
      {
        factor: 'Bezel Hardware Anomaly',
        weight: Math.round(anchor.risk * 30),
        description: 'Vibration & optical sensor deviation detected on multiple card entry shrouds.'
      },
      {
        factor: 'Syndicate Network Proximity',
        weight: Math.round(anchor.risk * 25),
        description: 'Mule accounts linked to active Operation CyberStrike case ring #CR-491.'
      }
    ]
  };
});

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank', 'Bank of Baroda', 'Kotak Mahindra Bank', 'Canara Bank'];

// Generate ATM Points around zones
export const INITIAL_ATMS: ATMPoint[] = [];

INITIAL_ZONES.forEach((zone, zIdx) => {
  const atmsInZone = 8 + (zIdx % 7);
  for (let i = 0; i < atmsInZone; i++) {
    // jitter around center
    const latJitter = (Math.sin(zIdx * 10 + i * 2.5) * 0.016);
    const lngJitter = (Math.cos(zIdx * 10 + i * 2.5) * 0.016);
    const lat = zone.center[0] + latJitter;
    const lng = zone.center[1] + lngJitter;
    const bank = BANKS[(zIdx * 3 + i) % BANKS.length];
    
    // higher risk zones have higher chance of compromised ATMs
    const isHigh = zone.riskProbability > 0.75 && i < 3;
    const isMedium = zone.riskProbability > 0.55 && i === 3;
    
    let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let status: 'Operational' | 'Compromised' | 'Under Investigation' | 'Offline' = 'Operational';
    let riskScore = Math.floor(zone.riskProbability * 50 + (i * 4));

    if (isHigh) {
      riskLevel = i === 0 ? 'CRITICAL' : 'HIGH';
      status = i === 0 ? 'Compromised' : 'Under Investigation';
      riskScore = Math.min(98, 80 + i * 6);
    } else if (isMedium) {
      riskLevel = 'MEDIUM';
      riskScore = 58 + i * 3;
    }

    INITIAL_ATMS.push({
      id: `atm-${zIdx}-${i}`,
      terminalId: `ATM-${zone.city.substring(0, 3).toUpperCase()}-${1000 + zIdx * 30 + i}`,
      bankName: bank,
      locationName: `${bank} e-Corner, ${zone.zoneName.split(' ')[0]}`,
      address: `Shop ${i + 4}, Main Commercial Complex, ${zone.zoneName}, ${zone.city}`,
      city: zone.city,
      state: zone.state,
      latitude: lat,
      longitude: lng,
      h3Index: zone.h3Index,
      riskScore,
      riskLevel,
      status,
      dailyVolume: 250000 + (i * 95000),
      incidentCount: isHigh ? 3 + i : (isMedium ? 1 : 0),
      lastIncidentTime: isHigh ? '14 mins ago' : undefined,
      hasSkimmerReport: isHigh && i === 0,
      hasTamperAlert: isHigh && i === 1,
    });
  }
});

// Initial Alerts for Inbox (6.1)
export const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'alt-001',
    alertNumber: 'ALT-2026-MUM-4891',
    timestamp: '2026-09-29 09:48:12',
    atmId: INITIAL_ATMS[0]?.id || 'atm-0-0',
    terminalId: 'ATM-MUM-1000',
    bankName: 'State Bank of India',
    zoneId: INITIAL_ZONES[0].h3Index,
    zoneName: INITIAL_ZONES[0].zoneName,
    city: 'Mumbai',
    state: 'Maharashtra',
    crimeType: 'Mule Cash-Out',
    riskProbability: 0.96,
    riskLevel: 'CRITICAL',
    status: 'ACTIVE',
    suspectedAmount: 180000,
    caseId: 'CASE-2026-MUM-891',
    reasons: [
      {
        id: 'r1',
        factor: 'High-Velocity Card Swapping',
        confidence: 98,
        description: '6 distinct synthetic debit cards inserted in 180 seconds, each withdrawing exact ₹30,000 threshold.',
        severity: 'critical',
        anomalyMetric: 'Velocity: 2.0 trans/min (Normal: 0.18)'
      },
      {
        id: 'r2',
        factor: 'Known Mule Syndicate Cluster Match',
        confidence: 94,
        description: 'Card bins belong to newly opened zero-balance payroll accounts linked to CyberStrike Case #CR-491.',
        severity: 'critical',
        anomalyMetric: 'Syndicate Jaccard index: 0.89'
      },
      {
        id: 'r3',
        factor: 'Deep-Learning Camera Face Concealment',
        confidence: 89,
        description: 'Optical flow telemetry identified suspect wearing sunglasses and face mask blocking pinhole lens.',
        severity: 'warning',
        anomalyMetric: 'Facial occlusion: 88%'
      }
    ],
    telemetry: {
      bezelVibrationG: 0.12,
      cardReaderLatencyMs: 420,
      cashShutterAnomalies: 6,
      cameraOpticalFlow: 94.2,
      cardClusterVelocity: '6 cards / 3 mins'
    }
  },
  {
    id: 'alt-002',
    alertNumber: 'ALT-2026-MUM-4889',
    timestamp: '2026-09-29 09:42:05',
    atmId: INITIAL_ATMS[8]?.id || 'atm-1-0',
    terminalId: 'ATM-MUM-1030',
    bankName: 'HDFC Bank',
    zoneId: INITIAL_ZONES[1].h3Index,
    zoneName: INITIAL_ZONES[1].zoneName,
    city: 'Mumbai',
    state: 'Maharashtra',
    crimeType: 'ATM Skimming',
    riskProbability: 0.91,
    riskLevel: 'CRITICAL',
    status: 'ACTIVE',
    suspectedAmount: 450000,
    caseId: 'CASE-2026-MUM-884',
    reasons: [
      {
        id: 'r4',
        factor: 'Bezel Tamper Optical Shunt Detected',
        confidence: 95,
        description: 'Capacitive sensors on card entry throat detected 1.8mm foreign overlay with magnetic head reader.',
        severity: 'critical',
        anomalyMetric: 'Throat impedance delta: +420 Ohm'
      },
      {
        id: 'r5',
        factor: 'Pinhole Camera Keypad Sniffing Alert',
        confidence: 88,
        description: 'Miniature battery-powered camera module detected mounted on false false-ceiling bezel above PIN pad.',
        severity: 'critical',
        anomalyMetric: 'RF broadcast: 2.4 GHz signal peak'
      }
    ],
    telemetry: {
      bezelVibrationG: 3.42,
      cardReaderLatencyMs: 890,
      cashShutterAnomalies: 0,
      cameraOpticalFlow: 78.5,
      cardClusterVelocity: 'Single device attachment'
    }
  },
  {
    id: 'alt-003',
    alertNumber: 'ALT-2026-DEL-3102',
    timestamp: '2026-09-29 09:31:18',
    atmId: INITIAL_ATMS[15]?.id || 'atm-2-0',
    terminalId: 'ATM-DEL-1150',
    bankName: 'ICICI Bank',
    zoneId: INITIAL_ZONES[5].h3Index,
    zoneName: INITIAL_ZONES[5].zoneName,
    city: 'New Delhi',
    state: 'Delhi',
    crimeType: 'Cash Trapping',
    riskProbability: 0.84,
    riskLevel: 'HIGH',
    status: 'ACKNOWLEDGED',
    acknowledgedBy: 'Insp. R. Sangwan (Badge #DL-8821)',
    acknowledgedAt: '2026-09-29 09:35:00',
    suspectedAmount: 60000,
    caseId: 'CASE-2026-DEL-104',
    reasons: [
      {
        id: 'r6',
        factor: 'Physical Cash Shutter Obstruction',
        confidence: 92,
        description: 'Mechanical shutter motor stalled after cash presentation. Dispenser throat blocked by adhesive "fork" trap.',
        severity: 'critical',
        anomalyMetric: 'Motor torque overload: +120%'
      },
      {
        id: 'r7',
        factor: 'Customer Dispute Escalation',
        confidence: 86,
        description: 'Customer card debited ₹20,000, dispenser recorded payout complete, but optical exit sensors failed to register pickup.',
        severity: 'warning',
        anomalyMetric: 'Exit beam timeout: 120s'
      }
    ],
    telemetry: {
      bezelVibrationG: 0.85,
      cardReaderLatencyMs: 190,
      cashShutterAnomalies: 4,
      cameraOpticalFlow: 62.1,
      cardClusterVelocity: 'Repeated dispenser jam'
    }
  },
  {
    id: 'alt-004',
    alertNumber: 'ALT-2026-BLR-5520',
    timestamp: '2026-09-29 09:15:40',
    atmId: INITIAL_ATMS[25]?.id || 'atm-3-0',
    terminalId: 'ATM-BLR-1250',
    bankName: 'Axis Bank',
    zoneId: INITIAL_ZONES[10].h3Index,
    zoneName: INITIAL_ZONES[10].zoneName,
    city: 'Bengaluru',
    state: 'Karnataka',
    crimeType: 'Mule Cash-Out',
    riskProbability: 0.87,
    riskLevel: 'HIGH',
    status: 'INVESTIGATING',
    acknowledgedBy: 'Sub-Insp. Priya N. (Badge #KA-4109)',
    acknowledgedAt: '2026-09-29 09:20:11',
    suspectedAmount: 320000,
    caseId: 'CASE-2026-BLR-902',
    reasons: [
      {
        id: 'r8',
        factor: 'Cross-State Mule Fund Staging',
        confidence: 93,
        description: 'Funds originated from UPI cyber fraud victim in Gurgaon, split into 8 mule accounts and withdrawn at Koramangala.',
        severity: 'critical',
        anomalyMetric: 'Layering hop count: 3'
      }
    ],
    telemetry: {
      bezelVibrationG: 0.05,
      cardReaderLatencyMs: 240,
      cashShutterAnomalies: 8,
      cameraOpticalFlow: 88.0,
      cardClusterVelocity: '8 cards / 5 mins'
    }
  },
  {
    id: 'alt-005',
    alertNumber: 'ALT-2026-HYD-7731',
    timestamp: '2026-09-29 08:55:00',
    atmId: INITIAL_ATMS[32]?.id || 'atm-4-0',
    terminalId: 'ATM-HYD-1320',
    bankName: 'Punjab National Bank',
    zoneId: INITIAL_ZONES[14].h3Index,
    zoneName: INITIAL_ZONES[14].zoneName,
    city: 'Hyderabad',
    state: 'Telangana',
    crimeType: 'Card Cloning',
    riskProbability: 0.76,
    riskLevel: 'HIGH',
    status: 'ACTIVE',
    suspectedAmount: 110000,
    reasons: [
      {
        id: 'r9',
        factor: 'Fallback Magnetic Stripe Forced Transaction',
        confidence: 87,
        description: 'Chip error intentionally triggered to force EMV fallback to magnetic stripe data track.',
        severity: 'warning',
        anomalyMetric: 'Fallback attempts: 5'
      }
    ],
    telemetry: {
      bezelVibrationG: 0.08,
      cardReaderLatencyMs: 780,
      cashShutterAnomalies: 0,
      cameraOpticalFlow: 54.0,
      cardClusterVelocity: 'Fallback sequence'
    }
  },
  {
    id: 'alt-006',
    alertNumber: 'ALT-2026-MUM-4870',
    timestamp: '2026-09-29 08:20:14',
    atmId: INITIAL_ATMS[4]?.id || 'atm-0-4',
    terminalId: 'ATM-MUM-1004',
    bankName: 'Bank of Baroda',
    zoneId: INITIAL_ZONES[0].h3Index,
    zoneName: INITIAL_ZONES[0].zoneName,
    city: 'Mumbai',
    state: 'Maharashtra',
    crimeType: 'Physical Tampering',
    riskProbability: 0.52,
    riskLevel: 'MEDIUM',
    status: 'RESOLVED',
    acknowledgedBy: 'Head Constable G. Patil',
    acknowledgedAt: '2026-09-29 08:25:00',
    suspectedAmount: 0,
    reasons: [
      {
        id: 'r10',
        factor: 'Cabinet Door Switch Trigger',
        confidence: 90,
        description: 'Service cabinet door opened outside maintenance window. Technician verified scheduled tape replenishment.',
        severity: 'info',
        anomalyMetric: 'Door sensor: Open'
      }
    ],
    feedback: {
      isUseful: false,
      reason: 'Authorized bank technician maintenance with work permit #BOB-771',
      timestamp: '2026-09-29 08:35:10',
      officerId: 'DL-8821'
    },
    telemetry: {
      bezelVibrationG: 1.15,
      cardReaderLatencyMs: 140,
      cashShutterAnomalies: 0,
      cameraOpticalFlow: 35.0,
      cardClusterVelocity: 'Single maintenance key'
    }
  }
];

// Mule Chain Case for Cytoscape.js (6.2) & Evidence PDF (6.3)
export const MOCK_CASE_DATA: CaseData = {
  caseId: 'CASE-2026-MUM-891',
  title: 'Operation Velvet Trap: Multi-State UPI Fraud & Synthetic Mule Cash-Out Network',
  createdDate: '2026-09-29 08:30:00 IST',
  assignedOfficer: {
    name: 'Inspector Rajesh Sangwan',
    badgeNumber: 'MH-CYBER-8841',
    unit: 'Cyber Crime Police Station, Bandra-Kurla Complex'
  },
  status: 'Investigation',
  totalDefraudedAmount: 1850000,
  frozenAmount: 1120000,
  associatedAlerts: [INITIAL_ALERTS[0]],
  nodes: [
    {
      id: 'node-victim-1',
      type: 'victim',
      label: 'Victim: Senior Citizen Pensioner',
      accountNumber: 'PNBA0192837465',
      maskedAccountNumber: 'PNBA-XXXX-7465',
      accountHolder: 'Anjali R. Sharma',
      maskedAccountHolder: 'A**** S****',
      bankName: 'Punjab National Bank',
      maskedBankName: 'PNB',
      ifsc: 'PUNB0124900',
      maskedIfsc: 'PUNB012****',
      balance: 145000,
      frozen: false,
      kycStatus: 'Verified',
      riskScore: 95,
      location: 'Civil Lines, Delhi'
    },
    {
      id: 'node-mule-1a',
      type: 'mule_tier1',
      label: 'Layer 1 Mule: Aggregator A',
      accountNumber: 'HDFC0091823901',
      maskedAccountNumber: 'HDFC-XXXX-3901',
      accountHolder: 'Ramesh Chander Verma',
      maskedAccountHolder: 'R**** V****',
      bankName: 'HDFC Bank',
      maskedBankName: 'HDFC',
      ifsc: 'HDFC0001042',
      maskedIfsc: 'HDFC000****',
      balance: 420000,
      frozen: true,
      kycStatus: 'Forged/Synthetic',
      riskScore: 92,
      deviceIp: '103.21.58.12',
      location: 'Dharavi, Mumbai'
    },
    {
      id: 'node-mule-1b',
      type: 'mule_tier1',
      label: 'Layer 1 Mule: Aggregator B',
      accountNumber: 'ICIC0088192834',
      maskedAccountNumber: 'ICIC-XXXX-2834',
      accountHolder: 'Suresh Baburao Kadam',
      maskedAccountHolder: 'S**** K****',
      bankName: 'ICICI Bank',
      maskedBankName: 'ICICI',
      ifsc: 'ICIC0000381',
      maskedIfsc: 'ICIC000****',
      balance: 310000,
      frozen: true,
      kycStatus: 'Compromised',
      riskScore: 89,
      deviceIp: '49.36.12.88',
      location: 'Kurla West, Mumbai'
    },
    {
      id: 'node-mule-2a',
      type: 'mule_tier2',
      label: 'Layer 2 Mule: Cash-out Runner 1',
      accountNumber: 'SBIN0049281729',
      maskedAccountNumber: 'SBIN-XXXX-1729',
      accountHolder: 'Vikram Dinesh Singh',
      maskedAccountHolder: 'V**** S****',
      bankName: 'State Bank of India',
      maskedBankName: 'SBI',
      ifsc: 'SBIN0001829',
      maskedIfsc: 'SBIN000****',
      balance: 180000,
      frozen: true,
      kycStatus: 'Forged/Synthetic',
      riskScore: 96,
      location: 'Fort, Mumbai'
    },
    {
      id: 'node-mule-2b',
      type: 'mule_tier2',
      label: 'Layer 2 Mule: Cash-out Runner 2',
      accountNumber: 'UTIB0019283741',
      maskedAccountNumber: 'UTIB-XXXX-3741',
      accountHolder: 'Mahesh Gopal Yadav',
      maskedAccountHolder: 'M**** Y****',
      bankName: 'Axis Bank',
      maskedBankName: 'Axis Bank',
      ifsc: 'UTIB0000214',
      maskedIfsc: 'UTIB000****',
      balance: 210000,
      frozen: true,
      kycStatus: 'Forged/Synthetic',
      riskScore: 94,
      location: 'Bandra, Mumbai'
    },
    {
      id: 'node-atm-1',
      type: 'atm_cashout',
      label: 'Terminal: ATM-MUM-1000 (Fort SBI)',
      accountNumber: 'ATM-MUM-1000',
      maskedAccountNumber: 'ATM-MUM-XXXX',
      accountHolder: 'SBI ATM Terminal #1000',
      maskedAccountHolder: 'SBI Terminal [Fort]',
      bankName: 'State Bank of India',
      maskedBankName: 'SBI',
      ifsc: 'SBIN0001829',
      maskedIfsc: 'SBIN000****',
      balance: 0,
      frozen: false,
      kycStatus: 'Verified',
      riskScore: 98,
      location: 'Fort, Mumbai South'
    },
    {
      id: 'node-atm-2',
      type: 'atm_cashout',
      label: 'Terminal: ATM-MUM-1030 (HDFC BKC)',
      accountNumber: 'ATM-MUM-1030',
      maskedAccountNumber: 'ATM-MUM-XXXX',
      accountHolder: 'HDFC Terminal #1030',
      maskedAccountHolder: 'HDFC Terminal [BKC]',
      bankName: 'HDFC Bank',
      maskedBankName: 'HDFC',
      ifsc: 'HDFC0001042',
      maskedIfsc: 'HDFC000****',
      balance: 0,
      frozen: false,
      kycStatus: 'Verified',
      riskScore: 91,
      location: 'Bandra Kurla Complex'
    },
    {
      id: 'node-crypto-1',
      type: 'crypto_exit',
      label: 'Crypto P2P On-Ramp / Escrow',
      accountNumber: 'USDT-TRC20-TY89qX2810kLm',
      maskedAccountNumber: 'TRC20-XXXX...kLm',
      accountHolder: 'P2P Escrow Counterparty #992',
      maskedAccountHolder: 'P2P Exchanger [Offshore]',
      bankName: 'Decentralized P2P Exchange',
      maskedBankName: 'Crypto P2P',
      ifsc: 'N/A',
      maskedIfsc: 'N/A',
      balance: 730000,
      frozen: false,
      kycStatus: 'Unknown',
      riskScore: 99,
      location: 'Offshore Proxy'
    },
    {
      id: 'node-ringleader',
      type: 'ringleader',
      label: 'Syndicate Operator (Alias: "Shadow_88")',
      accountNumber: 'TELEGRAM-TG8921820',
      maskedAccountNumber: 'TG-XXXX-8920',
      accountHolder: 'Unidentified Syndicate Head',
      maskedAccountHolder: 'Target Person of Interest',
      bankName: 'Multiple Virtual Wallets',
      maskedBankName: 'Virtual Wallets',
      ifsc: 'N/A',
      maskedIfsc: 'N/A',
      balance: 0,
      frozen: false,
      kycStatus: 'Unknown',
      riskScore: 100,
      location: 'Mewat / Jamtara Corridor'
    }
  ],
  edges: [
    {
      id: 'e1',
      source: 'node-victim-1',
      target: 'node-mule-1a',
      amount: 980000,
      timestamp: '2026-09-29 07:15:22',
      channel: 'IMPS',
      referenceHash: 'TXN-IMPS-8921829012',
      flaggedAnomaly: true
    },
    {
      id: 'e2',
      source: 'node-victim-1',
      target: 'node-mule-1b',
      amount: 870000,
      timestamp: '2026-09-29 07:18:45',
      channel: 'UPI',
      referenceHash: 'TXN-UPI-4819204812',
      flaggedAnomaly: true
    },
    {
      id: 'e3',
      source: 'node-mule-1a',
      target: 'node-mule-2a',
      amount: 450000,
      timestamp: '2026-09-29 07:42:10',
      channel: 'IMPS',
      referenceHash: 'TXN-IMPS-9018239012',
      flaggedAnomaly: true
    },
    {
      id: 'e4',
      source: 'node-mule-1a',
      target: 'node-crypto-1',
      amount: 500000,
      timestamp: '2026-09-29 07:55:00',
      channel: 'CRYPTO_SWAP',
      referenceHash: 'TXN-TRX-0x892a71bf9123',
      flaggedAnomaly: true
    },
    {
      id: 'e5',
      source: 'node-mule-1b',
      target: 'node-mule-2b',
      amount: 400000,
      timestamp: '2026-09-29 07:49:15',
      channel: 'UPI',
      referenceHash: 'TXN-UPI-5529104819',
      flaggedAnomaly: true
    },
    {
      id: 'e6',
      source: 'node-mule-1b',
      target: 'node-crypto-1',
      amount: 230000,
      timestamp: '2026-09-29 08:02:11',
      channel: 'CRYPTO_SWAP',
      referenceHash: 'TXN-TRX-0x1290bb34e129',
      flaggedAnomaly: true
    },
    {
      id: 'e7',
      source: 'node-mule-2a',
      target: 'node-atm-1',
      amount: 180000,
      timestamp: '2026-09-29 08:45:00',
      channel: 'ATM_CASH',
      referenceHash: 'TXN-ATM-1000-0982',
      flaggedAnomaly: true
    },
    {
      id: 'e8',
      source: 'node-mule-2b',
      target: 'node-atm-2',
      amount: 150000,
      timestamp: '2026-09-29 08:52:30',
      channel: 'ATM_CASH',
      referenceHash: 'TXN-ATM-1030-0144',
      flaggedAnomaly: true
    },
    {
      id: 'e9',
      source: 'node-ringleader',
      target: 'node-mule-1a',
      amount: 0,
      timestamp: '2026-09-29 06:30:00',
      channel: 'UPI',
      referenceHash: 'CMD-TG-ACTIVATION',
      flaggedAnomaly: true
    },
    {
      id: 'e10',
      source: 'node-ringleader',
      target: 'node-mule-1b',
      amount: 0,
      timestamp: '2026-09-29 06:31:00',
      channel: 'UPI',
      referenceHash: 'CMD-TG-ACTIVATION',
      flaggedAnomaly: true
    }
  ],
  auditHash: '7f9c2d1b8e4a5f6e3c0d9a8b7e6f5d4c3b2a1e0f9d8c7b6a5e4f3d2c1b0a9f8e',
  qrCodeUrl: 'https://cybercrime.gov.in/verify?case=CASE-2026-MUM-891&hash=7f9c2d1b8e4a5f6e3c0d9a8b7e6f5d4c3b2a1e0f9d8c7b6a5e4f3d2c1b0a9f8e',
  timeline: [
    {
      time: '07:15:22 IST',
      event: 'Victim reported unauthorized debit of ₹9,80,000 via malicious APK remote access session.',
      officer: 'Duty Officer (Helpline 1930)'
    },
    {
      time: '07:45:10 IST',
      event: 'Mule Layer 1 account HDFC-XXXX-3901 flagged by AML rule #R88. Section 91 CrPC freeze order issued.',
      officer: 'Nodal Officer HDFC'
    },
    {
      time: '08:48:12 IST',
      event: 'Alert ALT-2026-MUM-4891 triggered at SBI Fort ATM #1000 for rapid cash-out sequence.',
      officer: 'AI Surveillance System'
    },
    {
      time: '09:05:00 IST',
      event: 'Local PCR Van #14 dispatched to Fort ATM. Physical security secured CCTV footage.',
      officer: 'Insp. Rajesh Sangwan'
    },
    {
      time: '09:20:00 IST',
      event: 'Freeze successful on ₹11,20,000 across 3 mule accounts before crypto withdrawal.',
      officer: 'Insp. Rajesh Sangwan'
    }
  ]
};

// SHA-256 generator in pure browser/node JS for audit integrity
export async function generateSha256(message: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // fallback pseudo-hash for non-crypto secure contexts
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      hash = (hash << 5) - hash + message.charCodeAt(i);
      hash |= 0;
    }
    return `sha256-fallback-${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }
}
