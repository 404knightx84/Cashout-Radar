import React, { useEffect } from 'react';
import { 
  Filter, 
  RotateCcw, 
  Clock, 
  IndianRupee, 
  Calendar, 
  History, 
  Radio, 
  Play, 
  Pause,
  MapPin,
  Shield
} from 'lucide-react';
import type { FilterState } from '../../types';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  isHistoricalMode: boolean;
  setIsHistoricalMode: (val: boolean) => void;
  isPlayingHistorical: boolean;
  setIsPlayingHistorical: (val: boolean | ((prev: boolean) => boolean)) => void;
  onReset: () => void;
}

const STATES = [
  'All States',
  'Maharashtra',
  'Delhi',
  'Karnataka',
  'Telangana',
  'Tamil Nadu',
  'West Bengal',
  'Gujarat'
];

const CRIME_TYPES = [
  'All Crime Types',
  'ATM Skimming',
  'Cash Trapping',
  'Physical Tampering',
  'Mule Cash-Out',
  'Card Cloning',
  'Coercion / Robbery'
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  isHistoricalMode,
  setIsHistoricalMode,
  isPlayingHistorical,
  setIsPlayingHistorical,
  onReset,
}) => {
  // Sync state to URL Query Parameters (Requirement 5.3)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (filters.state && filters.state !== 'All States') {
      params.set('state', filters.state);
    } else {
      params.delete('state');
    }

    if (filters.crimeType && filters.crimeType !== 'All Crime Types') {
      params.set('crime', filters.crimeType);
    } else {
      params.delete('crime');
    }

    if (filters.amountMin > 0) {
      params.set('minAmount', filters.amountMin.toString());
    } else {
      params.delete('minAmount');
    }

    if (filters.timeRange !== '24h') {
      params.set('time', filters.timeRange);
    } else {
      params.delete('time');
    }

    if (isHistoricalMode) {
      params.set('mode', 'historical');
      params.set('hourOffset', filters.historicalHourOffset.toString());
    } else {
      params.delete('mode');
      params.delete('hourOffset');
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [filters, isHistoricalMode]);

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Left side: Filter controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-1">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <span>Filters</span>
        </div>

        {/* State Filter */}
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={filters.state}
            onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
            className="pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 hover:border-slate-600 transition-colors"
          >
            {STATES.map(s => (
              <option key={s} value={s} className="bg-slate-900 text-slate-200">
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Crime Type Filter */}
        <div className="relative">
          <Shield className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={filters.crimeType}
            onChange={(e) => setFilters(prev => ({ ...prev, crimeType: e.target.value }))}
            className="pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 hover:border-slate-600 transition-colors"
          >
            {CRIME_TYPES.map(ct => (
              <option key={ct} value={ct} className="bg-slate-900 text-slate-200">
                {ct}
              </option>
            ))}
          </select>
        </div>

        {/* Suspected Amount Range Filter */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-700/80">
          <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] text-slate-400">Min:</span>
          <input
            type="number"
            min={0}
            max={500000}
            step={10000}
            value={filters.amountMin}
            onChange={(e) => setFilters(prev => ({ ...prev, amountMin: Number(e.target.value) || 0 }))}
            placeholder="Min ₹"
            className="w-20 bg-transparent text-slate-200 font-mono text-xs focus:outline-none"
          />
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-700/80">
          {(['1h', '6h', '24h', '7d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setFilters(prev => ({ ...prev, timeRange: range }))}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                filters.timeRange === range
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Reset all filters to defaults"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Right side: Mode Switcher (Live vs Historical) (Requirement 5.2) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-slate-950/90 p-0.5 rounded-xl border border-slate-700/80 shadow-sm">
          <button
            onClick={() => setIsHistoricalMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              !isHistoricalMode
                ? 'bg-red-600/90 text-white shadow-md shadow-red-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${!isHistoricalMode ? 'animate-pulse' : ''}`} />
            <span>Live Mode</span>
          </button>

          <button
            onClick={() => setIsHistoricalMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              isHistoricalMode
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historical Mode</span>
          </button>
        </div>

        {/* Historical Scrubber Bar (when Historical mode is active) */}
        {isHistoricalMode && (
          <div className="flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-indigo-500/40 shadow-lg animate-fadeIn">
            <button
              onClick={() => setIsPlayingHistorical(prev => !prev)}
              className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              title={isPlayingHistorical ? 'Pause Playback' : 'Play Timeline'}
            >
              {isPlayingHistorical ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </button>

            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            
            <input
              type="range"
              min={0}
              max={11}
              step={1}
              value={filters.historicalHourOffset}
              onChange={(e) => setFilters(prev => ({ ...prev, historicalHourOffset: Number(e.target.value) }))}
              className="w-28 accent-indigo-500 cursor-pointer"
            />

            <span className="font-mono text-indigo-300 font-bold text-xs min-w-14 text-right">
              {filters.historicalHourOffset === 11 
                ? 'Now' 
                : `-${(11 - filters.historicalHourOffset) * 2}h ago`}
            </span>
          </div>
        )}
      </div>

      <div className="w-full border-t border-slate-800/70 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mr-1.5 hidden sm:inline">
            Locations
          </span>
          {STATES.map(state => (
            <button
              key={state}
              onClick={() => setFilters(prev => ({ ...prev, state }))}
              className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all ${
                filters.state === state
                  ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200 shadow-sm shadow-indigo-900/30'
                  : 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-slate-600 hover:text-white'
              }`}
            >
              {state}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
