import React from 'react';
import { CheckCircle2, X, ShieldCheck } from 'lucide-react';
import { PlanRun } from '../../types';

interface ApproveAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planRun: PlanRun;
  isProcessing?: boolean;
}

export const ApproveAllModal: React.FC<ApproveAllModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  planRun,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  const totalLines = planRun.lines.length;
  const pendingLines = planRun.lines.filter(l => l.status === 'PROPOSED').length;
  const totalUnits = planRun.lines.reduce((acc, l) => acc + (l.units || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 text-[#292524]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#15803D]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#292524]">Approve & Reserve Allocation Plan</h3>
              <p className="text-xs text-[#78716C] font-mono">{planRun.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-[#78716C] hover:text-[#292524] p-1 rounded-lg hover:bg-[#F8F7F5] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Impact Summary Metrics */}
        <div className="grid grid-cols-3 gap-2.5 bg-[#F8F7F5] p-3.5 rounded-xl border border-[#E7E5E4] text-center">
          <div>
            <span className="text-[10px] text-[#78716C] font-semibold uppercase tracking-wider block">Lines to Lock</span>
            <span className="text-lg font-black text-[#292524] font-mono">{pendingLines} of {totalLines}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#78716C] font-semibold uppercase tracking-wider block">Total Volume</span>
            <span className="text-lg font-black text-[#8B5E3C] font-mono">{planRun.totalCases} cs</span>
            <span className="text-[9px] text-[#78716C] block">({totalUnits.toLocaleString()} units)</span>
          </div>
          <div>
            <span className="text-[10px] text-[#78716C] font-semibold uppercase tracking-wider block">Route Freight</span>
            <span className="text-lg font-black text-[#8B5E3C] font-mono">₹{planRun.totalFreightRupees.toLocaleString()}</span>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-start gap-2.5 text-xs text-[#1E40AF]">
          <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Approving this plan will atomically commit inventory reservations across all candidate batches. Warehouse inventory versions will increment, and stock will be locked for transport dispatch under Four-Eyes approval policies.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7E5E4]">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-[#292524] bg-white border border-[#8B5E3C] hover:bg-[#E9D8C8]/50 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <span>Reserving Inventory...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Lock Allocation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
