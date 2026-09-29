import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  AlertOctagon, 
  ShieldAlert, 
  IndianRupee, 
  Building2, 
  ChevronRight,
  PieChart as PieIcon
} from 'lucide-react';
import type { H3Zone, AlertItem } from '../../types';

interface ZoneAnalyticsPanelsProps {
  zones: H3Zone[];
  alerts: AlertItem[];
  onSelectZone: (zone: H3Zone) => void;
  selectedZoneIndex?: string;
}

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#6366f1', '#a855f7', '#06b6d4'];

export const ZoneAnalyticsPanels: React.FC<ZoneAnalyticsPanelsProps> = ({
  zones,
  alerts,
  onSelectZone,
  selectedZoneIndex,
}) => {
  // Top 5 Risk Zones sorted by probability
  const topZones = useMemo(() => {
    return [...zones]
      .sort((a, b) => b.riskProbability - a.riskProbability)
      .slice(0, 6);
  }, [zones]);

  // Data for Top Zones Bar Chart
  const topZonesChartData = useMemo(() => {
    return topZones.map(z => ({
      name: z.zoneName.split(' ')[0] + ' ' + (z.zoneName.split(' ')[1] || ''),
      shortName: z.zoneName.length > 18 ? z.zoneName.substring(0, 16) + '...' : z.zoneName,
      probability: Math.round(z.riskProbability * 100),
      alerts: z.activeAlertsCount,
      raw: z,
    }));
  }, [topZones]);

  // Alert Count over time (last 12 hours)
  const alertTimelineData = useMemo(() => {
    const hours = ['12h ago', '10h ago', '8h ago', '6h ago', '4h ago', '2h ago', '1h ago', 'Now'];
    return hours.map((hour, idx) => ({
      hour,
      alerts: Math.floor(2 + Math.sin(idx * 0.8) * 4 + idx * 1.2),
      critical: idx > 4 ? Math.floor(1 + (idx - 4) * 1.5) : 0,
    }));
  }, []);

  // Crime Type Distribution
  const crimeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach(a => {
      counts[a.crimeType] = (counts[a.crimeType] || 0) + 1;
    });
    // Fallback if low alerts
    if (Object.keys(counts).length < 3) {
      counts['Mule Cash-Out'] = 8;
      counts['ATM Skimming'] = 5;
      counts['Card Cloning'] = 4;
      counts['Cash Trapping'] = 3;
      counts['Physical Tampering'] = 2;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [alerts]);

  // Key KPI Metrics
  const metrics = useMemo(() => {
    const criticalZonesCount = zones.filter(z => z.riskLevel === 'CRITICAL').length;
    const totalAlertsCount = alerts.filter(a => a.status !== 'RESOLVED' && a.status !== 'FALSE_POSITIVE').length;
    const totalValueAtRisk = alerts.reduce((acc, a) => acc + (a.suspectedAmount || 0), 0);
    const totalAtms = zones.reduce((acc, z) => acc + z.atmCount, 0);

    return {
      criticalZonesCount,
      totalAlertsCount,
      totalValueAtRisk,
      totalAtms,
    };
  }, [zones, alerts]);

  return (
    <div className="flex flex-col gap-3.5 p-3.5 bg-slate-950/90 text-slate-200 h-full overflow-y-auto border-l border-slate-800/80 custom-scrollbar">
      {/* 4 Quick KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-red-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Critical Zones</span>
            <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-xl font-extrabold text-red-400 mt-1">
            {metrics.criticalZonesCount}
          </div>
          <span className="text-[10px] text-slate-500">Risk &gt; 80%</span>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-amber-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Active Alerts</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-amber-400 mt-1">
            {metrics.totalAlertsCount}
          </div>
          <span className="text-[10px] text-slate-500">Real-time incident feed</span>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-indigo-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Value At Risk</span>
            <IndianRupee className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-base font-extrabold text-indigo-300 mt-1 font-mono">
            ₹{(metrics.totalValueAtRisk / 100000).toFixed(1)}L
          </div>
          <span className="text-[10px] text-slate-500">Suspected illicit flows</span>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Monitored ATMs</span>
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-200 mt-1">
            {metrics.totalAtms}
          </div>
          <span className="text-[10px] text-slate-500">Across 22 H3 Cells</span>
        </div>
      </div>

      {/* Panel 1: Top Risk Zones (Bar Chart) */}
      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/90 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <TrendingUp className="w-3.5 h-3.5 text-red-400" />
            <span>Top Risk Threat Corridors</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Recharts /zones</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topZonesChartData}
              layout="vertical"
              margin={{ top: 4, right: 10, left: 2, bottom: 4 }}
              onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.raw) {
                  onSelectZone(e.activePayload[0].payload.raw);
                }
              }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="shortName"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                width={85}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2 rounded text-xs shadow-xl">
                        <p className="font-bold text-slate-100">{data.raw.zoneName}</p>
                        <p className="text-red-400 font-semibold">Risk: {data.probability}%</p>
                        <p className="text-amber-400">Active Alerts: {data.alerts}</p>
                        <p className="text-slate-400 text-[10px] mt-1">Click to drill down</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="probability" 
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
              >
                {topZonesChartData.map((entry, index) => {
                  const isSelected = selectedZoneIndex === entry.raw.h3Index;
                  const fill = isSelected 
                    ? '#6366f1' 
                    : entry.probability >= 80 
                    ? '#ef4444' 
                    : entry.probability >= 65 
                    ? '#f97316' 
                    : '#eab308';
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Clickable Quick List */}
        <div className="mt-2 space-y-1">
          {topZones.slice(0, 3).map(zone => (
            <button
              key={zone.h3Index}
              onClick={() => onSelectZone(zone)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-all text-left ${
                selectedZoneIndex === zone.h3Index
                  ? 'bg-indigo-950/80 border border-indigo-700 text-indigo-200'
                  : 'bg-slate-950/50 hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="truncate pr-2">
                <span className="font-medium">{zone.zoneName.split(' - ')[0]}</span>
                <span className="text-[10px] text-slate-500 block truncate">{zone.primaryCrimeType}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-red-400">{Math.round(zone.riskProbability * 100)}%</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel 2: Alert Count Over Time (Area Chart) */}
      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/90 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
            <span>Alert Influx Volume (12h Trend)</span>
          </div>
        </div>

        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={alertTimelineData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="critGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 9 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', borderRadius: '6px' }}
              />
              <Area type="monotone" dataKey="alerts" stroke="#f59e0b" fillOpacity={1} fill="url(#alertGradient)" name="Total Alerts" />
              <Area type="monotone" dataKey="critical" stroke="#ef4444" fillOpacity={1} fill="url(#critGradient)" name="Critical" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Panel 3: Crime Type Breakdown (Donut Chart) */}
      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/90 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <PieIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Modus Operandi Breakdown</span>
          </div>
        </div>

        <div className="h-36 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={crimeDistribution}
                innerRadius={32}
                outerRadius={52}
                paddingAngle={4}
                dataKey="value"
              >
                {crimeDistribution.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', borderRadius: '6px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[10px] mt-1">
          {crimeDistribution.map((item, idx) => (
            <div key={item.name} className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
              <span className="text-slate-300 truncate">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
