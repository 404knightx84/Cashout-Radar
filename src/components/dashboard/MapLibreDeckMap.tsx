import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ColumnLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { getH3BoundaryCoordinates } from '../../services/h3Service';
import { 
  Layers, 
  Flame, 
  Box, 
  Crosshair, 
  Plus, 
  Minus, 
  Compass, 
  AlertTriangle,
  Building,
  Info
} from 'lucide-react';
import type { ATMPoint, H3Zone, FilterState } from '../../types';

interface MapLibreDeckMapProps {
  zones: H3Zone[];
  atms: ATMPoint[];
  filters: FilterState;
  isHistoricalMode: boolean;
  onSelectZone: (zone: H3Zone) => void;
  onSelectAtm: (atm: ATMPoint) => void;
  selectedZoneIndex?: string;
  selectedAtmId?: string;
}

const CITY_COORDINATES: Record<string, [number, number, number]> = {
  'Mumbai': [72.8777, 19.0760, 11],
  'Delhi': [77.2090, 28.6139, 11],
  'Bengaluru': [77.5946, 12.9716, 11.5],
  'Hyderabad': [78.4867, 17.3850, 11.5],
  'Kolkata': [88.3639, 22.5726, 11.5],
  'Chennai': [80.2707, 13.0827, 11.5],
  'Maharashtra': [72.8777, 19.0760, 11],
  'Karnataka': [75.7139, 14.5204, 7.2],
  'Telangana': [79.0193, 18.1124, 7.4],
  'Tamil Nadu': [78.6569, 11.1271, 7.2],
  'West Bengal': [87.8550, 22.9868, 7.2],
  'Gujarat': [71.1924, 22.2587, 7.2],
  'All States': [78.9629, 20.5937, 4.8],
};

const OPENSTREETMAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'openstreetmap-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'openstreetmap-raster-layer',
      type: 'raster',
      source: 'openstreetmap-raster',
    },
  ],
};

export const MapLibreDeckMap: React.FC<MapLibreDeckMapProps> = ({
  zones,
  atms,
  filters,
  isHistoricalMode,
  onSelectZone,
  onSelectAtm,
  selectedZoneIndex,
  selectedAtmId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);

  // Layer toggles
  const [showH3Zones, setShowH3Zones] = useState(true);
  const [showAtms, setShowAtms] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [enable3dExtrusion, setEnable3dExtrusion] = useState(true);

  // Tooltip state
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    type: 'zone' | 'atm';
    data: any;
  } | null>(null);

  // Filtered dataset
  const filteredZones = useMemo(() => {
    return zones.filter(zone => {
      if (filters.state !== 'All States' && zone.state !== filters.state && zone.city !== filters.state) {
        return false;
      }
      if (filters.crimeType !== 'All Crime Types' && zone.primaryCrimeType !== filters.crimeType) {
        return false;
      }
      return true;
    });
  }, [zones, filters.state, filters.crimeType]);

  const filteredAtms = useMemo(() => {
    return atms.filter(atm => {
      if (filters.state !== 'All States' && atm.state !== filters.state && atm.city !== filters.state) {
        return false;
      }
      if (filters.amountMin > 0 && atm.dailyVolume < filters.amountMin) {
        return false;
      }
      return true;
    });
  }, [atms, filters.state, filters.amountMin]);

  const getZonePolygon = (zone: H3Zone): [number, number][] => {
    if (zone.boundary.length >= 6) return zone.boundary;
    const h3Boundary = getH3BoundaryCoordinates(zone.h3Index);
    return h3Boundary.length >= 6 ? h3Boundary : zone.boundary;
  };

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OPENSTREETMAP_STYLE,
      center: [72.8777, 19.0760], // default Mumbai
      zoom: 11,
      pitch: 45,
      bearing: -15,
      attributionControl: { compact: true },
    });

    const overlay = new MapboxOverlay({
      layers: [],
    });

    map.addControl(overlay as any);

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Update map center when state filter changes
  useEffect(() => {
    if (!mapRef.current) return;
    const target = CITY_COORDINATES[filters.state] ?? [78.9629, 20.5937, 4.8];
    mapRef.current.flyTo({
      center: [target[0], target[1]],
      zoom: target[2],
      pitch: 45,
      essential: true,
      duration: 1800,
    });
  }, [filters.state]);

  // Construct Deck.gl Layers
  useEffect(() => {
    if (!overlayRef.current) return;

    const layers = [];

    // 1. Heatmap Layer (/heatmap endpoint)
    if (showHeatmap) {
      layers.push(
        new HeatmapLayer({
          id: 'atm-heatmap-layer',
          data: filteredAtms,
          getPosition: (d: ATMPoint) => [d.longitude, d.latitude],
          getWeight: (d: ATMPoint) => (d.riskScore / 100) * (d.incidentCount + 1.5) * 5,
          radiusPixels: 45,
          intensity: 2.5,
          threshold: 0.05,
          colorRange: [
            [30, 41, 59, 0],
            [14, 165, 233, 160],
            [34, 197, 94, 180],
            [234, 179, 8, 210],
            [249, 115, 22, 230],
            [239, 68, 68, 255],
          ],
        })
      );
    }

    // 2. H3 Hexagon Risk Layer (5.2 deck.gl Zone probabilities)
    if (showH3Zones) {
      layers.push(
        new ColumnLayer({
          id: 'h3-risk-columns',
          data: filteredZones,
          diskResolution: 6,
          radius: 1550,
          pickable: true,
          extruded: true,
          elevationScale: 1,
          getPosition: (d: H3Zone) => [d.center[1], d.center[0]],
          getElevation: (d: H3Zone) => {
            const prob = isHistoricalMode
              ? (d.historicalProbabilities[filters.historicalHourOffset]?.probability || d.riskProbability)
              : d.riskProbability;
            return prob * (d.activeAlertsCount > 0 ? 2600 : 1400);
          },
          getFillColor: (d: H3Zone) => {
            const prob = isHistoricalMode
              ? (d.historicalProbabilities[filters.historicalHourOffset]?.probability || d.riskProbability)
              : d.riskProbability;
            if (selectedZoneIndex === d.h3Index) return [129, 140, 248, 180];
            if (prob >= 0.8) return [239, 68, 68, 145];
            if (prob >= 0.65) return [249, 115, 22, 135];
            if (prob >= 0.45) return [234, 179, 8, 120];
            return [16, 185, 129, 95];
          },
          getLineColor: [255, 255, 255, 180],
          onClick: (info) => {
            if (info.object) onSelectZone(info.object as H3Zone);
          },
          updateTriggers: {
            getElevation: [isHistoricalMode, filters.historicalHourOffset, enable3dExtrusion],
            getFillColor: [selectedZoneIndex, isHistoricalMode, filters.historicalHourOffset],
          },
        })
      );

      layers.push(
        new PolygonLayer({
          id: 'h3-risk-layer',
          data: filteredZones,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: enable3dExtrusion,
          wireframe: true,
          lineWidthMinPixels: 1.5,
          getPolygon: (d: H3Zone) => getZonePolygon(d),
          getElevation: (d: H3Zone) => {
            const prob = isHistoricalMode
              ? (d.historicalProbabilities[filters.historicalHourOffset]?.probability || d.riskProbability)
              : d.riskProbability;
            return prob * (d.activeAlertsCount > 0 ? 3200 : 1800);
          },
          getFillColor: (d: H3Zone) => {
            const prob = isHistoricalMode
              ? (d.historicalProbabilities[filters.historicalHourOffset]?.probability || d.riskProbability)
              : d.riskProbability;

            const isSelected = selectedZoneIndex === d.h3Index;

            if (isSelected) {
              return [99, 102, 241, 230]; // Indigo highlight
            }

            if (prob >= 0.8) {
              return [239, 68, 68, 175]; // Critical red
            } else if (prob >= 0.65) {
              return [249, 115, 22, 160]; // High orange
            } else if (prob >= 0.45) {
              return [234, 179, 8, 140]; // Medium amber
            } else {
              return [16, 185, 129, 90]; // Low emerald
            }
          },
          getLineColor: (d: H3Zone) => {
            if (selectedZoneIndex === d.h3Index) {
              return [255, 255, 255, 255];
            }
            return [255, 255, 255, 150];
          },
          onHover: (info) => {
            if (info.object) {
              setHoverInfo({
                x: info.x,
                y: info.y,
                type: 'zone',
                data: info.object,
              });
            } else {
              setHoverInfo(prev => (prev?.type === 'zone' ? null : prev));
            }
          },
          onClick: (info) => {
            if (info.object) {
              onSelectZone(info.object as H3Zone);
            }
          },
          updateTriggers: {
            getFillColor: [selectedZoneIndex, isHistoricalMode, filters.historicalHourOffset],
            getElevation: [isHistoricalMode, filters.historicalHourOffset, enable3dExtrusion],
            getLineColor: [selectedZoneIndex],
          },
        })
      );
    }

    // 3. ATM Points Layer (5.1 Base map with ATM points)
    if (showAtms) {
      layers.push(
        new ScatterplotLayer({
          id: 'atm-points-layer',
          data: filteredAtms,
          pickable: true,
          opacity: 0.9,
          stroked: true,
          filled: true,
          radiusScale: 6,
          radiusMinPixels: 6,
          radiusMaxPixels: 24,
          lineWidthMinPixels: 2,
          getPosition: (d: ATMPoint) => [d.longitude, d.latitude],
          getRadius: (d: ATMPoint) => {
            if (d.status === 'Compromised') return 16;
            if (d.riskLevel === 'CRITICAL') return 14;
            if (d.riskLevel === 'HIGH') return 10;
            return 7;
          },
          getFillColor: (d: ATMPoint) => {
            const isSelected = selectedAtmId === d.id;
            if (isSelected) return [255, 255, 255, 255];

            if (d.status === 'Compromised') {
              return [239, 68, 68, 250]; // Red
            }
            if (d.riskLevel === 'CRITICAL') {
              return [225, 29, 72, 230]; // Rose red
            }
            if (d.riskLevel === 'HIGH') {
              return [249, 115, 22, 210]; // Orange
            }
            if (d.riskLevel === 'MEDIUM') {
              return [234, 179, 8, 190]; // Amber
            }
            return [34, 197, 94, 180]; // Green
          },
          getLineColor: (d: ATMPoint) => {
            if (d.hasSkimmerReport || d.hasTamperAlert) {
              return [255, 255, 255, 255];
            }
            return [15, 23, 42, 200];
          },
          onHover: (info) => {
            if (info.object) {
              setHoverInfo({
                x: info.x,
                y: info.y,
                type: 'atm',
                data: info.object,
              });
            } else {
              setHoverInfo(prev => (prev?.type === 'atm' ? null : prev));
            }
          },
          onClick: (info) => {
            if (info.object) {
              onSelectAtm(info.object as ATMPoint);
            }
          },
          updateTriggers: {
            getFillColor: [selectedAtmId],
            getRadius: [selectedAtmId],
          },
        })
      );
    }

    overlayRef.current.setProps({ layers });
  }, [
    filteredZones,
    filteredAtms,
    showH3Zones,
    showAtms,
    showHeatmap,
    enable3dExtrusion,
    selectedZoneIndex,
    selectedAtmId,
    isHistoricalMode,
    filters.historicalHourOffset,
  ]);

  // Controls Handlers
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetNorth = () => {
    mapRef.current?.resetNorthPitch({ duration: 800 });
  };
  const handleToggle3D = () => {
    if (!mapRef.current) return;
    const currentPitch = mapRef.current.getPitch();
    mapRef.current.easeTo({
      pitch: currentPitch > 20 ? 0 : 55,
      duration: 1000,
    });
    setEnable3dExtrusion(prev => !prev);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Tactical Layer Toggles */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-800 shadow-2xl text-xs">
        <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Layers & Overlays</span>
        </div>

        <button
          onClick={() => setShowH3Zones(prev => !prev)}
          className={`flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg transition-colors ${
            showH3Zones
              ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <Box className="w-3.5 h-3.5" />
            <span>H3 Risk Hexagons</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${showH3Zones ? 'bg-indigo-400' : 'bg-slate-600'}`} />
        </button>

        <button
          onClick={() => setShowAtms(prev => !prev)}
          className={`flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg transition-colors ${
            showAtms
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5" />
            <span>ATM Terminals</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${showAtms ? 'bg-emerald-400' : 'bg-slate-600'}`} />
        </button>

        <button
          onClick={() => setShowHeatmap(prev => !prev)}
          className={`flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg transition-colors ${
            showHeatmap
              ? 'bg-red-950/80 text-red-300 border border-red-700/60'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Heatmap</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${showHeatmap ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
        </button>
      </div>

      {/* Floating Map Navigation Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl text-slate-300">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleToggle3D}
          className={`p-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ${
            enable3dExtrusion ? 'text-indigo-400 bg-indigo-950/40' : ''
          }`}
          title="Toggle 3D Extrusion & Pitch"
        >
          <Box className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetNorth}
          className="p-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Reset North"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 shadow-xl text-[11px] flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-400">Risk Probability:</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span className="text-slate-300">Critical (&gt;80%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
          <span className="text-slate-300">High (65-80%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
          <span className="text-slate-300">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-slate-300">Normal</span>
        </div>
      </div>

      {/* Interactive Tooltip on Hover */}
      {hoverInfo && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs w-64"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          {hoverInfo.type === 'zone' ? (
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="font-bold text-slate-200 truncate pr-2">
                  {hoverInfo.data.zoneName}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    hoverInfo.data.riskProbability >= 0.8
                      ? 'bg-red-950 text-red-400 border border-red-800/80'
                      : hoverInfo.data.riskProbability >= 0.65
                      ? 'bg-orange-950 text-orange-400 border border-orange-800/80'
                      : 'bg-emerald-950 text-emerald-400'
                  }`}
                >
                  {Math.round(
                    (isHistoricalMode
                      ? hoverInfo.data.historicalProbabilities[filters.historicalHourOffset]?.probability || hoverInfo.data.riskProbability
                      : hoverInfo.data.riskProbability) * 100
                  )}% Risk
                </span>
              </div>

              <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">H3 Cell:</span>
                  <span className="font-mono text-indigo-300">{hoverInfo.data.h3Index}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Primary Modus:</span>
                  <span className="font-medium text-amber-300">{hoverInfo.data.primaryCrimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Monitored ATMs:</span>
                  <span>{hoverInfo.data.atmCount} terminals</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Alerts:</span>
                  <span className="font-bold text-red-400">{hoverInfo.data.activeAlertsCount} active</span>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-indigo-400 italic text-center">
                Click zone polygon to open Drill-Down Panel
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="font-bold text-slate-200">
                  {hoverInfo.data.terminalId}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    hoverInfo.data.status === 'Compromised'
                      ? 'bg-red-950 text-red-400 border border-red-800'
                      : hoverInfo.data.riskLevel === 'CRITICAL'
                      ? 'bg-red-950 text-red-400'
                      : 'bg-emerald-950 text-emerald-400'
                  }`}
                >
                  {hoverInfo.data.status}
                </span>
              </div>

              <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                <div className="flex items-center gap-1 font-medium text-slate-200">
                  <Building className="w-3 h-3 text-slate-400" />
                  <span>{hoverInfo.data.bankName}</span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">{hoverInfo.data.address}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-400">Risk Score:</span>
                  <span className="font-bold text-amber-400">{hoverInfo.data.riskScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">24h Cash Volume:</span>
                  <span className="font-mono">₹{hoverInfo.data.dailyVolume.toLocaleString('en-IN')}</span>
                </div>
                {hoverInfo.data.hasSkimmerReport && (
                  <div className="flex items-center gap-1 text-red-400 font-semibold text-[10px] mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Optical Skimmer Attachment Flagged</span>
                  </div>
                )}
              </div>

              <div className="mt-2 text-[10px] text-emerald-400 italic text-center">
                Click marker to view terminal telemetry
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
