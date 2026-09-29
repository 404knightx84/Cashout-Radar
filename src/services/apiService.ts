import type { AlertItem, CaseData, H3Zone, ATMPoint, RoleType } from '../types';
import { INITIAL_ALERTS, INITIAL_ATMS, INITIAL_ZONES, MOCK_CASE_DATA, generateSha256 } from './mockData';

// In-memory state holding live mutations
let alertsState: AlertItem[] = [...INITIAL_ALERTS];
let zonesState: H3Zone[] = [...INITIAL_ZONES];
let atmsState: ATMPoint[] = [...INITIAL_ATMS];
let caseState: CaseData = { ...MOCK_CASE_DATA };

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
let connectionMode: 'prototype' | 'backend' = API_BASE_URL ? 'backend' : 'prototype';

async function requestApi<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!API_BASE_URL) return null;

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!response.ok) {
      console.warn(`[API] ${response.status} ${init?.method || 'GET'} ${path}`);
      connectionMode = 'prototype';
      return null;
    }

    connectionMode = 'backend';
    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[API] Backend unavailable for ${path}; using prototype data`, error);
    connectionMode = 'prototype';
    return null;
  }
}

const getConnectionMode = () => connectionMode;

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

export const apiService = {
  getConnectionMode,

  // 5.1 /heatmap
  async getHeatmapData(): Promise<HeatmapPoint[]> {
    const remote = await requestApi<HeatmapPoint[]>('/heatmap');
    if (remote) return remote;

    return atmsState.map(atm => ({
      latitude: atm.latitude,
      longitude: atm.longitude,
      weight: (atm.riskScore / 100) * (atm.incidentCount + 1),
    }));
  },

  // 5.2 & 5.4 Zones
  async getZones(): Promise<H3Zone[]> {
    const remote = await requestApi<H3Zone[]>('/zones');
    if (remote) return remote;

    return [...zonesState];
  },

  async getZoneDetail(h3Index: string): Promise<H3Zone | undefined> {
    const remote = await requestApi<H3Zone>(`/zones/${encodeURIComponent(h3Index)}`);
    if (remote) return remote;

    return zonesState.find(z => z.h3Index === h3Index);
  },

  // 5.1 ATMs
  async getAtms(): Promise<ATMPoint[]> {
    const remote = await requestApi<ATMPoint[]>('/atms');
    if (remote) return remote;

    return [...atmsState];
  },

  // 6.1 /alerts & /predictions
  async getAlerts(): Promise<AlertItem[]> {
    const remote = await requestApi<AlertItem[]>('/alerts');
    if (remote) return remote;

    return [...alertsState];
  },

  async getAlertPredictions(alertId: string) {
    const remote = await requestApi<{
      alertId: string;
      riskProbability: number;
      riskLevel: AlertItem['riskLevel'];
      crimeType: AlertItem['crimeType'];
      reasons: AlertItem['reasons'];
      telemetry: AlertItem['telemetry'];
    }>(`/predictions/${encodeURIComponent(alertId)}`);
    if (remote) return remote;

    const alert = alertsState.find(a => a.id === alertId);
    if (!alert) return null;
    return {
      alertId: alert.id,
      riskProbability: alert.riskProbability,
      riskLevel: alert.riskLevel,
      crimeType: alert.crimeType,
      reasons: alert.reasons,
      telemetry: alert.telemetry,
    };
  },

  // 6.2 /accounts/{hash}/chain
  async getMuleChain(accountHash: string, role: RoleType = 'OFFICER'): Promise<CaseData> {
    const remote = await requestApi<CaseData>(
      `/accounts/${encodeURIComponent(accountHash)}/chain?role=${encodeURIComponent(role)}`
    );
    if (remote) return remote;

    // Return case data with nodes formatted according to role
    return {
      ...caseState,
      nodes: caseState.nodes.map(node => {
        if (role === 'BANK_COMPLIANCE') {
          return {
            ...node,
            accountNumber: node.maskedAccountNumber,
            accountHolder: node.maskedAccountHolder,
            bankName: node.maskedBankName,
            ifsc: node.maskedIfsc,
            deviceIp: 'PROTECTED / PRIVILEGED',
          };
        }
        return node;
      }),
    };
  },

  // 6.4 /ack
  async acknowledgeAlert(alertId: string, officerName: string): Promise<{ success: boolean; alert: AlertItem }> {
    const remote = await requestApi<{ success: boolean; alert: AlertItem }>(
      `/alerts/${encodeURIComponent(alertId)}/ack`,
      { method: 'POST', body: JSON.stringify({ officerName }) }
    );
    if (remote) return remote;

    const idx = alertsState.findIndex(a => a.id === alertId);
    if (idx === -1) throw new Error(`Alert ${alertId} not found`);

    const updated: AlertItem = {
      ...alertsState[idx],
      status: 'ACKNOWLEDGED',
      acknowledgedBy: officerName,
      acknowledgedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    alertsState[idx] = updated;
    return { success: true, alert: updated };
  },

  // 6.4 /feedback
  async submitFeedback(
    alertId: string,
    isUseful: boolean,
    reason: string,
    officerId: string
  ): Promise<{ success: boolean; alert: AlertItem }> {
    const remote = await requestApi<{ success: boolean; alert: AlertItem }>(
      `/alerts/${encodeURIComponent(alertId)}/feedback`,
      { method: 'POST', body: JSON.stringify({ isUseful, reason, officerId }) }
    );
    if (remote) return remote;

    const idx = alertsState.findIndex(a => a.id === alertId);
    if (idx === -1) throw new Error(`Alert ${alertId} not found`);

    const updated: AlertItem = {
      ...alertsState[idx],
      status: isUseful ? 'INVESTIGATING' : 'FALSE_POSITIVE',
      feedback: {
        isUseful,
        reason,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        officerId,
      },
    };

    alertsState[idx] = updated;
    return { success: true, alert: updated };
  },

  // Account freezing mutation (Operational command)
  async toggleAccountFreeze(nodeId: string): Promise<{ success: boolean; frozen: boolean }> {
    const remote = await requestApi<{ success: boolean; frozen: boolean }>(
      `/accounts/${encodeURIComponent(nodeId)}/freeze`,
      { method: 'POST' }
    );
    if (remote) return remote;

    const node = caseState.nodes.find(n => n.id === nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    const frozen = !node.frozen;
    caseState = {
      ...caseState,
      frozenAmount: frozen
        ? caseState.frozenAmount + node.balance
        : Math.max(0, caseState.frozenAmount - node.balance),
      nodes: caseState.nodes.map(n =>
        n.id === nodeId ? { ...n, frozen } : n
      ),
    };

    return { success: true, frozen };
  },

  // 6.3 Dynamic Case Evidence Dossier with computed SHA-256 hash
  async getCaseEvidenceDossier(caseId: string): Promise<CaseData> {
    const remote = await requestApi<CaseData>(`/reports/${encodeURIComponent(caseId)}`);
    if (remote) return remote;

    const caseObj = { ...caseState };
    // Compute fresh SHA-256 over entire evidentiary package
    const serialized = JSON.stringify({
      caseId: caseObj.caseId,
      title: caseObj.title,
      nodes: caseObj.nodes.map(n => ({ id: n.id, acc: n.accountNumber, bal: n.balance })),
      edges: caseObj.edges.map(e => ({ src: e.source, tgt: e.target, amt: e.amount, hash: e.referenceHash })),
      created: caseObj.createdDate,
      defrauded: caseObj.totalDefraudedAmount,
      frozen: caseObj.frozenAmount,
    });

    const auditHash = await generateSha256(serialized);
    caseObj.auditHash = auditHash;
    caseObj.qrCodeUrl = `https://cybercrime.gov.in/verify?case=${caseObj.caseId}&hash=${auditHash}`;
    return caseObj;
  },

  // Helper for adding simulated alert (Task 4.6)
  addLiveAlert(alert: AlertItem) {
    alertsState = [alert, ...alertsState];

    atmsState = atmsState.map(atm => {
      if (atm.id !== alert.atmId && atm.terminalId !== alert.terminalId) return atm;
      return {
        ...atm,
        riskLevel: alert.riskLevel,
        status: 'Compromised',
        riskScore: Math.min(99, atm.riskScore + 15),
        incidentCount: atm.incidentCount + 1,
      };
    });

    zonesState = zonesState.map(zone => {
      if (zone.h3Index !== alert.zoneId) return zone;
      return {
        ...zone,
        activeAlertsCount: zone.activeAlertsCount + 1,
        riskProbability: Math.min(0.99, Number((zone.riskProbability + 0.05).toFixed(2))),
        riskLevel: zone.riskProbability >= 0.8 ? 'CRITICAL' : 'HIGH',
      };
    });
  },

  // Reset to initial state
  resetAll() {
    alertsState = [...INITIAL_ALERTS];
    zonesState = [...INITIAL_ZONES];
    atmsState = [...INITIAL_ATMS];
    caseState = { ...MOCK_CASE_DATA };
  }
};
