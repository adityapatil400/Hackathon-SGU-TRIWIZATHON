import React from 'react';
import { X, CheckCircle2, AlertTriangle, Truck, Layers, ShieldCheck, HelpCircle } from 'lucide-react';
import { ReasonCard } from '../types';

interface ReasonCardModalProps {
  card: ReasonCard | null;
  onClose: () => void;
  onApproveLine?: () => void;
}

export const ReasonCardModal: React.FC<ReasonCardModalProps> = ({ card, onClose, onApproveLine }) => {
  if (!card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl overflow-hidden my-8 text-[#292524]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F8F7F5] border-b border-[#E7E5E4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#292524] flex items-center gap-2">
                <span>AI Allocation Reason Card</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-[#15803D] border border-emerald-200">
                  FR-10 Explainable Allocation
                </span>
              </h3>
              <p className="text-xs text-[#78716C]">{card.skuName} → {card.retailerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white border border-[#E7E5E4] hover:bg-[#F8F7F5] text-[#78716C] hover:text-[#292524] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Executive Summary Callout */}
          <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
            <div className="text-xs font-bold text-[#2563EB] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Planner Explanation</span>
            </div>
            <p className="text-sm font-medium text-[#1E3A8A] leading-relaxed">
              {card.summary}
            </p>
          </div>

          {/* Demand & Inventory Position */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#F8F7F5] p-3 rounded-xl border border-[#E7E5E4]">
              <span className="text-[11px] text-[#78716C] font-medium">Demand Median (q50)</span>
              <p className="text-lg font-bold text-[#292524] mt-0.5 font-mono">{card.demandMedian} units</p>
              <span className="text-[10px] text-[#78716C]">7-day cycle total</span>
            </div>

            <div className="bg-[#F8F7F5] p-3 rounded-xl border border-[#E7E5E4]">
              <span className="text-[11px] text-[#78716C] font-medium">95th Percentile (q95)</span>
              <p className="text-lg font-bold text-[#2563EB] mt-0.5 font-mono">{card.demandP95} units</p>
              <span className="text-[10px] text-[#2563EB]">Peak demand coverage</span>
            </div>

            <div className="bg-[#F8F7F5] p-3 rounded-xl border border-[#E7E5E4]">
              <span className="text-[11px] text-[#78716C] font-medium">Stock After Transit</span>
              <p className="text-lg font-bold text-[#292524] mt-0.5 font-mono">{card.effectiveStockBefore} units</p>
              <span className="text-[10px] text-[#78716C]">On-hand minus lead time</span>
            </div>

            <div className="bg-[#F8F7F5] p-3 rounded-xl border border-[#E7E5E4]">
              <span className="text-[11px] text-[#78716C] font-medium">Allocated</span>
              <p className="text-lg font-bold text-[#15803D] mt-0.5 font-mono">{card.casesAllocated} cases</p>
              <span className="text-[10px] text-[#15803D] font-medium">{card.unitsAllocated} units</span>
            </div>
          </div>

          {/* Marginal Value Tiers Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-[#292524] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#8B5E3C]" />
                <span>Marginal Value Tiers (Why Shipping Stopped Here)</span>
              </h4>
              <span className="text-[11px] text-[#78716C]">Objective: Expected Margin &gt; Freight + Holding</span>
            </div>

            <div className="rounded-xl border border-[#E7E5E4] overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E7E5E4] bg-[#F8F7F5] text-[#78716C]">
                    <th className="py-2.5 px-3 font-semibold">Tier</th>
                    <th className="py-2.5 px-3 font-semibold">Prob (This Week)</th>
                    <th className="py-2.5 px-3 font-semibold">Expected Margin</th>
                    <th className="py-2.5 px-3 font-semibold">Freight + Holding</th>
                    <th className="py-2.5 px-3 font-semibold">Net Value (₹)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4]">
                  {card.marginalTiers.map((tier, idx) => (
                    <tr
                      key={idx}
                      className={tier.allocated ? 'hover:bg-[#F8F7F5]/60' : 'bg-red-50/20 text-[#78716C]'}
                    >
                      <td className="py-2.5 px-3 font-medium text-[#292524]">{tier.tier} ({tier.caseRange} units)</td>
                      <td className="py-2.5 px-3 text-[#78716C] font-mono">{tier.probThisCycle}%</td>
                      <td className="py-2.5 px-3 text-[#15803D] font-semibold font-mono">₹{tier.expectedMarginRupees}</td>
                      <td className="py-2.5 px-3 text-[#D97706] font-mono">₹{tier.freightAndHoldingRupees}</td>
                      <td className="py-2.5 px-3 font-bold font-mono">
                        <span className={tier.netValueRupees > 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}>
                          ₹{tier.netValueRupees}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {tier.allocated ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#15803D] border border-emerald-200">
                            SHIPPED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-[#DC2626] border border-red-200">
                            CUTOFF
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cutoff highlight */}
            <div className="mt-2 text-xs text-[#292524] bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <span>{card.cutoffReason}</span>
            </div>
          </div>

          {/* Shelf Life on Arrival */}
          <div className="p-4 rounded-xl bg-[#F8F7F5] border border-[#E7E5E4] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#292524] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                <span>Shelf Life on Arrival Check (FR-09 Hard Constraint)</span>
              </span>
              <span className="text-[#15803D] font-bold font-mono">
                {card.shelfLifeOnArrivalPct}% (Store Min: {card.minRequiredShelfLifePct}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[#E7E5E4] overflow-hidden">
              <div
                className="h-full bg-[#15803D] rounded-full"
                style={{ width: `${Math.min(100, card.shelfLifeOnArrivalPct)}%` }}
              />
            </div>

            <p className="text-[11px] text-[#78716C]">
              Batch retains {card.shelfLifeDaysRemaining} days remaining upon arrival. Delivery meets the retailer's 70% minimum freshness requirement and will not trigger kirana rejection waste.
            </p>
          </div>

          {/* Delivery-Time-Aware Sourcing Comparison */}
          {card.alternativeWarehouseCompared && (
            <div className="p-4 rounded-xl bg-[#F8F7F5] border border-[#E7E5E4]">
              <h4 className="text-xs font-bold text-[#292524] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#2563EB]" />
                <span>Alternative Warehouse Evaluated (Trade-off Matrix)</span>
              </h4>

              <div className="text-xs space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-white border border-[#E7E5E4]">
                  <span className="font-semibold text-[#292524]">Selected Source: {card.sourceWarehouseName}</span>
                  <span className="text-[#15803D] font-semibold">Optimal on-time arrival</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-white border border-[#E7E5E4]">
                  <span className="text-[#78716C]">Compared Source: {card.alternativeWarehouseCompared.warehouseName}</span>
                  <span className="text-[#D97706] font-semibold">Lateness penalty ₹{card.alternativeWarehouseCompared.latenessCostRupees}</span>
                </div>

                <p className="text-[11px] text-[#78716C] mt-1">
                  <strong className="text-[#292524]">Why not chosen:</strong> {card.alternativeWarehouseCompared.reasonNotChosen}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F8F7F5] border-t border-[#E7E5E4] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#292524] bg-white border border-[#8B5E3C] hover:bg-[#E9D8C8]/50 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          {onApproveLine && (
            <button
              onClick={() => {
                onApproveLine();
                onClose();
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve This Allocation Line</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
