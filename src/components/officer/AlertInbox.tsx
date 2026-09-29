import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  IndianRupee, 
  Building, 
  FileText, 
  GitFork, 
  AlertTriangle,
  HelpCircle,
  XCircle,
  Eye
} from 'lucide-react';
import type { AlertItem, AlertStatus, RoleType } from '../../types';

interface AlertInboxProps {
  alerts: AlertItem[];
  role: RoleType;
  onSelectAlert: (alert: AlertItem) => void;
  onOpenMuleChain: (caseId?: string) => void;
  onOpenEvidenceDossier: (caseId?: string) => void;
  onAcknowledge: (alertId: string) => void;
}

export const AlertInbox: React.FC<AlertInboxProps> = ({
  alerts,
  role,
  onSelectAlert,
  onOpenMuleChain,
  onOpenEvidenceDossier,
  onAcknowledge,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | AlertStatus>('ALL');

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      // Tab filter
      if (statusTab !== 'ALL' && a.status !== statusTab) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.alertNumber.toLowerCase().includes(q) ||
          a.terminalId.toLowerCase().includes(q) ||
          a.zoneName.toLowerCase().includes(q) ||
          a.bankName.toLowerCase().includes(q) ||
          a.crimeType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [alerts, statusTab, searchQuery]);

  const activeCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const ackCount = alerts.filter(a => a.status === 'ACKNOWLEDGED').length;
  const invCount = alerts.filter(a => a.status === 'INVESTIGATING').length;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 select-none overflow-hidden">
      {/* Top Action & Search Bar */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-800/80 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Incident & Alert Inbox</span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                API /alerts
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Role: <span className="font-semibold text-indigo-300">{role === 'OFFICER' ? 'Law Enforcement' : 'Bank AML Compliance'}</span>
            </p>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search terminal, alert ID, bank, zone..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center px-3.5 py-2 border-b border-slate-800/80 bg-slate-900/40 gap-1.5 text-xs overflow-x-auto">
        <button
          onClick={() => setStatusTab('ALL')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
            statusTab === 'ALL'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>All Alerts</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-950/60 rounded-full">{alerts.length}</span>
        </button>

        <button
          onClick={() => setStatusTab('ACTIVE')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
            statusTab === 'ACTIVE'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          <span>Active / Critical</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-950/60 rounded-full">{activeCount}</span>
        </button>

        <button
          onClick={() => setStatusTab('ACKNOWLEDGED')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
            statusTab === 'ACKNOWLEDGED'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-3 h-3 text-amber-300" />
          <span>Acknowledged</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-950/60 rounded-full">{ackCount}</span>
        </button>

        <button
          onClick={() => setStatusTab('INVESTIGATING')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
            statusTab === 'INVESTIGATING'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <GitFork className="w-3 h-3 text-blue-300" />
          <span>In Investigation</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-950/60 rounded-full">{invCount}</span>
        </button>

        <button
          onClick={() => setStatusTab('RESOLVED')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
            statusTab === 'RESOLVED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-300" />
          <span>Resolved</span>
        </button>
      </div>

      {/* Alert List Cards */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <HelpCircle className="w-10 h-10 mb-2 stroke-1" />
            <p className="text-sm">No alerts found matching filter criteria</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border transition-all shadow-md ${
                alert.status === 'ACTIVE'
                  ? 'bg-slate-900/90 border-red-900/60 hover:border-red-600/80 shadow-red-950/30'
                  : alert.status === 'ACKNOWLEDGED'
                  ? 'bg-slate-900/70 border-amber-800/40 hover:border-amber-600/60'
                  : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 ${
                      alert.riskLevel === 'CRITICAL'
                        ? 'bg-red-950 text-red-300 border-red-700/80'
                        : alert.riskLevel === 'HIGH'
                        ? 'bg-orange-950 text-orange-300 border-orange-700/80'
                        : 'bg-amber-950 text-amber-300 border-amber-700/80'
                    }`}
                  >
                    {alert.riskLevel === 'CRITICAL' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    )}
                    {alert.riskLevel} • {Math.round(alert.riskProbability * 100)}%
                  </span>

                  <span className="font-mono text-xs font-bold text-slate-200">
                    {alert.alertNumber}
                  </span>

                  <span className="text-[11px] font-medium text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                    {alert.crimeType}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{alert.timestamp}</span>
                </div>
              </div>

              {/* Body: Terminal & Telemetry Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2.5 text-xs text-slate-300">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{alert.terminalId}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">{alert.bankName}</span>
                  <span className="text-[10px] text-slate-500 block truncate">{alert.zoneName}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Suspected Amount:</span>
                  <div className="text-sm font-extrabold text-amber-400 font-mono mt-0.5 flex items-center">
                    <IndianRupee className="w-3 h-3" />
                    <span>{alert.suspectedAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Velocity: {alert.telemetry.cardClusterVelocity}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Status / Assignment:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {alert.status === 'ACTIVE' && (
                      <span className="text-red-400 font-bold text-[11px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Action Required
                      </span>
                    )}
                    {alert.status === 'ACKNOWLEDGED' && (
                      <span className="text-amber-400 font-medium text-[11px]">
                        Ack by {alert.acknowledgedBy}
                      </span>
                    )}
                    {alert.status === 'INVESTIGATING' && (
                      <span className="text-blue-400 font-medium text-[11px]">
                        Case Linked: {alert.caseId || 'Investigation Active'}
                      </span>
                    )}
                    {alert.status === 'RESOLVED' && (
                      <span className="text-emerald-400 font-medium text-[11px]">
                        Resolved / Closed
                      </span>
                    )}
                    {alert.status === 'FALSE_POSITIVE' && (
                      <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-slate-500" /> Flagged False Positive
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar (6.4 Acknowledge + Inspect + Graph + Evidence) */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Inspect Details */}
                  <button
                    onClick={() => onSelectAlert(alert)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Inspect AI & Telemetry</span>
                  </button>

                  {/* 6.2 Mule Chain Graph */}
                  <button
                    onClick={() => onOpenMuleChain(alert.caseId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/70 text-indigo-300 text-xs font-semibold transition-colors"
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    <span>Mule Chain Graph</span>
                  </button>

                  {/* 6.3 Evidence PDF */}
                  <button
                    onClick={() => onOpenEvidenceDossier(alert.caseId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Evidence PDF</span>
                  </button>
                </div>

                {/* 6.4 Acknowledge Button */}
                <div>
                  {alert.status === 'ACTIVE' ? (
                    <button
                      onClick={() => onAcknowledge(alert.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Acknowledge (/ack)</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Acknowledged {alert.acknowledgedAt}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
