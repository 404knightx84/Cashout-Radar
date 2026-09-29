import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { 
  GitFork, 
  UserCheck, 
  Building2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Lock, 
  Unlock, 
  AlertCircle, 
  ArrowRight,
  IndianRupee,
  Layers,
  X,
  FileText
} from 'lucide-react';
import type { CaseData, RoleType, MuleNode, MuleEdge } from '../../types';
import { apiService } from '../../services/apiService';
import { lookupNetworkIntel, type NetworkIntel } from '../../services/networkIntelService';

interface MuleChainGraphProps {
  caseData: CaseData;
  role: RoleType;
  setRole: (role: RoleType) => void;
  onOpenEvidenceDossier: (caseId: string) => void;
  onClose?: () => void;
}

export const MuleChainGraph: React.FC<MuleChainGraphProps> = ({
  caseData,
  role,
  setRole,
  onOpenEvidenceDossier,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [selectedNode, setSelectedNode] = useState<MuleNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<MuleEdge | null>(null);
  const [layoutName, setLayoutName] = useState<'breadthfirst' | 'cose' | 'concentric'>('breadthfirst');
  const [freezeNotice, setFreezeNotice] = useState<string | null>(null);
  const [networkIntel, setNetworkIntel] = useState<NetworkIntel | null>(null);
  const [networkIntelLoading, setNetworkIntelLoading] = useState(false);

  useEffect(() => {
    const ip = selectedNode?.deviceIp;
    if (!ip || ip.includes('PROTECTED')) {
      setNetworkIntel(null);
      return;
    }

    let cancelled = false;
    setNetworkIntelLoading(true);
    lookupNetworkIntel(ip)
      .then(result => {
        if (!cancelled) setNetworkIntel(result);
      })
      .catch(() => {
        if (!cancelled) setNetworkIntel(null);
      })
      .finally(() => {
        if (!cancelled) setNetworkIntelLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedNode?.deviceIp]);

  // Initialize and update Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    // Transform nodes according to role
    const cyNodes = caseData.nodes.map(n => {
      const isBank = role === 'BANK_COMPLIANCE';
      const displayName = isBank ? n.maskedAccountHolder : n.accountHolder;
      const displayAcc = isBank ? n.maskedAccountNumber : n.accountNumber;

      return {
        data: {
          id: n.id,
          label: `${displayName}\n${displayAcc}`,
          type: n.type,
          raw: n,
        },
      };
    });

    const cyEdges = caseData.edges.map(e => ({
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        amount: e.amount,
        channel: e.channel,
        label: e.amount > 0 ? `₹${(e.amount / 1000).toFixed(0)}k (${e.channel})` : e.channel,
        raw: e,
      },
    }));

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#f8fafc',
            'font-size': '11px',
            'font-family': 'ui-sans-serif, system-ui',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-wrap': 'wrap',
            'text-max-width': '120px',
            'text-background-color': '#090d16',
            'text-background-opacity': 0.85,
            'text-background-padding': '3px',
            'text-border-color': '#334155',
            'text-border-width': 1,
            'text-border-opacity': 0.6,
            'width': 44,
            'height': 44,
            'border-width': 2.5,
          },
        },
        {
          selector: 'node[type = "victim"]',
          style: {
            'shape': 'ellipse',
            'background-color': '#8b5cf6',
            'border-color': '#c4b5fd',
          },
        },
        {
          selector: 'node[type = "mule_tier1"]',
          style: {
            'shape': 'round-rectangle',
            'background-color': '#f59e0b',
            'border-color': '#fde68a',
          },
        },
        {
          selector: 'node[type = "mule_tier2"]',
          style: {
            'shape': 'round-rectangle',
            'background-color': '#f97316',
            'border-color': '#fed7aa',
          },
        },
        {
          selector: 'node[type = "atm_cashout"]',
          style: {
            'shape': 'hexagon',
            'background-color': '#ef4444',
            'border-color': '#fca5a5',
          },
        },
        {
          selector: 'node[type = "crypto_exit"]',
          style: {
            'shape': 'diamond',
            'background-color': '#06b6d4',
            'border-color': '#a5f3fc',
          },
        },
        {
          selector: 'node[type = "ringleader"]',
          style: {
            'shape': 'octagon',
            'background-color': '#991b1b',
            'border-color': '#f87171',
          },
        },
        {
          selector: 'edge',
          style: {
            'label': 'data(label)',
            'color': '#e2e8f0',
            'font-size': '10px',
            'font-family': 'ui-monospace, monospace',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#f59e0b',
            'line-color': '#f59e0b',
            'width': 2.5,
            'text-background-color': '#0f172a',
            'text-background-opacity': 0.9,
            'text-background-padding': '2px',
            'text-border-color': '#475569',
            'text-border-width': 1,
            'arrow-scale': 1.2,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#60a5fa',
            'border-width': 4,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#60a5fa',
            'target-arrow-color': '#60a5fa',
            'width': 4,
          },
        },
      ],
      layout: getLayoutOptions(layoutName),
    });

    // Node click handler
    cy.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data('raw') as MuleNode;
      setSelectedNode(nodeData);
      setSelectedEdge(null);
    });

    // Edge click handler
    cy.on('tap', 'edge', (evt) => {
      const edgeData = evt.target.data('raw') as MuleEdge;
      setSelectedEdge(edgeData);
      setSelectedNode(null);
    });

    // Background click to deselect
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [caseData, role, layoutName]);

  function getLayoutOptions(name: 'breadthfirst' | 'cose' | 'concentric') {
    if (name === 'breadthfirst') {
      return {
        name: 'breadthfirst',
        directed: true,
        roots: ['#node-victim-1', '#node-ringleader'],
        padding: 40,
        spacingFactor: 1.3,
      };
    }
    if (name === 'cose') {
      return {
        name: 'cose',
        animate: false,
        padding: 40,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
      };
    }
    return {
      name: 'concentric',
      padding: 40,
      minNodeSpacing: 60,
    };
  }

  // Freeze account action
  const handleToggleFreeze = async (nodeId: string) => {
    try {
      const res = await apiService.toggleAccountFreeze(nodeId);
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode({ ...selectedNode, frozen: res.frozen });
      }
      setFreezeNotice(
        res.frozen 
          ? `Section 91 CrPC Freeze Order Executed. Funds secured: ₹${selectedNode?.balance.toLocaleString('en-IN')}` 
          : 'Account Unfrozen by Officer Authority.'
      );
      setTimeout(() => setFreezeNotice(null), 4000);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleFit = () => cyRef.current?.fit(undefined, 30);
  const handleZoomIn = () => {
    if (!cyRef.current) return;
    cyRef.current.zoom(cyRef.current.zoom() * 1.25);
  };
  const handleZoomOut = () => {
    if (!cyRef.current) return;
    cyRef.current.zoom(cyRef.current.zoom() * 0.8);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 select-none overflow-hidden relative">
      {/* Top Bar: Case Metadata + Role Masking Switch + Layout controls */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center">
            <GitFork className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-100">
                {caseData.caseId}
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                {caseData.status}
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                API /accounts/chain
              </span>
            </div>
            <h2 className="text-xs font-semibold text-slate-300 truncate max-w-md mt-0.5">
              {caseData.title}
            </h2>
          </div>
        </div>

        {/* Center / Right Controls: Role Selector (6.2) & Layout Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Masking Toggle Button */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-700/80">
            <button
              onClick={() => setRole('OFFICER')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                role === 'OFFICER'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full Law Enforcement Access: Unmasked names & bank accounts"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Officer (Unmasked)</span>
            </button>

            <button
              onClick={() => setRole('BANK_COMPLIANCE')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                role === 'BANK_COMPLIANCE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Bank Compliance Role: Regulatory PII masking"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-300" />
              <span>Bank Role (Masked PII)</span>
            </button>
          </div>

          {/* Layout buttons */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-700/80 text-xs">
            <button
              onClick={() => setLayoutName('breadthfirst')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                layoutName === 'breadthfirst' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hierarchical
            </button>
            <button
              onClick={() => setLayoutName('cose')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                layoutName === 'cose' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Force / Physics
            </button>
          </div>

          {/* Evidence Dossier Jump Button */}
          <button
            onClick={() => onOpenEvidenceDossier(caseData.caseId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950/40 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300" />
            <span>Generate Evidence PDF</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Cytoscape Canvas Area */}
      <div className="flex-1 relative bg-slate-950">
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Controls: Zoom & Fit */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl text-slate-300">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFit}
            className="p-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Graph Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 shadow-xl text-[11px] space-y-1.5">
          <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider">
            Network Entities:
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Victim Account</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500" />
              <span>Tier 1 Mule</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-orange-500" />
              <span>Tier 2 Mule</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500" />
              <span>ATM Cash-Out Terminal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rotate-45 bg-cyan-500" />
              <span>Crypto P2P Exit</span>
            </div>
          </div>
        </div>

        {/* Freeze Notice Toast */}
        {freezeNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-emerald-950/95 border border-emerald-500 text-emerald-200 px-4 py-2 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>{freezeNotice}</span>
          </div>
        )}

        {/* Node Inspector Sidebar (Appears when node is clicked) */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-xs animate-slideLeft">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-200 text-sm">Account Inspector</span>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Account Holder:</span>
                <div className="font-bold text-slate-100 text-sm">
                  {role === 'BANK_COMPLIANCE' ? selectedNode.maskedAccountHolder : selectedNode.accountHolder}
                </div>
                <div className="font-mono text-indigo-300 text-xs mt-0.5">
                  {role === 'BANK_COMPLIANCE' ? selectedNode.maskedAccountNumber : selectedNode.accountNumber}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Bank Entity</span>
                  <span className="font-semibold text-slate-200">
                    {role === 'BANK_COMPLIANCE' ? selectedNode.maskedBankName : selectedNode.bankName}
                  </span>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">IFSC Code</span>
                  <span className="font-mono text-slate-200">
                    {role === 'BANK_COMPLIANCE' ? selectedNode.maskedIfsc : selectedNode.ifsc}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Current Balance</span>
                <span className="text-base font-extrabold text-amber-400 font-mono">
                  ₹{selectedNode.balance.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  KYC Status: {selectedNode.kycStatus}
                </span>
              </div>

              {selectedNode.deviceIp && (
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">IP / Geolocation Telemetry:</span>
                  <span className="font-mono text-xs text-indigo-400">{selectedNode.deviceIp}</span>
                  {selectedNode.location && (
                    <span className="text-[10px] text-slate-400 block">{selectedNode.location}</span>
                  )}
                  {networkIntelLoading && (
                    <span className="text-[10px] text-slate-500 block mt-1">Checking supplied threat feeds...</span>
                  )}
                  {!networkIntelLoading && networkIntel && (
                    <div className="mt-1.5 space-y-1">
                      {networkIntel.isTorExit && (
                        <span className="block text-[10px] font-bold text-red-400">Tor exit node listed</span>
                      )}
                      {networkIntel.cloudProvider && (
                        <span className="block text-[10px] text-amber-300">
                          {networkIntel.cloudProvider} range{networkIntel.cloudRegion ? ` · ${networkIntel.cloudRegion}` : ''}
                        </span>
                      )}
                      {!networkIntel.isTorExit && !networkIntel.cloudProvider && (
                        <span className="block text-[10px] text-emerald-400">No Tor or cloud range match</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Freeze Account Action */}
              <div className="pt-2">
                {selectedNode.type !== 'victim' && selectedNode.type !== 'atm_cashout' && (
                  <button
                    onClick={() => handleToggleFreeze(selectedNode.id)}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold transition-all ${
                      selectedNode.frozen
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40'
                    }`}
                  >
                    {selectedNode.frozen ? (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Revoke Section 91 Freeze</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Freeze Account (Sec 91 CrPC)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edge Inspector Sidebar */}
        {selectedEdge && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-xs animate-slideLeft">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-200 text-sm">Transaction Hop Details</span>
              <button
                onClick={() => setSelectedEdge(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Transfer Channel</span>
                <div className="font-bold text-amber-300 text-sm mt-0.5">
                  {selectedEdge.channel}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Transaction Amount</span>
                <div className="text-lg font-extrabold text-slate-100 font-mono flex items-center mt-0.5">
                  <IndianRupee className="w-4 h-4 text-amber-400" />
                  <span>{selectedEdge.amount.toLocaleString('en-IN')}</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Time: {selectedEdge.timestamp}
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Bank Reference Hash:</span>
                <span className="font-mono text-[11px] text-indigo-300 break-all block mt-0.5">
                  {selectedEdge.referenceHash}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
