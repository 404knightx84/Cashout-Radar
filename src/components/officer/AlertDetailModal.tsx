import React from 'react';
import { 
  X, 
  ShieldAlert, 
  Building, 
  MapPin, 
  CheckCircle2, 
  ThumbsUp, 
  ThumbsDown, 
  Activity, 
  GitFork, 
  FileText, 
  AlertTriangle,
  Cpu,
  Clock,
  IndianRupee,
  Camera,
  Layers
} from 'lucide-react';
import type { AlertItem } from '../../types';

interface AlertDetailModalProps {
  alert: AlertItem | null;
  onClose: () => void;
  onAcknowledge: (alertId: string) => void;
  onFeedbackClick: (alertId: string, isUseful: boolean) => void;
  onOpenMuleChain: (caseId?: string) => void;
  onOpenEvidenceDossier: (caseId?: string) => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  onClose,
  onAcknowledge,
  onFeedbackClick,
  onOpenMuleChain,
  onOpenEvidenceDossier,
}) => {
  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-100">
                  {alert.alertNumber}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  alert.riskLevel === 'CRITICAL'
                    ? 'bg-red-950 text-red-300 border border-red-700'
                    : 'bg-orange-950 text-orange-300 border border-orange-700'
                }`}>
                  {alert.riskLevel} • {Math.round(alert.riskProbability * 100)}%
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {alert.crimeType}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Terminal: <span className="font-semibold text-slate-200">{alert.terminalId}</span> ({alert.bankName}) • {alert.zoneName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scroll */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs custom-scrollbar">
          {/* Top Quick Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">Suspected Fraud Volume</span>
              <div className="text-base font-extrabold text-amber-400 font-mono mt-1 flex items-center">
                <IndianRupee className="w-4 h-4" />
                <span>{alert.suspectedAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">Model Probability</span>
              <div className="text-base font-extrabold text-red-400 font-mono mt-1">
                {(alert.riskProbability * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">Timestamp</span>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                {alert.timestamp}
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">Current Status</span>
              <div className="text-xs font-bold text-indigo-400 mt-1">
                {alert.status}
              </div>
            </div>
          </div>

          {/* Explainable AI Prediction Reasons (6.1 /predictions) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>AI Anomaly Signals & Prediction Reasons</span>
            </div>

            <div className="space-y-2">
              {alert.reasons.map((reason, idx) => (
                <div
                  key={reason.id || idx}
                  className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        reason.severity === 'critical' ? 'bg-red-500' : 'bg-amber-400'
                      }`} />
                      <span className="font-bold text-slate-100 text-xs">{reason.factor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {reason.anomalyMetric && (
                        <span className="font-mono text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                          {reason.anomalyMetric}
                        </span>
                      )}
                      <span className="font-mono text-red-400 font-bold text-[11px]">
                        {reason.confidence}% Confidence
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                    {reason.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Hardware & Sensor Telemetry Grid */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Terminal Telemetry & Edge Sensor Metrics</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Bezel Shroud Vibration</span>
                <span className="text-sm font-mono font-bold text-slate-200 mt-0.5 block">
                  {alert.telemetry.bezelVibrationG} G
                </span>
                <span className="text-[9px] text-slate-500">Threshold: &gt; 1.0G</span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Card Reader Latency</span>
                <span className="text-sm font-mono font-bold text-slate-200 mt-0.5 block">
                  {alert.telemetry.cardReaderLatencyMs} ms
                </span>
                <span className="text-[9px] text-slate-500">Expected: 150-250ms</span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Shutter Jam Anomalies</span>
                <span className="text-sm font-mono font-bold text-slate-200 mt-0.5 block">
                  {alert.telemetry.cashShutterAnomalies} faults
                </span>
                <span className="text-[9px] text-slate-500">Adhesive trap check</span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Camera Optical Occlusion</span>
                <span className="text-sm font-mono font-bold text-slate-200 mt-0.5 block">
                  {alert.telemetry.cameraOpticalFlow}%
                </span>
                <span className="text-[9px] text-slate-500">Lens obstruction</span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 col-span-2">
                <span className="text-[10px] text-slate-400 block">Card Cluster Velocity</span>
                <span className="text-sm font-semibold text-amber-300 mt-0.5 block">
                  {alert.telemetry.cardClusterVelocity}
                </span>
                <span className="text-[9px] text-slate-500">Inter-card delay under 45s</span>
              </div>
            </div>
          </div>

          {/* Acknowledgement / Feedback Record if already logged */}
          {alert.feedback && (
            <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 block mb-1">Officer Feedback Logged:</span>
              <div className="flex items-center gap-2">
                {alert.feedback.isUseful ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    True Positive (Useful)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    False Positive
                  </span>
                )}
                <span className="text-[11px] text-slate-400">"{alert.feedback.reason}"</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer: 6.4 Acknowledge & Useful/False Feedback buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/95 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenMuleChain(alert.caseId)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 text-xs font-semibold transition-colors"
            >
              <GitFork className="w-4 h-4 text-indigo-400" />
              <span>Launch Mule Chain Graph</span>
            </button>

            <button
              onClick={() => onOpenEvidenceDossier(alert.caseId)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Evidence PDF</span>
            </button>
          </div>

          {/* 6.4 Requirement Buttons */}
          <div className="flex items-center gap-2">
            {/* Acknowledge Button */}
            {alert.status === 'ACTIVE' && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Acknowledge (/ack)</span>
              </button>
            )}

            {/* Useful / False Positive Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => onFeedbackClick(alert.id, true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-bold text-xs border border-emerald-800/60 transition-colors"
                title="Mark this detection as a confirmed True Positive threat"
              >
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Useful</span>
              </button>

              <button
                onClick={() => onFeedbackClick(alert.id, false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-red-950/60 text-slate-300 hover:text-red-300 font-bold text-xs border border-slate-700 transition-colors"
                title="Mark as False Positive (Dispenser maintenance, testing, false sensor)"
              >
                <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
                <span>False</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
