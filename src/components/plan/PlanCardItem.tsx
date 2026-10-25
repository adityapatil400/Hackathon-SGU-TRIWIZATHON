import React, { useState } from 'react';
import {
  Building,
  Store,
  HelpCircle,
  Edit3,
  CheckCircle2,
  Copy,
  Check,
  Calendar
} from 'lucide-react';
import { AllocationLine, Product, Warehouse, Retailer, InventoryBatch } from '../../types';
import { ShelfLifeIndicator } from './ShelfLifeIndicator';

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
  const [copiedSku, setCopiedSku] = useState(false);

  const handleCopySku = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(line.sku);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  const statusMap: Record<string, { label: string; className: string }> = {
    PROPOSED: {
      label: 'PROPOSED',
      className: 'bg-[#F8F7F5] text-[#78716C] border border-[#E7E5E4]',
    },
    APPROVED: {
      label: 'RESERVED',
      className: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] font-semibold',
    },
    OVERRIDDEN: {
      label: 'MODIFIED',
      className: 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] font-semibold',
    },
    STALE: {
      label: '409 STALE',
      className: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] font-bold animate-pulse',
    },
    DISPATCHED: {
      label: 'DISPATCHED',
      className: 'bg-[#E9D8C8]/60 text-[#8B5E3C] border border-[#8B5E3C]/30 font-semibold',
    },
    CANCELLED: {
      label: 'CANCELLED',
      className: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
    },
    EXPIRED: {
      label: 'EXPIRED',
      className: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
    },
  };
  const statusConfig = statusMap[line.status] || {
    label: line.status,
    className: 'bg-[#F8F7F5] text-[#78716C] border border-[#E7E5E4]',
  };

  const expiryDate = batch?.expiryDate;

  return (
    <div
      className={`p-4 rounded-xl border transition-all space-y-3 bg-white ${
        line.status === 'STALE'
          ? 'border-amber-300 bg-amber-50/20'
          : line.status === 'OVERRIDDEN'
          ? 'border-blue-300 bg-blue-50/15'
          : line.status === 'APPROVED'
          ? 'border-emerald-300 bg-emerald-50/15'
          : 'border-[#E7E5E4] hover:border-[#8B5E3C]/60 hover:shadow-xs'
      }`}
    >
      {/* Card Header: Route & Status */}
      <div className="flex items-start justify-between gap-2 border-b border-[#E7E5E4] pb-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#292524]">
            <Building className="w-3.5 h-3.5 text-[#8B5E3C] shrink-0" />
            <span>{warehouse?.city || line.warehouseId} Hub</span>
            <span className="text-[#78716C]">→</span>
            <Store className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
            <span className="truncate max-w-[150px]">{retailer?.name || line.retailerId}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#78716C]">
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
          <h4 className="text-xs font-bold text-[#292524] truncate" title={product?.name}>
            {product?.name || line.sku}
          </h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleCopySku}
              type="button"
              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#292524] bg-[#F8F7F5] hover:bg-[#E9D8C8]/60 px-2 py-0.5 rounded border border-[#E7E5E4] transition-colors whitespace-nowrap cursor-pointer select-all"
              title="Click to copy SKU code"
            >
              <span>{line.sku}</span>
              {copiedSku ? (
                <Check className="w-3 h-3 text-[#15803D]" />
              ) : (
                <Copy className="w-3 h-3 text-[#78716C]" />
              )}
            </button>
            <span className="font-mono text-[10px] text-[#78716C] bg-[#F8F7F5] px-1.5 py-0.5 rounded border border-[#E7E5E4] whitespace-nowrap">
              {line.batchNo}
            </span>
            {expiryDate && (
              <span className="font-mono text-[10px] text-[#8B5E3C] bg-[#E9D8C8]/50 px-1.5 py-0.5 rounded border border-[#8B5E3C]/30 whitespace-nowrap">
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
      <div className="grid grid-cols-3 gap-2 bg-[#F8F7F5] p-2.5 rounded-lg border border-[#E7E5E4] text-center">
        <div>
          <span className="text-[10px] text-[#78716C] block font-medium">Cases</span>
          <span className="text-xs font-black text-[#292524] font-mono">{line.cases} cs</span>
          <span className="text-[9px] text-[#78716C] block">({line.units} u)</span>
        </div>
        <div>
          <span className="text-[10px] text-[#78716C] block font-medium">Route Freight</span>
          <span className="text-xs font-bold text-[#8B5E3C] font-mono">₹{line.freightRupees}</span>
        </div>
        <div>
          <span className="text-[10px] text-[#78716C] block font-medium">Arrival ETA</span>
          <span className="text-xs font-semibold text-[#78716C] font-mono">{line.arrivalDate}</span>
        </div>
      </div>

      {/* Overridden Callout if present */}
      {line.override && (
        <div className="text-[10px] text-[#2563EB] bg-[#EFF6FF] p-1.5 rounded border border-[#BFDBFE] flex items-center justify-between">
          <span>Overridden: {line.override.originalCases}cs → {line.override.newCases}cs</span>
          <span className="text-[#78716C] truncate max-w-[140px] italic">"{line.override.reason}"</span>
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
          <span>Explain</span>
        </button>

        {/* Secondary Edit / Override Button */}
        <button
          type="button"
          onClick={() => onEdit(line)}
          className="p-1.5 rounded-lg text-[#292524] hover:text-[#8B5E3C] bg-white hover:bg-[#E9D8C8]/40 border border-[#8B5E3C]/40 hover:border-[#8B5E3C] transition-colors cursor-pointer shadow-xs"
          title="Override quantity with mandatory justification"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#8B5E3C]" />
        </button>

        {/* Primary Action Approve Button */}
        {line.status !== 'APPROVED' && line.status !== 'STALE' && (
          <button
            type="button"
            onClick={() => onApprove(line.id)}
            disabled={isApproving}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            title="Approve line and reserve stock atomically"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve</span>
          </button>
        )}

        {line.status === 'APPROVED' && (
          <span className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#15803D] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
            <Check className="w-3 h-3 text-[#15803D]" /> Locked
          </span>
        )}
      </div>
    </div>
  );
};
