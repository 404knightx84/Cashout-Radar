import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle, 
  ShieldCheck, 
  Copy, 
  FileText, 
  Building, 
  IndianRupee,
  Clock,
  QrCode
} from 'lucide-react';
import type { CaseData } from '../../types';

interface EvidenceDossierModalProps {
  caseData: CaseData;
  onClose: () => void;
}

export const EvidenceDossierModal: React.FC<EvidenceDossierModalProps> = ({
  caseData,
  onClose,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  const auditHash = caseData.auditHash || '7f9c2d1b8e4a5f6e3c0d9a8b7e6f5d4c3b2a1e0f9d8c7b6a5e4f3d2c1b0a9f8e';
  const qrVerificationUrl = caseData.qrCodeUrl || `https://cybercrime.gov.in/verify?case=${caseData.caseId}&hash=${auditHash}`;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(auditHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(caseData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${caseData.caseId}_evidence_manifest.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden my-auto">
        {/* Top Modal Bar (Excluded during printing) */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/80 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Evidentiary Case Dossier & Chain of Custody Report
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Evidence and verification
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-950/40 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON Manifest</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Court Dossier Body */}
        <div id="printable-dossier" className="p-8 flex-1 overflow-y-auto bg-white text-slate-900 font-sans custom-scrollbar">
          {/* Government Formal Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                  GOI
                </span>
                <span className="text-xs uppercase font-extrabold tracking-widest text-slate-600">
                  Government of India • Ministry of Home Affairs
                </span>
              </div>
              <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 mt-1">
                Forensic Incident & Mule Chain Evidence Dossier
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                National Cyber Crime Reporting Portal • Certified Digital Evidence under Sec 65B Indian Evidence Act
              </p>
            </div>

            {/* Dynamic QR Code (Requirement 6.3) */}
            <div className="flex flex-col items-center bg-slate-50 p-2 rounded-lg border border-slate-300 shadow-sm shrink-0">
              <QRCodeSVG
                value={qrVerificationUrl}
                size={82}
                level="H"
                includeMargin={false}
              />
              <span className="text-[8px] font-mono font-bold text-slate-500 mt-1 uppercase tracking-tighter">
                Scan To Verify Seal
              </span>
            </div>
          </div>

          {/* Cryptographic Audit Hash Banner (Requirement 6.3) */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-300 rounded-lg flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  SHA-256 Cryptographic Audit Hash (Chain of Custody Verifiable):
                </span>
                <span className="font-mono text-xs font-extrabold text-indigo-900 break-all select-all">
                  {auditHash}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyHash}
              className="no-print flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-300 shadow-xs"
            >
              {copiedHash ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Hash</span>
                </>
              )}
            </button>
          </div>

          {/* Case Metadata Table */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100 p-3.5 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Case Reference No:</span>
              <div className="font-mono font-bold text-slate-900">{caseData.caseId}</div>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Date of Incident:</span>
              <div className="font-semibold text-slate-800">{caseData.createdDate}</div>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Investigating Officer:</span>
              <div className="font-semibold text-slate-800">{caseData.assignedOfficer.name}</div>
              <span className="text-[10px] text-slate-500">{caseData.assignedOfficer.badgeNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Police Station / Unit:</span>
              <div className="font-semibold text-slate-800">{caseData.assignedOfficer.unit}</div>
            </div>
          </div>

          {/* Financial Recovery & Freeze Summary */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-[10px] font-bold text-red-700 uppercase">Total Defrauded Volume:</span>
              <div className="text-lg font-extrabold text-red-900 font-mono mt-0.5">
                ₹{caseData.totalDefraudedAmount.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Secured / Frozen (Sec 91 CrPC):</span>
              <div className="text-lg font-extrabold text-emerald-900 font-mono mt-0.5">
                ₹{caseData.frozenAmount.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-[10px] font-bold text-amber-700 uppercase">Recovery Rate:</span>
              <div className="text-lg font-extrabold text-amber-900 font-mono mt-0.5">
                {((caseData.frozenAmount / caseData.totalDefraudedAmount) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Section: Mule Accounts & Seizure Manifest */}
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-300">
              1. Identified Money Mule Accounts & Seizure Record
            </h3>
            <table className="w-full mt-2 text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase border-y border-slate-300">
                  <th className="py-2 px-2">Account Entity</th>
                  <th className="py-2 px-2">Holder / PAN</th>
                  <th className="py-2 px-2">Bank & IFSC</th>
                  <th className="py-2 px-2">Balance</th>
                  <th className="py-2 px-2">KYC Classification</th>
                  <th className="py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {caseData.nodes.map(node => (
                  <tr key={node.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2 font-mono font-bold text-slate-900">
                      {node.accountNumber}
                    </td>
                    <td className="py-2 px-2 font-medium text-slate-800">
                      {node.accountHolder}
                    </td>
                    <td className="py-2 px-2 text-slate-600">
                      {node.bankName} ({node.ifsc})
                    </td>
                    <td className="py-2 px-2 font-mono font-bold text-slate-900">
                      ₹{node.balance.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2 text-slate-600">
                      {node.kycStatus}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        node.frozen ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {node.frozen ? 'SEIZED / FROZEN' : 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section: Chronological Chain of Custody */}
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-300">
              2. Forensic Chronology & Evidentiary Action Log
            </h3>
            <div className="mt-2 space-y-2 text-xs">
              {caseData.timeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 bg-slate-50 rounded border border-slate-200">
                  <div className="font-mono text-slate-500 font-bold shrink-0 text-[11px]">
                    {item.time}
                  </div>
                  <div className="flex-1 text-slate-800 leading-snug">
                    {item.event}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold shrink-0">
                    {item.officer}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Officer Certification & Digital Signature Stamp */}
          <div className="mt-8 pt-4 border-t-2 border-slate-900 flex justify-between items-end">
            <div>
              <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm">
                Certified that the digital records, audit hashes, and node graph extractions above have been generated in compliance with regulatory cyber crime forensics standards.
              </p>
              <span className="text-[9px] font-mono text-slate-400 block mt-1">
                Verification Endpoint: {qrVerificationUrl}
              </span>
            </div>

            <div className="text-right">
              <div className="border border-indigo-900/30 bg-indigo-50/50 p-2.5 rounded-lg text-center inline-block">
                <span className="text-[9px] uppercase font-bold text-indigo-900 block">
                  DIGITALLY CERTIFIED & TIMESTAMPED
                </span>
                <div className="font-serif italic font-bold text-slate-900 text-sm mt-0.5">
                  {caseData.assignedOfficer.name}
                </div>
                <span className="text-[10px] font-mono text-slate-600 block">
                  {caseData.assignedOfficer.badgeNumber}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
