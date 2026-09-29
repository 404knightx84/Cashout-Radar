import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  MapPin, 
  Cpu, 
  Clock, 
  CheckCircle, 
  Send,
  Building,
  AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import type { H3Zone, ATMPoint, AlertItem } from '../../types';

interface ZoneDetailDrawerProps {
  zone: H3Zone | null;
  onClose: () => void;
  atms: ATMPoint[];
  alerts: AlertItem[];
  onSelectAtm: (atm: ATMPoint) => void;
  onNavigateToAlert: (alertId: string) => void;
}

export const ZoneDetailDrawer: React.FC<ZoneDetailDrawerProps> = ({
  zone,
  onClose,
  atms,
  alerts,
  onSelectAtm,
  onNavigateToAlert,
}) => {
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  if (!zone) return null;

  const zoneAtms = atms.filter(a => a.h3Index === zone.h3Index);
  const zoneAlerts = alerts.filter(a => a.zoneId === zone.h3Index);

  const handleDispatchPatrol = () => {
    setDispatchStatus('Patrol Van #PCR-18 dispatched to zone. ETA 6 mins.');
    setTimeout(() => {
      setDispatchStatus(null);
    }, 4500);
  };

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-slate-900/98 backdrop-blur-xl border-l border-slate-700/80 shadow-2xl z-30 flex flex-col text-slate-200 animate-slideLeft select-none">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center border border-indigo-700/60">
            <MapPin className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400">
              Zone Drill-Down
            </span>
            <h2 className="text-sm font-bold text-slate-100 truncate w-64">
              {zone.zoneName}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs custom-scrollbar">
        {/* Risk Probability Card */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Model Probability</span>
            <div className="text-2xl font-extrabold text-red-400 font-mono mt-0.5">
              {Math.round(zone.riskProbability * 100)}%
            </div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">
              Status: {zone.riskLevel}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 font-medium">Primary Threat</span>
            <div className="text-xs font-bold text-amber-300 mt-1">
              {zone.primaryCrimeType}
            </div>
            <span className="text-[10px] font-mono text-indigo-400 block mt-0.5">
              H3: {zone.h3Index}
            </span>
          </div>
        </div>

        {/* 24-Hour Historical Probability Trajectory */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>24-Hour Probability Trajectory</span>
            </div>
          </div>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={zone.historicalProbabilities} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="timestamp" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <YAxis domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', borderRadius: '6px' }}
                />
                <Line type="monotone" dataKey="probability" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Contributing Risk Factors */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-300 text-xs">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Model Contributing Factors</span>
          </div>

          {zone.contributingFactors.map(factor => (
            <div key={factor.factor} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">{factor.factor}</span>
                <span className="font-mono text-red-400 font-bold">+{factor.weight}%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {factor.description}
              </p>
            </div>
          ))}
        </div>

        {/* Active Alerts in this Zone */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-300 text-xs">
              Active Alerts in Zone ({zoneAlerts.length})
            </span>
          </div>

          {zoneAlerts.length === 0 ? (
            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 text-center text-slate-500">
              No unacknowledged alerts in this zone
            </div>
          ) : (
            <div className="space-y-1.5">
              {zoneAlerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => onNavigateToAlert(alert.id)}
                  className="p-2.5 rounded-lg bg-slate-950/80 border border-red-900/40 hover:border-red-600/60 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      <span>{alert.alertNumber}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">{alert.terminalId} • {alert.crimeType}</span>
                  </div>
                  <span className="text-[10px] text-red-400 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-800/60">
                    Open
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ATM Terminals in Zone */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-300 text-xs">
              ATM Terminals in Sector ({zoneAtms.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {zoneAtms.map(atm => (
              <div
                key={atm.id}
                onClick={() => onSelectAtm(atm)}
                className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  atm.status === 'Compromised'
                    ? 'bg-red-950/40 border-red-800 text-red-200'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1 font-semibold text-slate-200">
                    <Building className="w-3 h-3 text-slate-400" />
                    <span>{atm.terminalId}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block w-44">{atm.bankName}</span>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    atm.status === 'Compromised' ? 'bg-red-900 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {atm.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tactical Actions */}
        <div className="pt-2">
          {dispatchStatus ? (
            <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-xl flex items-center gap-2 text-emerald-200 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{dispatchStatus}</span>
            </div>
          ) : (
            <button
              onClick={handleDispatchPatrol}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/40 transition-all text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Deploy Emergency PCR Patrol</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
