import React from 'react';
import { CheckCircle2, X, ShieldCheck } from 'lucide-react';
import { PlanRun } from '../../types';
import { useTranslation } from '../../context/TranslationContext';

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
  const { t, formatCurrency, formatNumber } = useTranslation();

  if (!isOpen) return null;

  const totalLines = planRun.lines.length;
  const pendingLines = planRun.lines.filter(l => l.status === 'PROPOSED').length;
  const totalUnits = planRun.lines.reduce((acc, l) => acc + (l.units || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 text-[#1E293B]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#15803D]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1E293B]">{t('confirmApprovalTitle') || 'Approve & Reserve Allocation Plan'}</h3>
              <p className="text-xs text-[#64748B] font-mono">{planRun.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-lg hover:bg-[#FAF3E0] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Impact Summary Metrics */}
        <div className="grid grid-cols-3 gap-2.5 bg-[#FFF8E7]/60 p-3.5 rounded-xl border border-[#E7E5E4] text-center">
          <div>
            <span className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider block">Lines to Lock</span>
            <span className="text-lg font-black text-[#1E293B] font-mono">{pendingLines} of {totalLines}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider block">{t('totalVolume') || 'Total Volume'}</span>
            <span className="text-lg font-black text-[#1E293B] font-mono">{formatNumber(planRun.totalCases)} cs</span>
            <span className="text-[9px] text-[#64748B] block">({formatNumber(totalUnits)} units)</span>
          </div>
          <div>
            <span className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider block">{t('freightCost') || 'Route Freight'}</span>
            <span className="text-lg font-black text-[#2563EB] font-mono">{formatCurrency(planRun.totalFreightRupees)}</span>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-start gap-2.5 text-xs text-[#1E40AF]">
          <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {t('confirmApprovalBody') || 'Approving this plan will atomically commit inventory reservations across all candidate batches. Warehouse inventory versions will increment, and stock will be locked for transport dispatch.'}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7E5E4]">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-[#1E293B] bg-white border border-[#E7E5E4] hover:bg-[#FAF3E0] rounded-xl transition-colors cursor-pointer"
          >
            {t('cancel') || 'Cancel'}
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
                <span>{t('confirmAndLock') || 'Confirm & Lock Allocation'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

