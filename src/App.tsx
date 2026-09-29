import React, { useState, useEffect, useCallback } from 'react';
import type { 
  ATMPoint, 
  H3Zone, 
  AlertItem, 
  CaseData, 
  RoleType, 
  FilterState 
} from './types';
import { apiService } from './services/apiService';
import { wsClient, type SocketStatus } from './services/websocketService';
import { Header } from './components/common/Header';
import { FilterBar } from './components/dashboard/FilterBar';
import { MapLibreDeckMap } from './components/dashboard/MapLibreDeckMap';
import { ZoneAnalyticsPanels } from './components/dashboard/ZoneAnalyticsPanels';
import { ZoneDetailDrawer } from './components/dashboard/ZoneDetailDrawer';
import { AlertInbox } from './components/officer/AlertInbox';
import { AlertDetailModal } from './components/officer/AlertDetailModal';
import { MuleChainGraph } from './components/officer/MuleChainGraph';
import { EvidenceDossierModal } from './components/officer/EvidenceDossierModal';
import { FeedbackDialog } from './components/officer/FeedbackDialog';
import { ShieldAlert, CheckCircle2, X } from 'lucide-react';

export function App() {
  // Navigation & Role State
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'officer' | 'split'>('dashboard');
  const [role, setRole] = useState<RoleType>('OFFICER');

  // Core Data State
  const [zones, setZones] = useState<H3Zone[]>([]);
  const [atms, setAtms] = useState<ATMPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [caseData, setCaseData] = useState<CaseData | null>(null);

  // Modals & Selection State
  const [selectedZone, setSelectedZone] = useState<H3Zone | null>(null);
  const [selectedAtm, setSelectedAtm] = useState<ATMPoint | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [activeMuleCaseId, setActiveMuleCaseId] = useState<string | null>(null);
  const [activeEvidenceCaseId, setActiveEvidenceCaseId] = useState<string | null>(null);
  const [feedbackPrompt, setFeedbackPrompt] = useState<{ alertId: string; isUseful: boolean } | null>(null);

  // Live Toast Notification
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'alert' | 'success' } | null>(null);

  // Filter State (5.3 React Query / URL Search Params synced)
  const [filters, setFilters] = useState<FilterState>(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      state: params.get('state') || 'All States',
      crimeType: params.get('crime') || 'All Crime Types',
      amountMin: Number(params.get('minAmount')) || 0,
      amountMax: 1000000,
      timeRange: (params.get('time') as any) || '24h',
      historicalHourOffset: Number(params.get('hourOffset')) || 11,
    };
  });

  // Mode & Historical Playback State (5.2 deck.gl Live vs Historical)
  const [isHistoricalMode, setIsHistoricalMode] = useState<boolean>(() => {
    return new URLSearchParams(window.location.search).get('mode') === 'historical';
  });
  const [isPlayingHistorical, setIsPlayingHistorical] = useState(false);

  // WebSocket Status (5.5 Task 4.6)
  const [socketStatus, setSocketStatus] = useState<SocketStatus>(wsClient.getStatus());
  const [dataMode, setDataMode] = useState<'backend' | 'prototype'>(apiService.getConnectionMode());

  // Load initial data
  useEffect(() => {
    async function loadData() {
      const [loadedZones, loadedAtms, loadedAlerts, loadedCase] = await Promise.all([
        apiService.getZones(),
        apiService.getAtms(),
        apiService.getAlerts(),
        apiService.getMuleChain('CASE-2026-MUM-891', role),
      ]);

      setZones(loadedZones);
      setAtms(loadedAtms);
      setAlerts(loadedAlerts);
      setCaseData(loadedCase);
      setDataMode(apiService.getConnectionMode());
    }

    loadData();
  }, [role]);

  // Subscribe to WebSocket client (Task 4.6)
  useEffect(() => {
    const unsubscribe = wsClient.subscribe((msg) => {
      if (msg.type === 'HEARTBEAT') {
        setSocketStatus(msg.data.status);
      } else if (msg.type === 'ALERT_NEW') {
        const newAlert = msg.data as AlertItem;
        setAlerts((prev) => [newAlert, ...prev]);

        // Update ATM in state
        setAtms((prev) =>
          prev.map((a) =>
            a.id === newAlert.atmId || a.terminalId === newAlert.terminalId
              ? { ...a, riskLevel: newAlert.riskLevel, status: 'Compromised', incidentCount: a.incidentCount + 1 }
              : a
          )
        );

        // Update Zone in state
        setZones((prev) =>
          prev.map((z) =>
            z.h3Index === newAlert.zoneId
              ? { ...z, activeAlertsCount: z.activeAlertsCount + 1, riskProbability: Math.min(0.99, z.riskProbability + 0.05) }
              : z
          )
        );

        // Show live alert toast
        setToastMessage({
          title: `Incoming Critical Incident: ${newAlert.alertNumber}`,
          desc: `${newAlert.crimeType} flagged at ${newAlert.terminalId} (${newAlert.bankName})`,
          type: 'alert',
        });
      } else if (msg.type === 'ZONE_RISK_UPDATE') {
        const { h3Index, newProbability } = msg.data;
        setZones((prev) =>
          prev.map((z) => (z.h3Index === h3Index ? { ...z, riskProbability: newProbability } : z))
        );
      }
    });

    return () => unsubscribe();
  }, []);

  // Historical scrubber playback timer
  useEffect(() => {
    if (!isHistoricalMode || !isPlayingHistorical) return;

    const interval = setInterval(() => {
      setFilters((prev) => ({
        ...prev,
        historicalHourOffset: (prev.historicalHourOffset + 1) % 12,
      }));
    }, 1500);

    return () => clearInterval(interval);
  }, [isHistoricalMode, isPlayingHistorical]);

  // Handlers for 6.4 Acknowledge & Feedback
  const handleAcknowledge = async (alertId: string) => {
    try {
      const officerBadge = role === 'OFFICER' ? 'Insp. R. Sangwan (MH-CYBER-8841)' : 'AML Officer (RBI Compliance)';
      const res = await apiService.acknowledgeAlert(alertId, officerBadge);
      
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? res.alert : a)));
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(res.alert);
      }

      setToastMessage({
        title: 'Alert Acknowledged (/ack)',
        desc: `Status updated to Acknowledged by ${officerBadge}`,
        type: 'success',
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleFeedbackSubmit = async (alertId: string, isUseful: boolean, reason: string) => {
    try {
      const officerId = role === 'OFFICER' ? 'MH-CYBER-8841' : 'BANK-COMPLIANCE-01';
      const res = await apiService.submitFeedback(alertId, isUseful, reason, officerId);

      setAlerts((prev) => prev.map((a) => (a.id === alertId ? res.alert : a)));
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(res.alert);
      }

      setToastMessage({
        title: isUseful ? 'Feedback Recorded: True Positive (/feedback)' : 'Feedback Recorded: False Positive (/feedback)',
        desc: `Model updated: "${reason}"`,
        type: 'success',
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      state: 'All States',
      crimeType: 'All Crime Types',
      amountMin: 0,
      amountMax: 1000000,
      timeRange: '24h',
      historicalHourOffset: 11,
    });
    setIsHistoricalMode(false);
    setIsPlayingHistorical(false);
  };

  const handleOpenMuleChain = async (caseId = 'CASE-2026-MUM-891') => {
    const caseDataRes = await apiService.getMuleChain(caseId, role);
    setCaseData(caseDataRes);
    setActiveMuleCaseId(caseId);
    setActiveEvidenceCaseId(null);
  };

  const handleOpenEvidence = async (caseId = 'CASE-2026-MUM-891') => {
    const caseDataRes = await apiService.getCaseEvidenceDossier(caseId);
    setCaseData(caseDataRes);
    setActiveEvidenceCaseId(caseId);
    setActiveMuleCaseId(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Top Header Bar */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        role={role}
        setRole={setRole}
        socketStatus={socketStatus}
        dataMode={dataMode}
        onToggleSocketPause={() => wsClient.togglePause()}
        onTriggerLiveAlert={() => wsClient.triggerSimulatedAlert()}
        activeAlertCount={alerts.filter((a) => a.status === 'ACTIVE').length}
        unreadAlertCount={alerts.filter((a) => a.status === 'ACTIVE').length}
      />

      {/* Filter Bar */}
      {(currentTab === 'dashboard' || currentTab === 'split') && (
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          isHistoricalMode={isHistoricalMode}
          setIsHistoricalMode={setIsHistoricalMode}
          isPlayingHistorical={isPlayingHistorical}
          setIsPlayingHistorical={setIsPlayingHistorical}
          onReset={handleResetFilters}
        />
      )}

      {/* Main View Area */}
      <main className="flex-1 relative overflow-hidden flex">
        {/* Geospatial Risk Dashboard */}
        {currentTab === 'dashboard' && (
          <div className="flex w-full h-full relative">
            {/* Map Area */}
            <div className="flex-1 h-full relative">
              <MapLibreDeckMap
                zones={zones}
                atms={atms}
                filters={filters}
                isHistoricalMode={isHistoricalMode}
                onSelectZone={(z) => setSelectedZone(z)}
                onSelectAtm={(a) => {
                  setSelectedAtm(a);
                  const matchedAlert = alerts.find((al) => al.atmId === a.id || al.terminalId === a.terminalId);
                  if (matchedAlert) {
                    setSelectedAlert(matchedAlert);
                  }
                }}
                selectedZoneIndex={selectedZone?.h3Index}
                selectedAtmId={selectedAtm?.id}
              />
            </div>

            {/* Analytics Panels */}
            <div className="w-80 md:w-96 h-full shrink-0">
              <ZoneAnalyticsPanels
                zones={zones}
                alerts={alerts}
                onSelectZone={(z) => setSelectedZone(z)}
                selectedZoneIndex={selectedZone?.h3Index}
              />
            </div>

            {/* Zone Drill-Down Drawer */}
            {selectedZone && (
              <ZoneDetailDrawer
                zone={selectedZone}
                atms={atms}
                alerts={alerts}
                onClose={() => setSelectedZone(null)}
                onSelectAtm={(a) => setSelectedAtm(a)}
                onNavigateToAlert={(alertId) => {
                  const alertItem = alerts.find((a) => a.id === alertId);
                  if (alertItem) {
                    setSelectedAlert(alertItem);
                  }
                }}
              />
            )}
          </div>
        )}

        {/* Officer Portal View */}
        {currentTab === 'officer' && (
          <div className="w-full h-full">
            <AlertInbox
              alerts={alerts}
              role={role}
              onSelectAlert={(a) => setSelectedAlert(a)}
              onOpenMuleChain={(cid) => handleOpenMuleChain(cid)}
              onOpenEvidenceDossier={(cid) => handleOpenEvidence(cid)}
              onAcknowledge={(aid) => handleAcknowledge(aid)}
            />
          </div>
        )}

        {/* VIEW 3: Unified Command Center Split View */}
        {currentTab === 'split' && (
          <div className="flex w-full h-full">
            {/* Left Half: Map & H3 Hexagons */}
            <div className="w-1/2 h-full relative border-r border-slate-800">
              <MapLibreDeckMap
                zones={zones}
                atms={atms}
                filters={filters}
                isHistoricalMode={isHistoricalMode}
                onSelectZone={(z) => setSelectedZone(z)}
                onSelectAtm={(a) => setSelectedAtm(a)}
                selectedZoneIndex={selectedZone?.h3Index}
                selectedAtmId={selectedAtm?.id}
              />
            </div>

            {/* Right Half: Officer Inbox & Fast Actions */}
            <div className="w-1/2 h-full">
              <AlertInbox
                alerts={alerts}
                role={role}
                onSelectAlert={(a) => setSelectedAlert(a)}
                onOpenMuleChain={(cid) => handleOpenMuleChain(cid)}
                onOpenEvidenceDossier={(cid) => handleOpenEvidence(cid)}
                onAcknowledge={(aid) => handleAcknowledge(aid)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={(aid) => handleAcknowledge(aid)}
          onFeedbackClick={(aid, isUseful) => setFeedbackPrompt({ alertId: aid, isUseful })}
          onOpenMuleChain={(cid) => handleOpenMuleChain(cid)}
          onOpenEvidenceDossier={(cid) => handleOpenEvidence(cid)}
        />
      )}

      {/* Mule Chain Graph Modal View */}
      {activeMuleCaseId && caseData && (
        <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full h-full max-w-6xl max-h-[92vh] rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
            <MuleChainGraph
              caseData={caseData}
              role={role}
              setRole={setRole}
              onOpenEvidenceDossier={(cid) => handleOpenEvidence(cid)}
              onClose={() => setActiveMuleCaseId(null)}
            />
          </div>
        </div>
      )}

      {/* Evidence Dossier Modal */}
      {activeEvidenceCaseId && caseData && (
        <EvidenceDossierModal
          caseData={caseData}
          onClose={() => setActiveEvidenceCaseId(null)}
        />
      )}

      {/* Feedback Reason Dialog */}
      {feedbackPrompt && (
        <FeedbackDialog
          isOpen={true}
          alertId={feedbackPrompt.alertId}
          isUseful={feedbackPrompt.isUseful}
          onClose={() => setFeedbackPrompt(null)}
          onSubmit={handleFeedbackSubmit}
        />
      )}

      {/* Live Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900 border border-slate-700 p-3.5 rounded-xl shadow-2xl flex items-start gap-3 animate-slideUp">
          <div className="mt-0.5">
            {toastMessage.type === 'alert' ? (
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-100">{toastMessage.title}</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{toastMessage.desc}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
