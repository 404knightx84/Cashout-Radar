import type { AlertItem } from '../types';
import { apiService } from './apiService';
import { INITIAL_ATMS, INITIAL_ZONES } from './mockData';

export type SocketStatus = 'CONNECTED' | 'CONNECTING' | 'PAUSED' | 'DISCONNECTED';

export interface WebSocketMessage {
  type: 'ALERT_NEW' | 'ZONE_RISK_UPDATE' | 'ATM_STATUS_CHANGE' | 'HEARTBEAT';
  timestamp: string;
  data: any;
}

type MessageListener = (msg: WebSocketMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageListener> = new Set();
  private status: SocketStatus = 'DISCONNECTED';
  private timer: any = null;
  private isSimulated = false;
  private simulationIntervalMs = 12000;
  private alertCounter = 100;

  constructor() {
    this.connect();
  }

  public connect(url = this.getDefaultUrl()) {
    this.status = 'CONNECTING';
    this.notifyStatusChange();

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.status = 'CONNECTED';
        this.isSimulated = false;
        this.notifyStatusChange();
        console.log('[WebSocket Task 4.6] Connected to live backend');
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.broadcast(data);
        } catch (e) {
          console.error('[WebSocket] Parse error:', e);
        }
      };

      this.ws.onerror = () => {
        // Fallback to simulation if backend socket is not available
        this.startSimulation();
      };

      this.ws.onclose = () => {
        if (!this.isSimulated) {
          this.startSimulation();
        }
      };
    } catch {
      this.startSimulation();
    }
  }

  private getDefaultUrl() {
    const configuredUrl = import.meta.env.VITE_WS_URL as string | undefined;
    if (configuredUrl) return configuredUrl;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (apiBaseUrl) {
      const parsed = new URL(apiBaseUrl);
      parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      parsed.pathname = '/ws/alerts';
      parsed.search = '';
      return parsed.toString();
    }

    if (typeof window !== 'undefined' && window.location.port !== '5173') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws/alerts`;
    }

    return 'ws://localhost:8000/ws/alerts';
  }

  private startSimulation() {
    this.isSimulated = true;
    this.status = 'CONNECTED';
    this.notifyStatusChange();
    console.log('[WebSocket Task 4.6] Operating in high-fidelity simulated streaming mode');

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.generateSimulatedEvent();
    }, this.simulationIntervalMs);
  }

  public triggerSimulatedAlert(): AlertItem {
    const randomZone = INITIAL_ZONES[Math.floor(Math.random() * INITIAL_ZONES.length)];
    const atmsInZone = INITIAL_ATMS.filter(a => a.h3Index === randomZone.h3Index);
    const randomAtm = atmsInZone[Math.floor(Math.random() * atmsInZone.length)] || INITIAL_ATMS[0];
    
    this.alertCounter++;
    const alertId = `alt-live-${this.alertCounter}`;
    const alertNumber = `ALT-2026-LIVE-${8000 + this.alertCounter}`;
    const crimeTypes = ['Mule Cash-Out', 'ATM Skimming', 'Card Cloning', 'Cash Trapping'] as const;
    const crimeType = crimeTypes[Math.floor(Math.random() * crimeTypes.length)];
    const amount = Math.floor(40000 + Math.random() * 160000);
    const probability = Number((0.82 + Math.random() * 0.16).toFixed(2));

    const newAlert: AlertItem = {
      id: alertId,
      alertNumber,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      atmId: randomAtm.id,
      terminalId: randomAtm.terminalId,
      bankName: randomAtm.bankName,
      zoneId: randomZone.h3Index,
      zoneName: randomZone.zoneName,
      city: randomZone.city,
      state: randomZone.state,
      crimeType,
      riskProbability: probability,
      riskLevel: probability >= 0.9 ? 'CRITICAL' : 'HIGH',
      status: 'ACTIVE',
      suspectedAmount: amount,
      reasons: [
        {
          id: `r-live-${this.alertCounter}-1`,
          factor: 'Real-time WebSocket Trigger: Velocity Spike',
          confidence: Math.round(probability * 100),
          description: `Telemetry detected burst of multiple card withdrawals totaling ₹${amount.toLocaleString('en-IN')} within 120 seconds.`,
          severity: 'critical',
          anomalyMetric: `Velocity spike: +${Math.round(probability * 40)}%`
        },
        {
          id: `r-live-${this.alertCounter}-2`,
          factor: 'Card Reader Bezel Anomaly',
          confidence: 88,
          description: 'Optical detection flagged potential skimming apparatus mounted over entry throat.',
          severity: 'warning',
          anomalyMetric: 'Sensor deviation: 2.8G'
        }
      ],
      telemetry: {
        bezelVibrationG: Number((0.1 + Math.random() * 2.5).toFixed(2)),
        cardReaderLatencyMs: Math.floor(250 + Math.random() * 500),
        cashShutterAnomalies: Math.floor(1 + Math.random() * 5),
        cameraOpticalFlow: Number((70 + Math.random() * 25).toFixed(1)),
        cardClusterVelocity: 'High-frequency burst'
      }
    };

    apiService.addLiveAlert(newAlert);

    this.broadcast({
      type: 'ALERT_NEW',
      timestamp: new Date().toISOString(),
      data: newAlert
    });

    return newAlert;
  }

  private generateSimulatedEvent() {
    if (this.status !== 'CONNECTED') return;

    // Send a live alert or zone risk shift
    const roll = Math.random();
    if (roll > 0.4) {
      this.triggerSimulatedAlert();
    } else {
      // Zone risk update
      const randomZone = INITIAL_ZONES[Math.floor(Math.random() * INITIAL_ZONES.length)];
      const delta = (Math.random() * 0.08 - 0.04);
      const newProb = Math.min(0.99, Math.max(0.1, Number((randomZone.riskProbability + delta).toFixed(2))));
      
      this.broadcast({
        type: 'ZONE_RISK_UPDATE',
        timestamp: new Date().toISOString(),
        data: {
          h3Index: randomZone.h3Index,
          zoneName: randomZone.zoneName,
          oldProbability: randomZone.riskProbability,
          newProbability: newProb
        }
      });
    }
  }

  public subscribe(callback: MessageListener): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private broadcast(msg: WebSocketMessage) {
    this.listeners.forEach(fn => fn(msg));
  }

  public getStatus(): SocketStatus {
    return this.status;
  }

  public setSpeed(multiplier: number) {
    if (this.timer) clearInterval(this.timer);
    if (multiplier <= 0) {
      this.status = 'PAUSED';
    } else {
      this.status = 'CONNECTED';
      this.simulationIntervalMs = Math.max(2000, Math.floor(12000 / multiplier));
      this.timer = setInterval(() => {
        this.generateSimulatedEvent();
      }, this.simulationIntervalMs);
    }
    this.notifyStatusChange();
  }

  public togglePause() {
    if (this.status === 'CONNECTED') {
      this.status = 'PAUSED';
      if (this.timer) clearInterval(this.timer);
    } else if (this.status === 'PAUSED') {
      this.status = 'CONNECTED';
      this.timer = setInterval(() => {
        this.generateSimulatedEvent();
      }, this.simulationIntervalMs);
    }
    this.notifyStatusChange();
  }

  private notifyStatusChange() {
    this.broadcast({
      type: 'HEARTBEAT',
      timestamp: new Date().toISOString(),
      data: { status: this.status, isSimulated: this.isSimulated }
    });
  }
}

export const wsClient = new WebSocketClient();
