import React, { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, MessageSquare, Send } from 'lucide-react';

interface FeedbackDialogProps {
  isOpen: boolean;
  alertId: string;
  isUseful: boolean;
  onClose: () => void;
  onSubmit: (alertId: string, isUseful: boolean, reason: string) => void;
}

const PRESET_USEFUL_REASONS = [
  'Confirmed skimming apparatus recovered on site',
  'Mule account verified with fraudulent KYC',
  'Rapid cash-out pattern matches syndicate playbook #CS-409',
  'High-value unauthorized withdrawal confirmed by victim'
];

const PRESET_FALSE_REASONS = [
  'Authorized bank technician scheduled ATM cassette servicing',
  'Legitimate merchant bulk cash withdrawal',
  'Optical sensor false alarm due to ambient sunlight glare',
  'Customer card mechanical chip read retry'
];

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  isOpen,
  alertId,
  isUseful,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const presets = isUseful ? PRESET_USEFUL_REASONS : PRESET_FALSE_REASONS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(alertId, isUseful, reason || (isUseful ? 'Confirmed useful threat signal' : 'Marked false positive'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-5 shadow-2xl text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            {isUseful ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center">
                <ThumbsUp className="w-4 h-4 text-emerald-400" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-700 flex items-center justify-center">
                <ThumbsDown className="w-4 h-4 text-red-400" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {isUseful ? 'Confirm True Positive Feedback' : 'Report False Positive Feedback'}
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                API /feedback • Model Reinforcement Loop
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="text-[11px] text-slate-300 font-semibold block mb-1.5">
              Select or Enter Reason:
            </label>
            <div className="space-y-1.5 mb-2.5">
              {presets.map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setReason(p)}
                  className={`w-full text-left p-2 rounded-lg border text-[11px] transition-colors ${
                    reason === p
                      ? 'bg-indigo-950/80 border-indigo-600 text-indigo-200 font-medium'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Or write custom investigation note..."
              className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all ${
                isUseful ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit to /feedback</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
