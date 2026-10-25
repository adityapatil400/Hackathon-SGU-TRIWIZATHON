import React, { useState } from 'react';
import {
  Building,
  Store,
  HelpCircle,
  Edit3,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { AllocationLine, Product, Warehouse, Retailer, InventoryBatch } from '../../types';
import { ShelfLifeIndicator } from './ShelfLifeIndicator';
import { useTranslation } from '../../context/TranslationContext';

interface PlanCardItemProps {
  line: AllocationLine;
  product?: Product;
  warehouse?: Warehouse;
  retailer?: Retailer;
  batch?: InventoryBatch;
  onExplain: (line: AllocationLine) => void;
  onEdit: (line: AllocationLine) => void;
  onApprove: (lineId: string) => void;
  isApproving?: boolean;
}

export const PlanCardItem: React.FC<PlanCardItemProps> = ({
  line,
  product,
  warehouse,
  retailer,
  batch,
  onExplain,
  onEdit,
  onApprove,
  isApproving = false,
}) => {
  const { t, formatCurrency, formatNumber } = useTranslation();
  const [copiedSku, setCopiedSku] = useState(false);

  const handleCopySku = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(line.sku);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  const statusMap: Record<string, { label: string; className: string }> = {
    PROPOSED: {
      label: t('proposed') || 'PROPOSED',
      className: 'bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] font-semibold',
    },
    APPROVED: {
      label: t('reserved') || 'RESERVED',
      className: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] font-semibold',
    },
    OVERRIDDEN: {
      label: t('modified') || 'MODIFIED',
      className: 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] font-semibold',
    },
    STALE: {
      label: t('stale') || '409 STALE',
      className: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-bold animate-pulse',
    },
    DISPATCHED: {
      label: t('dispatched') || 'DISPATCHED',
      className: 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] font-semibold',
    },
    CANCELLED: {
      label: t('cancelled') || 'CANCELLED',
      className: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
    },
    EXPIRED: {
      label: t('expired') || 'EXPIRED',
      className: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
    },
  };
  const statusConfig = statusMap[line.status] || {
    label: line.status,
    className: 'bg-[#FAF3E0] text-[#64748B] border border-[#E7E5E4]',
  };

  const expiryDate = batch?.expiryDate;

  return (
    <div
      className={`p-4 rounded-xl border transition-all space-y-3 bg-white ${
        line.status === 'STALE'
          ? 'border-[#FECACA] bg-[#FEF2F2]/30'
          : line.status === 'OVERRIDDEN'
          ? 'border-[#BFDBFE] bg-[#EFF6FF]/30'
          : line.status === 'APPROVED'
          ? 'border-[#BBF7D0] bg-[#F0FDF4]/30'
          : 'border-[#E7E5E4] hover:border-[#2563EB]/40 hover:shadow-xs'
      }`}
    >
      {/* Card Header: Route & Status */}
      <div className="flex items-start justify-between gap-2 border-b border-[#E7E5E4] pb-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E293B]">
            <Building className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
            <span>{warehouse?.city || line.warehouseId} Hub</span>
            <span className="text-[#64748B]">→</span>
            <Store className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
            <span className="truncate max-w-[150px]">{retailer?.name || line.retailerId}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#64748B]">
            <span>{retailer?.city}</span>
            <span>•</span>
            <span className="text-[#2563EB] font-semibold uppercase">Class {retailer?.serviceClass}</span>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 font-mono ${statusConfig.className}`}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Product & SKU Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h4 className="text-xs font-bold text-[#1E293B] truncate" title={product?.name}>
            {product?.name || line.sku}
          </h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleCopySku}
              type="button"
              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#1E293B] bg-[#FFF8E7] hover:bg-[#FAF3E0] px-2 py-0.5 rounded border border-[#E7E5E4] transition-colors whitespace-nowrap cursor-pointer select-all"
              title="Click to copy SKU code"
            >
              <span>{line.sku}</span>
              {copiedSku ? (
                <Check className="w-3 h-3 text-[#15803D]" />
              ) : (
                <Copy className="w-3 h-3 text-[#64748B]" />
              )}
            </button>
            <span className="font-mono text-[10px] text-[#64748B] bg-[#FAF3E0] px-1.5 py-0.5 rounded border border-[#E7E5E4] whitespace-nowrap">
              {line.batchNo}
            </span>
            {expiryDate && (
              <span className="font-mono text-[10px] text-[#EAB308] bg-[#FEF9C3] px-1.5 py-0.5 rounded border border-[#FEF08A] whitespace-nowrap font-bold">
                Exp: {expiryDate}
              </span>
            )}
          </div>
        </div>

        {/* Shelf Life Gauge */}
        <div className="shrink-0 text-center">
          <ShelfLifeIndicator
            percentage={line.shelfLifeOnArrivalPct}
            minThresholdPct={retailer?.minShelfLifePct ? Math.round(retailer.minShelfLifePct * 100) : 70}
            daysRemaining={line.explanation?.shelfLifeDaysRemaining}
            compact
          />
        </div>
      </div>

      {/* Quantitative Details Grid */}
      <div className="grid grid-cols-3 gap-2 bg-[#FFF8E7]/60 p-2.5 rounded-lg border border-[#E7E5E4] text-center">
        <div>
          <span className="text-[10px] text-[#64748B] block font-medium">{t('cases') || 'Cases'}</span>
          <span className="text-xs font-black text-[#1E293B] font-mono">{formatNumber(line.cases)} cs</span>
          <span className="text-[9px] text-[#64748B] block">({formatNumber(line.units)} u)</span>
        </div>
        <div>
          <span className="text-[10px] text-[#64748B] block font-medium">{t('freightCost') || 'Freight'}</span>
          <span className="text-xs font-bold text-[#1E293B] font-mono">{formatCurrency(line.freightRupees)}</span>
        </div>
        <div>
          <span className="text-[10px] text-[#64748B] block font-medium">Arrival ETA</span>
          <span className="text-xs font-semibold text-[#64748B] font-mono">{line.arrivalDate}</span>
        </div>
      </div>

      {/* Overridden Callout if present */}
      {line.override && (
        <div className="text-[10px] text-[#2563EB] bg-[#EFF6FF] p-1.5 rounded border border-[#BFDBFE] flex items-center justify-between">
          <span>Overridden: {line.override.originalCases}cs → {line.override.newCases}cs</span>
          <span className="text-[#64748B] truncate max-w-[140px] italic">"{line.override.reason}"</span>
        </div>
      )}

      {/* Card Actions Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E7E5E4]">
        {/* Informational Explain Button */}
        <button
          type="button"
          onClick={() => onExplain(line)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-colors cursor-pointer shadow-xs"
          title="Inspect explainable AI reasoning and value tiers"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>{t('explain') || 'Explain'}</span>
        </button>

        {/* Secondary Edit / Override Button */}
        <button
          type="button"
          onClick={() => onEdit(line)}
          className="p-1.5 rounded-lg text-[#1E293B] hover:text-[#2563EB] bg-white hover:bg-[#FAF3E0] border border-[#E7E5E4] hover:border-[#2563EB] transition-colors cursor-pointer shadow-xs"
          title="Override quantity with mandatory justification"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#64748B]" />
        </button>

        {/* Primary Action Approve Button: Red */}
        {line.status !== 'APPROVED' && line.status !== 'STALE' && (
          <button
            type="button"
            onClick={() => onApprove(line.id)}
            disabled={isApproving}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            title="Approve line and reserve stock atomically"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('approve') || 'Approve'}</span>
          </button>
        )}

        {line.status === 'APPROVED' && (
          <span className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#15803D] bg-[#F0FDF4] px-2 py-1 rounded-lg border border-[#BBF7D0]">
            <Check className="w-3 h-3 text-[#15803D]" /> {t('locked') || 'Locked'}
          </span>
        )}
      </div>
    </div>
  );
};

