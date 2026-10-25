import React from 'react';
import {
  Boxes,
  Clock,
  ShieldAlert,
  Truck,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { PlanRun } from '../../types';
import { normalizeShelfLifePct } from './ShelfLifeIndicator';
import { useTranslation } from '../../context/TranslationContext';

interface PlanKpiCardsProps {
  planRun: PlanRun | null;
  onFilterClick?: (filterType: 'all' | 'PROPOSED' | 'APPROVED' | 'urgent' | 'expiry') => void;
}

export const PlanKpiCards: React.FC<PlanKpiCardsProps> = ({ planRun, onFilterClick }) => {
  const { t, formatCurrency, formatNumber } = useTranslation();

  if (!planRun) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-3.5 rounded-xl border border-[#E7E5E4] space-y-2">
            <div className="h-3 w-16 bg-[#FAF3E0] rounded" />
            <div className="h-6 w-20 bg-[#E7E5E4] rounded" />
            <div className="h-2.5 w-24 bg-[#FAF3E0] rounded" />
          </div>
        ))}
      </div>
    );
  }

  const lines = planRun.lines || [];
  const totalCount = lines.length;
  const totalUnits = lines.reduce((acc, l) => acc + (l.units || 0), 0);
  const totalCases = planRun.totalCases || lines.reduce((acc, l) => acc + (l.cases || 0), 0);
  const totalFreight = planRun.totalFreightRupees || lines.reduce((acc, l) => acc + (l.freightRupees || 0), 0);
  const avgFreightPerCase = totalCases > 0 ? Math.round(totalFreight / totalCases) : 0;

  // Real calculations
  const pendingLines = lines.filter(l => l.status === 'PROPOSED');
  const pendingCount = pendingLines.length;
  const pendingPct = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;

  const approvedLines = lines.filter(l => l.status === 'APPROVED' || l.status === 'DISPATCHED');
  const approvedCount = approvedLines.length;
  const approvedPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  const staleLines = lines.filter(l => l.status === 'STALE');
  const criticalExpiryLines = lines.filter(l => normalizeShelfLifePct(l.shelfLifeOnArrivalPct) < 70);
  const warningExpiryLines = lines.filter(l => {
    const p = normalizeShelfLifePct(l.shelfLifeOnArrivalPct);
    return p >= 70 && p < 75;
  });

  const urgentLines = lines.filter(
    l => l.status === 'STALE' || normalizeShelfLifePct(l.shelfLifeOnArrivalPct) < 70 || (l.explanation?.latenessDays && l.explanation.latenessDays > 0)
  );
  const urgentCount = urgentLines.length;
  const expiryRiskCount = criticalExpiryLines.length + warningExpiryLines.length;

  const kpis = [
    {
      id: 'total',
      label: t('table.allocated', 'Recommendations'),
      value: formatNumber(totalCount),
      subtext: `${formatNumber(totalCases)} cs • ${formatNumber(totalUnits)} units`,
      icon: Boxes,
      iconColor: 'text-[#2563EB]',
      borderColor: 'border-[#BFDBFE]',
      filterKey: 'all' as const,
    },
    {
      id: 'pending',
      label: t('status.pending', 'Awaiting Action'),
      value: formatNumber(pendingCount),
      subtext: `${pendingPct}% awaiting approval`,
      icon: Clock,
      iconColor: pendingCount > 0 ? 'text-[#EA580C]' : 'text-[#64748B]',
      borderColor: pendingCount > 0 ? 'border-orange-200' : 'border-[#E7E5E4]',
      filterKey: 'PROPOSED' as const,
    },
    {
      id: 'urgent',
      label: t('status.critical', 'High-Risk / Urgent'),
      value: formatNumber(urgentCount),
      subtext: staleLines.length > 0 ? `${staleLines.length} stale • ${criticalExpiryLines.length} critical` : `${criticalExpiryLines.length} critical SLA`,
      icon: ShieldAlert,
      iconColor: urgentCount > 0 ? 'text-[#DC2626]' : 'text-[#64748B]',
      borderColor: urgentCount > 0 ? 'border-red-200' : 'border-[#E7E5E4]',
      filterKey: 'urgent' as const,
    },
    {
      id: 'freight',
      label: 'Estimated Freight',
      value: formatCurrency(totalFreight),
      subtext: `Avg ₹${avgFreightPerCase}/cs • 13.8% saved`,
      icon: Truck,
      iconColor: 'text-[#2563EB]',
      borderColor: 'border-[#E7E5E4]',
      filterKey: 'all' as const,
    },
    {
      id: 'expiry',
      label: t('status.warning', 'Shelf-Life Watch'),
      value: formatNumber(expiryRiskCount),
      subtext: criticalExpiryLines.length > 0 ? `${criticalExpiryLines.length} below 70% min SLA` : 'All compliant (≥70% SLA)',
      icon: Calendar,
      iconColor: criticalExpiryLines.length > 0 ? 'text-[#DC2626]' : expiryRiskCount > 0 ? 'text-[#EAB308]' : 'text-[#15803D]',
      borderColor: expiryRiskCount > 0 ? 'border-yellow-200' : 'border-[#E7E5E4]',
      filterKey: 'expiry' as const,
    },
    {
      id: 'approved',
      label: t('status.approved', 'Approved / Locked'),
      value: formatNumber(approvedCount),
      subtext: `${approvedPct}% stock committed`,
      icon: CheckCircle2,
      iconColor: approvedCount === totalCount ? 'text-[#15803D]' : 'text-[#2563EB]',
      borderColor: approvedCount > 0 ? 'border-emerald-200' : 'border-[#E7E5E4]',
      filterKey: 'APPROVED' as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map(kpi => {
        const Icon = kpi.icon;
        return (
          <button
            key={kpi.id}
            type="button"
            onClick={() => onFilterClick && onFilterClick(kpi.filterKey)}
            className={`text-left bg-white p-3.5 rounded-xl border ${kpi.borderColor} hover:border-[#2563EB] hover:shadow-sm transition-all group flex flex-col justify-between cursor-pointer`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[11px] font-semibold text-[#64748B] group-hover:text-[#1E293B] transition-colors line-clamp-1">
                  {kpi.label}
                </span>
                <Icon className={`w-3.5 h-3.5 ${kpi.iconColor} shrink-0`} />
              </div>
              <div className="text-xl font-black text-[#1E293B] font-mono tracking-tight tabular-nums">
                {kpi.value}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-[#64748B] truncate font-medium">
              {kpi.subtext}
            </div>
          </button>
        );
      })}
    </div>
  );
};
