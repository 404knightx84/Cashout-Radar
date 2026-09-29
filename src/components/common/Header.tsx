import React from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  FolderLock, 
  Columns, 
  Radio, 
  Pause, 
  Play, 
  Zap, 
  UserCheck, 
  Building2,
  Bell
} from 'lucide-react';
import type { RoleType } from '../../types';
import type { SocketStatus } from '../../services/websocketService';

interface HeaderProps {
  currentTab: 'dashboard' | 'officer' | 'split';
  setCurrentTab: (tab: 'dashboard' | 'officer' | 'split') => void;
  role: RoleType;
  setRole: (role: RoleType) => void;
  socketStatus: SocketStatus;
  dataMode: 'backend' | 'prototype';
  onToggleSocketPause: () => void;
  onTriggerLiveAlert: () => void;
  activeAlertCount: number;
  unreadAlertCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  role,
  setRole,
  socketStatus,
  dataMode,
  onToggleSocketPause,
  onTriggerLiveAlert,
  activeAlertCount,
  unreadAlertCount,
}) => {
  return (
    <header className="h-16 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between z-30 select-none backdrop-blur-md sticky top-0 shadow-lg">
      {/* Platform Branding */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-950/40 border border-indigo-500/30">
          <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 shadow-inner">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentTab === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Geospatial Risk</span>
        </button>

        <button
          onClick={() => setCurrentTab('officer')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
            currentTab === 'officer'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <FolderLock className="w-3.5 h-3.5" />
          <span>Officer Portal</span>
          {unreadAlertCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>

        <button
          onClick={() => setCurrentTab('split')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hidden md:flex ${
            currentTab === 'split'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
          title="Split view"
        >
          <Columns className="w-3.5 h-3.5" />
          <span>Command Split</span>
        </button>
      </nav>

      {/* Right Controls: Role Masking Toggle + Live WebSocket Client Status */}
      <div className="flex items-center gap-3">
        {/* Role Switcher */}
        <div className="flex items-center bg-slate-950/80 rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => setRole('OFFICER')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              role === 'OFFICER'
                ? 'bg-amber-600/90 text-white font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Full Law Enforcement Access (Unmasked PII & Bank Accounts)"
          >
            <UserCheck className="w-3 h-3 text-amber-300" />
            <span className="hidden lg:inline">Police / Officer</span>
          </button>

          <button
            onClick={() => setRole('BANK_COMPLIANCE')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              role === 'BANK_COMPLIANCE'
                ? 'bg-blue-600/90 text-white font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Masked Bank Role (PII & Cross-Bank Details Anonymized)"
          >
            <Building2 className="w-3 h-3 text-blue-300" />
            <span className="hidden lg:inline">Bank Compliance</span>
          </button>
        </div>

        {/* Live WebSocket Status & Simulator Controls (Task 4.6) */}
        <div className="flex items-center gap-1.5 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <Radio 
              className={`w-3.5 h-3.5 ${
                socketStatus === 'CONNECTED' 
                  ? 'text-emerald-400 animate-pulse' 
                  : socketStatus === 'PAUSED' 
                  ? 'text-amber-400' 
                  : 'text-slate-500'
              }`} 
            />
            <span className="font-mono text-[11px] font-semibold text-slate-300 hidden xl:inline">
              WS: {socketStatus}
            </span>
          </div>

          <button
            onClick={onToggleSocketPause}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800/80 transition-colors"
            title={socketStatus === 'PAUSED' ? 'Resume Live Updates' : 'Pause Live Updates'}
          >
            {socketStatus === 'PAUSED' ? (
              <Play className="w-3 h-3 text-emerald-400" />
            ) : (
              <Pause className="w-3 h-3 text-amber-400" />
            )}
          </button>

          <button
            onClick={onTriggerLiveAlert}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 font-mono text-[10px] font-bold transition-all"
            title="Simulate live alert"
          >
            <Zap className="w-2.5 h-2.5 text-red-400 animate-bounce" />
            <span className="hidden sm:inline">Inject Alert</span>
          </button>
        </div>

        {/* Notification Bell with Badge */}
        <div className="relative">
          <button 
            onClick={() => setCurrentTab('officer')}
            className="p-2 rounded-lg bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors relative"
            title={`${activeAlertCount} active alerts`}
          >
            <Bell className="w-4 h-4" />
            {activeAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-600 text-white font-mono text-[9px] font-extrabold rounded-full shadow-lg border border-slate-900">
                {activeAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
