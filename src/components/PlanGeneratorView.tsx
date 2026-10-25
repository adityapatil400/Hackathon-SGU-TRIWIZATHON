import React, { useState, useMemo } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Edit3,
  HelpCircle,
  ShieldAlert,
  Boxes,
  Building,
  Store,
  Calendar,
  Check,
  Copy,
  ChevronLeft,
  ChevronRight,
  FilterX,
  X,
  ArrowUpDown,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PlanRun, AllocationLine, Product, Warehouse, Retailer, InventoryBatch } from '../types';
import { ReasonCardModal } from './ReasonCardModal';
import { ShelfLifeIndicator, normalizeShelfLifePct } from './plan/ShelfLifeIndicator';
import { PlanKpiCards } from './plan/PlanKpiCards';
import { PlanToolbar, PlanFilterState } from './plan/PlanToolbar';
import { PlanCardItem } from './plan/PlanCardItem';
import { ApproveAllModal } from './plan/ApproveAllModal';
import { useTranslation } from '../context/TranslationContext';

interface PlanGeneratorViewProps {
  planRun: PlanRun | null;
  onGeneratePlan: (simulateTimeout?: boolean) => void;
  onApproveAll: () => void;
  onApproveLine: (lineId: string) => void;
  onOverrideLine: (lineId: string, newCases: number, reason: string) => void;
  onSimulateStaleConflict: () => void;
  onReplanStaleLines: () => void;
  products: Product[];
  warehouses: Warehouse[];
  retailers: Retailer[];
  batches?: InventoryBatch[];
  isGenerating: boolean;
}

export const PlanGeneratorView: React.FC<PlanGeneratorViewProps> = ({
  planRun,
  onGeneratePlan,
  onApproveAll,
  onApproveLine,
  onOverrideLine,
  onSimulateStaleConflict,
  onReplanStaleLines,
  products,
  warehouses,
  retailers,
  batches,
  isGenerating,
}) => {
  const { t, formatCurrency, formatNumber } = useTranslation();

  // Modals & Popovers
  const [selectedReasonLine, setSelectedReasonLine] = useState<AllocationLine | null>(null);

  const [overrideModalLine, setOverrideModalLine] = useState<AllocationLine | null>(null);
  const [overrideCases, setOverrideCases] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideError, setOverrideError] = useState<string>('');
  const [isApproveAllOpen, setIsApproveAllOpen] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [copiedSkuId, setCopiedSkuId] = useState<string | null>(null);
  const [approvingLineId, setApprovingLineId] = useState<string | null>(null);

  // Filter & Toolbar State
  const [filters, setFilters] = useState<PlanFilterState>({
    searchQuery: '',
    warehouseId: 'all',
    retailerId: 'all',
    status: 'all',
    shelfLifeRisk: 'all',
    sortBy: 'default',
    viewMode: 'table',
    pageSize: 10,
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isBriefingExpanded, setIsBriefingExpanded] = useState<boolean>(true);

  // Helper to show transient toast message

  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleFilterChange = (partial: Partial<PlanFilterState>) => {
    setFilters(prev => ({ ...prev, ...partial }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      warehouseId: 'all',
      retailerId: 'all',
      status: 'all',
      shelfLifeRisk: 'all',
      sortBy: 'default',
      viewMode: filters.viewMode,
      pageSize: filters.pageSize,
    });
    setCurrentPage(1);
    triggerFeedback('Search and filter criteria reset to default.');
  };

  // KPI Card direct click handler
  const handleKpiFilterClick = (filterType: 'all' | 'PROPOSED' | 'APPROVED' | 'urgent' | 'expiry') => {
    if (filterType === 'all') {
      handleResetFilters();
    } else if (filterType === 'PROPOSED' || filterType === 'APPROVED') {
      handleFilterChange({ status: filterType, shelfLifeRisk: 'all', searchQuery: '' });
    } else if (filterType === 'expiry') {
      handleFilterChange({ shelfLifeRisk: 'warning', status: 'all', searchQuery: '' });
    } else if (filterType === 'urgent') {
      handleFilterChange({ shelfLifeRisk: 'critical', status: 'all', searchQuery: '' });
    }
  };

  // SKU Copy Handler
  const handleCopySku = (sku: string, lineId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sku);
    setCopiedSkuId(lineId);
    setTimeout(() => setCopiedSkuId(null), 2000);
  };

  // Override Modal Handlers
  const handleOpenOverride = (line: AllocationLine) => {
    setOverrideModalLine(line);
    setOverrideCases(line.cases);
    setOverrideReason(line.override?.reason || '');
    setOverrideError('');
  };

  const handleSaveOverride = () => {
    if (!overrideReason.trim()) {
      setOverrideError('Mandatory planner override justification is required (FR-11).');
      return;
    }
    if (overrideCases <= 0) {
      setOverrideError('Allocated cases must be greater than zero.');
      return;
    }
    if (overrideModalLine) {
      onOverrideLine(overrideModalLine.id, overrideCases, overrideReason);
      triggerFeedback(`Line ${overrideModalLine.id} quantity overridden to ${overrideCases} cases.`);
      setOverrideModalLine(null);
    }
  };

  // Single Line Approval Handler
  const handleApproveLineWithFeedback = async (lineId: string) => {
    setApprovingLineId(lineId);
    onApproveLine(lineId);
    setTimeout(() => {
      setApprovingLineId(null);
      triggerFeedback(`Allocation ${lineId} approved and stock reserved.`);
    }, 250);
  };

  // Bulk Approval Confirmation
  const handleConfirmApproveAll = () => {
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#DC2626', '#EA580C', '#2563EB', '#15803D'],
    });
    onApproveAll();
    setIsApproveAllOpen(false);
    triggerFeedback(`All ${planRun?.lines.length || 0} allocation lines approved and locked for dispatch.`);
  };

  // Multi-tier filtering & sorting
  const filteredAndSortedLines = useMemo(() => {
    if (!planRun) return [];
    let list = [...planRun.lines];

    // Search query
    const q = filters.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(line => {
        const prod = products.find(p => p.sku === line.sku);
        const wh = warehouses.find(w => w.id === line.warehouseId);
        const ret = retailers.find(r => r.id === line.retailerId);

        return (
          line.sku.toLowerCase().includes(q) ||
          line.id.toLowerCase().includes(q) ||
          line.batchNo.toLowerCase().includes(q) ||
          (prod?.name && prod.name.toLowerCase().includes(q)) ||
          (ret?.name && ret.name.toLowerCase().includes(q)) ||
          (ret?.city && ret.city.toLowerCase().includes(q)) ||
          (wh?.name && wh.name.toLowerCase().includes(q)) ||
          (wh?.city && wh.city.toLowerCase().includes(q))
        );
      });
    }

    // Warehouse filter
    if (filters.warehouseId !== 'all') {
      list = list.filter(line => line.warehouseId === filters.warehouseId);
    }

    // Retailer filter
    if (filters.retailerId !== 'all') {
      list = list.filter(line => line.retailerId === filters.retailerId);
    }

    // Status filter
    if (filters.status !== 'all') {
      list = list.filter(line => line.status === filters.status);
    }

    // Shelf Life filter
    if (filters.shelfLifeRisk !== 'all') {
      list = list.filter(line => {
        const pct = normalizeShelfLifePct(line.shelfLifeOnArrivalPct);
        if (filters.shelfLifeRisk === 'critical') return pct < 70;
        if (filters.shelfLifeRisk === 'warning') return pct >= 70 && pct < 75;
        if (filters.shelfLifeRisk === 'healthy') return pct >= 75;
        return true;
      });
    }

    // Sorting
    switch (filters.sortBy) {
      case 'freight_asc':
        list.sort((a, b) => a.freightRupees - b.freightRupees);
        break;
      case 'freight_desc':
        list.sort((a, b) => b.freightRupees - a.freightRupees);
        break;
      case 'cases_desc':
        list.sort((a, b) => b.cases - a.cases);
        break;
      case 'cases_asc':
        list.sort((a, b) => a.cases - b.cases);
        break;
      case 'shelf_life_asc':
        list.sort((a, b) => normalizeShelfLifePct(a.shelfLifeOnArrivalPct) - normalizeShelfLifePct(b.shelfLifeOnArrivalPct));
        break;
      case 'shelf_life_desc':
        list.sort((a, b) => normalizeShelfLifePct(b.shelfLifeOnArrivalPct) - normalizeShelfLifePct(a.shelfLifeOnArrivalPct));
        break;
      case 'product_asc':
        list.sort((a, b) => {
          const nameA = products.find(p => p.sku === a.sku)?.name || a.sku;
          const nameB = products.find(p => p.sku === b.sku)?.name || b.sku;
          return nameA.localeCompare(nameB);
        });
        break;
      case 'retailer_asc':
        list.sort((a, b) => {
          const nameA = retailers.find(r => r.id === a.retailerId)?.name || a.retailerId;
          const nameB = retailers.find(r => r.id === b.retailerId)?.name || b.retailerId;
          return nameA.localeCompare(nameB);
        });
        break;
      case 'warehouse_asc':
        list.sort((a, b) => {
          const whA = warehouses.find(w => w.id === a.warehouseId)?.city || a.warehouseId;
          const whB = warehouses.find(w => w.id === b.warehouseId)?.city || b.warehouseId;
          return whA.localeCompare(whB);
        });
        break;
      default:
        break;
    }

    return list;
  }, [planRun, filters, products, warehouses, retailers]);

  // Pagination slicing
  const totalFilteredCount = filteredAndSortedLines.length;
  const totalPages = Math.ceil(totalFilteredCount / filters.pageSize) || 1;
  const paginatedLines = useMemo(() => {
    const start = (currentPage - 1) * filters.pageSize;
    return filteredAndSortedLines.slice(start, start + filters.pageSize);
  }, [filteredAndSortedLines, currentPage, filters.pageSize]);

  const staleLines = planRun?.lines.filter(l => l.status === 'STALE') || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action Console */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-black text-[#1E293B] tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#2563EB]" />
              <span>{t('distributionAllocationMatrix') || 'Distribution Allocation Matrix'}</span>
            </h2>
            {planRun && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-mono ${
                  planRun.solverStatus !== 'TIMEOUT'
                    ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                    : 'bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]'
                }`}
              >
                {planRun.solverStatus}{planRun.solveSeconds !== undefined
                  ? ` · ${(planRun.solveSeconds * 1000).toFixed(2)} ms decision calculation`
                  : ' · timing not reported by API'}
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
            Greedy Marginal-Value Allocation • Value-Tier Objective • Hard Constraints: Zero Negative Stock, Shelf-Life on Arrival &ge; 70%, Store Storage Limits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Primary Action Button: Red */}
          <button
            type="button"
            onClick={() => onGeneratePlan(false)}
            disabled={isGenerating}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-all shadow-xs disabled:opacity-50 select-none cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-white" />
                <span>Computing Optimizations...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{t('runAllocationEngine') || 'Run Allocation Engine'}</span>
              </>
            )}
          </button>

          {planRun && planRun.lines.length > 0 && (
            <>
              {/* Primary / Attention Action Button: Red */}
              <button
                type="button"
                onClick={() => setIsApproveAllOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-all shadow-xs select-none cursor-pointer"
                title="Review and approve all recommended lines"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('approveAll') || 'Approve All'} ({planRun.lines.length} Lines)</span>
              </button>

              {/* Secondary Action Button: White with blue/neutral border */}
              <button
                type="button"
                onClick={onSimulateStaleConflict}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-xs text-[#1E293B] bg-white hover:bg-[#FAF3E0] border border-[#E7E5E4] hover:border-[#2563EB] transition-all select-none cursor-pointer"
                title="Simulate 409 conflict when warehouse inventory changes during planner review (FR-11, T9)"
              >
                <AlertTriangle className="w-4 h-4 text-[#EA580C]" />
                <span className="hidden sm:inline">{t('simulateConflict') || 'Simulate 409 Conflict'}</span>
                <span className="sm:hidden">409 Test</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action Feedback Notification Banner */}
      {actionFeedback && (
        <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between text-xs text-[#1E40AF] shadow-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span className="font-semibold">{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-[#64748B] hover:text-[#1E293B] p-0.5 rounded transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 409 Stale Conflict Warning Banner (FR-11, FR-11b) */}
      {staleLines.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-[#DC2626]">
                409 Snapshot Conflict Detected ({staleLines.length} line affected)
              </h4>
              <p className="text-xs text-[#64748B] mt-0.5">
                Warehouse inventory batch version changed during planner review (FR-11). Approval blocked for affected lines to prevent over-allocation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onReplanStaleLines}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-all shadow-xs whitespace-nowrap select-none cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('replanStaleLines') || '1-Click Re-plan Stale Lines (FR-11b)'}</span>
          </button>
        </div>
      )}

      {/* Section 2: Dashboard Summary KPIs */}
      <PlanKpiCards planRun={planRun} onFilterClick={handleKpiFilterClick} />

      {/* AI Executive Briefing & Ollama Causal Driver Insights */}
      {planRun && (planRun.executiveDispatchBriefing || (planRun.keyFeatureInsights && planRun.keyFeatureInsights.length > 0)) && (
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
                <Sparkles className="w-4 h-4 text-[#2563EB] animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#1E293B] tracking-tight">
                    Ollama Executive Dispatch Briefing &amp; Causal Intelligence
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF3E0] text-[#1E293B] border border-[#E7E5E4]">
                    Local LLM Active
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Synthesized trade-off rationales, inventory risk alerts, and causal drivers for warehouse managers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsBriefingExpanded(!isBriefingExpanded)}
              className="text-xs font-semibold text-[#64748B] hover:text-[#1E293B] px-2.5 py-1 rounded-lg bg-[#FFF8E7] hover:bg-[#FAF3E0] border border-[#E7E5E4] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{isBriefingExpanded ? 'Collapse' : 'Expand'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isBriefingExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isBriefingExpanded && (
            <div className="space-y-4 pt-2 border-t border-[#E7E5E4]">
              {planRun.executiveDispatchBriefing && (
                <div className="p-4 rounded-xl bg-[#FFF8E7]/50 border border-[#E7E5E4] text-xs text-[#1E293B] leading-relaxed font-sans">
                  {planRun.executiveDispatchBriefing}
                </div>
              )}

              {planRun.keyFeatureInsights && planRun.keyFeatureInsights.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
                    Key Causal Drivers &amp; Critical Store Risks
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {planRun.keyFeatureInsights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#FFF8E7]/30 border border-[#E7E5E4] space-y-2 hover:border-[#2563EB]/40 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-[#2563EB]">
                            {insight.store_id} • {insight.sku_id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            insight.risk_level === 'CRITICAL' || insight.urgency_rating === 'CRITICAL'
                              ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                              : 'bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]'
                          }`}>
                            {insight.risk_level || insight.urgency_rating || 'HIGH RISK'}
                          </span>
                        </div>
                        {insight.product_name && (
                          <div className="text-xs font-semibold text-[#1E293B] truncate">
                            {insight.product_name}
                          </div>
                        )}
                        {insight.causal_drivers && insight.causal_drivers.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {insight.causal_drivers.map((driver: string, dIdx: number) => (
                              <span
                                key={dIdx}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-white text-[#64748B] border border-[#E7E5E4]"
                              >
                                {driver}
                              </span>
                            ))}
                          </div>
                        )}
                        {insight.recommended_action && (
                          <p className="text-[11px] text-[#15803D] font-medium">
                            Action: {insight.recommended_action}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}


      {/* Section 3: Toolbar with Search, Filters, and Sorting */}
      <PlanToolbar

        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        warehouses={warehouses}
        retailers={retailers}
        totalResultsCount={planRun?.lines.length || 0}
        filteredCount={totalFilteredCount}
      />

      {/* Section 1 & 7: Allocation Table View vs Mobile Card Grid */}
      {isGenerating ? (
        // Loading Skeleton
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center space-y-4 shadow-xs">
          <div className="flex items-center justify-center gap-3 text-[#2563EB] font-semibold text-sm">
            <RotateCcw className="w-5 h-5 animate-spin" />
            <span>Optimizing multi-tier FMCG supply allocations across hubs...</span>
          </div>
          <div className="space-y-2 max-w-2xl mx-auto">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-[#FAF3E0] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : filteredAndSortedLines.length === 0 ? (
        // Empty Search / Filter State
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF8E7] border border-[#E7E5E4] flex items-center justify-center text-[#64748B] mx-auto">
            <FilterX className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1E293B]">No allocations match your filters</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            We couldn't find any allocation lines matching your current search query or active filter criteria. Try adjusting or clearing filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-all mt-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All Filters</span>
          </button>
        </div>
      ) : filters.viewMode === 'cards' ? (
        // Responsive Card Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginatedLines.map(line => {
            const wh = warehouses.find(w => w.id === line.warehouseId);
            const ret = retailers.find(r => r.id === line.retailerId);
            const prod = products.find(p => p.sku === line.sku);
            const batch = batches?.find(b => b.warehouseId === line.warehouseId && b.sku === line.sku && b.batchNo === line.batchNo);

            return (
              <PlanCardItem
                key={line.id}
                line={line}
                product={prod}
                warehouse={wh}
                retailer={ret}
                batch={batch}
                onExplain={setSelectedReasonLine}
                onEdit={handleOpenOverride}
                onApprove={handleApproveLineWithFeedback}
                isApproving={approvingLineId === line.id}
              />
            );
          })}
        </div>
      ) : (
        // High-Density Desktop Table View with Sticky Header & Non-Wrapping SKU
        <div className="rounded-2xl border border-[#E7E5E4] overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E7E5E4] bg-[#FAF3E0] text-[#64748B] font-bold uppercase tracking-wider text-[11px] sticky top-0 z-20 shadow-xs select-none">
                  <th className="py-3.5 px-4 min-w-[160px]">
                    <button
                      type="button"
                      onClick={() => handleFilterChange({ sortBy: filters.sortBy === 'warehouse_asc' ? 'default' : 'warehouse_asc' })}
                      className="inline-flex items-center gap-1.5 hover:text-[#1E293B] cursor-pointer transition-colors"
                      title="Sort by Warehouse Source"
                    >
                      <span>{t('warehouseSource') || 'Warehouse Source'}</span>
                      <ArrowUpDown className={`w-3 h-3 ${filters.sortBy === 'warehouse_asc' ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 min-w-[210px]">
                    <button
                      type="button"
                      onClick={() => handleFilterChange({ sortBy: filters.sortBy === 'retailer_asc' ? 'default' : 'retailer_asc' })}
                      className="inline-flex items-center gap-1.5 hover:text-[#1E293B] cursor-pointer transition-colors"
                      title="Sort by Store Management"
                    >
                      <span>{t('table.destination') || 'Store Management'}</span>
                      <ArrowUpDown className={`w-3 h-3 ${filters.sortBy === 'retailer_asc' ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 min-w-[230px]">
                    <button
                      type="button"
                      onClick={() => handleFilterChange({ sortBy: filters.sortBy === 'product_asc' ? 'default' : 'product_asc' })}
                      className="inline-flex items-center gap-1.5 hover:text-[#1E293B] cursor-pointer transition-colors"
                      title="Sort by Product SKU"
                    >
                      <span>{t('productSku') || 'Product SKU'}</span>
                      <ArrowUpDown className={`w-3 h-3 ${filters.sortBy === 'product_asc' ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 min-w-[170px]">{t('batchExpiry') || 'Batch & Expiry'}</th>
                  <th className="py-3.5 px-4 min-w-[130px] text-right">
                    <button
                      type="button"
                      onClick={() => handleFilterChange({ sortBy: filters.sortBy === 'cases_desc' ? 'cases_asc' : 'cases_desc' })}
                      className="inline-flex items-center gap-1.5 hover:text-[#1E293B] cursor-pointer transition-colors ml-auto"
                      title="Sort by Cases / Units"
                    >
                      <span>{t('casesUnits') || 'Cases & Units'}</span>
                      <ArrowUpDown className={`w-3 h-3 ${filters.sortBy.startsWith('cases') ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 min-w-[160px] text-center">
                    <button
                      type="button"
                      onClick={() => handleFilterChange({ sortBy: filters.sortBy === 'shelf_life_desc' ? 'shelf_life_asc' : 'shelf_life_desc' })}
                      className="inline-flex items-center gap-1.5 hover:text-[#1E293B] cursor-pointer transition-colors mx-auto"
                      title="Sort by Arrival Shelf Life"
                    >
                      <span>{t('arrivalShelfLife') || 'Arrival Shelf Life'}</span>
                      <ArrowUpDown className={`w-3 h-3 ${filters.sortBy.startsWith('shelf_life') ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 min-w-[130px] text-right">
                    <button
                      type="button"
                      onClick={() => handleFilterChange({ sortBy: filters.sortBy === 'freight_asc' ? 'freight_desc' : 'freight_asc' })}
                      className="inline-flex items-center gap-1.5 hover:text-[#1E293B] cursor-pointer transition-colors ml-auto"
                      title="Sort by Freight Cost"
                    >
                      <span>{t('freightCost') || 'Freight Cost'}</span>
                      <ArrowUpDown className={`w-3 h-3 ${filters.sortBy.startsWith('freight') ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 min-w-[120px] text-center">{t('status') || 'Status'}</th>
                  <th className="py-3.5 px-4 min-w-[210px] text-right sticky right-0 bg-[#FAF3E0] border-l border-[#E7E5E4]">
                    {t('explainActions') || 'Explain / Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4] font-sans">
                {paginatedLines.map(line => {
                  const wh = warehouses.find(w => w.id === line.warehouseId);
                  const ret = retailers.find(r => r.id === line.retailerId);
                  const prod = products.find(p => p.sku === line.sku);
                  const batch = batches?.find(b => b.warehouseId === line.warehouseId && b.sku === line.sku && b.batchNo === line.batchNo);
                  const expiryDate = batch?.expiryDate;

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

                  return (
                    <tr
                      key={line.id}
                      className={`hover:bg-[#FAF3E0]/40 transition-colors group ${
                        line.status === 'STALE'
                          ? 'bg-[#FEF2F2]/30'
                          : line.status === 'OVERRIDDEN'
                          ? 'bg-[#EFF6FF]/30'
                          : line.status === 'APPROVED'
                          ? 'bg-[#F0FDF4]/30'
                          : ''
                      }`}
                    >
                      {/* Warehouse Column */}
                      <td className="py-3.5 px-4 font-medium text-[#1E293B]">
                        <div className="flex items-center gap-1.5 font-bold text-[#1E293B]">
                          <Building className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                          <span>{wh?.city || line.warehouseId} Hub</span>
                        </div>
                        <span className="text-[10px] text-[#64748B] block truncate max-w-[150px]" title={wh?.name}>
                          {wh?.name || line.warehouseId}
                        </span>
                      </td>

                      {/* Retailer Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-[#1E293B]">
                          <Store className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                          <span className="truncate max-w-[190px]" title={ret?.name}>
                            {ret?.name || line.retailerId}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#64748B] mt-0.5">
                          <span>{ret?.city}</span>
                          <span>•</span>
                          <span className="uppercase text-[#2563EB] font-semibold font-mono">
                            Class {ret?.serviceClass}
                          </span>
                          {ret?.storageCases && (
                            <span className="text-[#64748B] font-mono">(Cap: {ret.storageCases}cs)</span>
                          )}
                        </div>
                      </td>

                      {/* Product & SKU Column - Prevent SKU awkward wrapping */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#1E293B] truncate max-w-[210px]" title={prod?.name}>
                          {prod?.name || line.sku}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <button
                            type="button"
                            onClick={e => handleCopySku(line.sku, line.id, e)}
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#1E293B] bg-[#FFF8E7] hover:bg-[#FAF3E0] px-2 py-0.5 rounded border border-[#E7E5E4] transition-colors whitespace-nowrap cursor-pointer select-all"
                            title="Click to copy SKU code"
                          >
                            <span>{line.sku}</span>
                            {copiedSkuId === line.id ? (
                              <Check className="w-3 h-3 text-[#15803D]" />
                            ) : (
                              <Copy className="w-3 h-3 text-[#64748B] opacity-70 group-hover:opacity-100" />
                            )}
                          </button>
                          {prod?.category && (
                            <span className="text-[10px] text-[#64748B] bg-[#FAF3E0] px-1.5 py-0.5 rounded border border-[#E7E5E4] truncate max-w-[90px]">
                              {prod.category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Batch & Expiry Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-semibold text-[#64748B] bg-[#FAF3E0] px-2 py-0.5 rounded border border-[#E7E5E4] whitespace-nowrap">
                            {line.batchNo}
                          </span>
                          {expiryDate && (
                            <span className="font-mono text-[10px] text-[#EAB308] bg-[#FEF9C3] px-1.5 py-0.5 rounded border border-[#FEF08A] whitespace-nowrap font-bold">
                              Exp: {expiryDate}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#64748B] mt-1 font-mono">
                          <Calendar className="w-3 h-3 text-[#64748B] shrink-0" />
                          <span>ETA {line.arrivalDate}</span>
                          {line.explanation?.shelfLifeDaysRemaining !== undefined && (
                            <>
                              <span>•</span>
                              <span className="text-[#15803D] font-medium">{line.explanation.shelfLifeDaysRemaining}d left</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Cases / Units Column - Right aligned */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-sm text-[#1E293B] font-mono tabular-nums">
                          {formatNumber(line.cases)} cs
                        </div>
                        <div className="text-[10px] text-[#64748B] font-mono tabular-nums">
                          {formatNumber(line.units)} units
                        </div>
                        {line.override && (
                          <span className="inline-block mt-0.5 text-[9px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-1 rounded">
                            Overridden from {line.override.originalCases}
                          </span>
                        )}
                      </td>

                      {/* Shelf Life Column - Indicators & SLA Gauge */}
                      <td className="py-3.5 px-4 text-center">
                        <ShelfLifeIndicator
                          percentage={line.shelfLifeOnArrivalPct}
                          minThresholdPct={ret?.minShelfLifePct ? Math.round(ret.minShelfLifePct * 100) : 70}
                          daysRemaining={line.explanation?.shelfLifeDaysRemaining}
                        />
                      </td>

                      {/* Route Freight Column - Right aligned */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-sm text-[#1E293B] font-mono tabular-nums">
                          {formatCurrency(line.freightRupees)}
                        </div>
                        <div className="text-[10px] text-[#64748B] font-mono tabular-nums">
                          {formatCurrency(line.cases > 0 ? Math.round(line.freightRupees / line.cases) : 0)}/cs
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border tracking-wider uppercase font-mono ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right sticky right-0 bg-white/95 border-l border-[#E7E5E4]">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Explain Button: Blue Informational */}
                          <button
                            type="button"
                            onClick={() => setSelectedReasonLine(line)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-[#EFF6FF] hover:bg-[#DBEAFE] px-2.5 py-1.5 rounded-lg border border-[#BFDBFE] transition-colors cursor-pointer shadow-xs"
                            title="Inspect explainable AI reasoning, value tiers and trade-offs"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-[#2563EB]" />
                            <span>{t('explain') || 'Explain'}</span>
                          </button>

                          {/* Override / Edit Button: Secondary */}
                          <button
                            type="button"
                            onClick={() => handleOpenOverride(line)}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-[#1E293B] hover:text-[#2563EB] bg-white hover:bg-[#FAF3E0] border border-[#E7E5E4] hover:border-[#2563EB] transition-colors cursor-pointer shadow-xs"
                            title="Override allocation quantity with mandatory justification"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#64748B]" />
                          </button>

                          {/* Approve Button: Primary Red */}
                          {line.status !== 'APPROVED' && line.status !== 'STALE' && (
                            <button
                              type="button"
                              onClick={() => handleApproveLineWithFeedback(line.id)}
                              disabled={approvingLineId === line.id}
                              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                              title="Approve and reserve stock atomically"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t('approve') || 'Approve'}</span>
                            </button>
                          )}

                          {line.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded-md border border-[#BBF7D0]">
                              <Check className="w-3 h-3 text-[#15803D]" /> {t('locked') || 'Locked'}
                            </span>
                          )}

                          {line.status === 'STALE' && (
                            <button
                              type="button"
                              onClick={onReplanStaleLines}
                              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] px-2.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                              title="1-Click Re-plan this stale line"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{t('replan') || 'Re-plan'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination Controls */}
          <div className="p-3.5 bg-[#FAF3E0]/60 border-t border-[#E7E5E4] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <div className="flex items-center gap-2">
              <span>{t('rowsPerPage') || 'Rows per page'}:</span>
              <select
                value={filters.pageSize}
                onChange={e => {
                  handleFilterChange({ pageSize: parseInt(e.target.value) || 10 });
                }}
                className="bg-white border border-[#E7E5E4] rounded px-2 py-1 text-[#1E293B] focus:outline-none focus:border-[#2563EB] cursor-pointer font-medium"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-[11px] text-[#64748B] ml-2">
                Showing {formatNumber((currentPage - 1) * filters.pageSize + 1)}–
                {formatNumber(Math.min(currentPage * filters.pageSize, totalFilteredCount))} of {formatNumber(totalFilteredCount)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] bg-white border border-[#E7E5E4] hover:bg-[#FAF3E0] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-[#1E293B] font-semibold">
                Page {formatNumber(currentPage)} of {formatNumber(totalPages)}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] bg-white border border-[#E7E5E4] hover:bg-[#FAF3E0] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unmet Demand & Constraint Bound Log (FR-10, T1, T21) */}
      {planRun && planRun.unmet && planRun.unmet.length > 0 && (
        <div className="p-4 rounded-xl bg-white border border-[#E7E5E4] shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-[#EA580C]" />
            <span>Unmet / Displaced Demand Diagnostics (Limiting Constraints)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {planRun.unmet.map((item, idx) => {
              const r = retailers.find(ret => ret.id === item.retailerId);
              const p = products.find(prod => prod.sku === item.sku);
              return (
                <div key={idx} className="p-3 rounded-lg bg-[#FFF8E7]/40 border border-[#E7E5E4] flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center shrink-0 text-[11px] font-bold">
                    !
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-[#1E293B]">
                      <span>{r?.name || item.retailerId}</span>
                      <span className="text-[#64748B]">•</span>
                      <span>{p?.name || item.sku}</span>
                    </div>
                    <p className="text-[11px] text-[#EA580C] mt-0.5 font-medium">
                      Unshipped: <span className="font-mono font-bold">{formatNumber(item.unmetCases)}</span> cases ({formatNumber(item.unmetUnits)} units)
                    </p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">
                      <strong>Limiting Reason:</strong> {item.details}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reason Card Modal for Explainable AI Reasoning */}
      {selectedReasonLine && (
        <ReasonCardModal
          card={selectedReasonLine.explanation}
          onClose={() => setSelectedReasonLine(null)}
          onApproveLine={() => {
            handleApproveLineWithFeedback(selectedReasonLine.id);
            setSelectedReasonLine(null);
          }}
        />
      )}

      {/* Confirmation Modal for Bulk Approve All */}
      {planRun && (
        <ApproveAllModal
          isOpen={isApproveAllOpen}
          onClose={() => setIsApproveAllOpen(false)}
          onConfirm={handleConfirmApproveAll}
          planRun={planRun}
        />
      )}

      {/* Enhanced Planner Override Modal with Instant Validation & Presets */}
      {overrideModalLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl p-6 space-y-4 text-[#1E293B]">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
              <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#2563EB]" />
                <span>Override Allocation Quantity</span>
              </h3>
              <button
                type="button"
                onClick={() => setOverrideModalLine(null)}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-lg hover:bg-[#FAF3E0] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#FFF8E7] p-3 rounded-xl border border-[#E7E5E4] space-y-1">
              <p className="text-xs font-bold text-[#1E293B]">
                {products.find(p => p.sku === overrideModalLine.sku)?.name || overrideModalLine.sku}
              </p>
              <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                <span>Destination: {retailers.find(r => r.id === overrideModalLine.retailerId)?.name}</span>
                <span className="font-mono text-[#2563EB] font-semibold">{overrideModalLine.sku}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#1E293B]">
                  New Cases to Dispatch:
                </label>
                <span className="text-[11px] text-[#64748B] font-mono">
                  = {overrideCases * (products.find(p => p.sku === overrideModalLine.sku)?.caseSize || 12)} units
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={overrideCases}
                  onChange={e => {
                    setOverrideCases(parseInt(e.target.value) || 0);
                    setOverrideError('');
                  }}
                  className="flex-1 bg-[#FFF8E7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-[#1E293B] font-bold text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                />
                {/* Presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setOverrideCases(c => Math.max(1, c - 1))}
                    className="px-2 py-1.5 text-xs font-mono font-bold bg-[#FAF3E0] hover:bg-[#FFF8E7] text-[#1E293B] rounded border border-[#E7E5E4] transition-colors cursor-pointer"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideCases(c => c + 1)}
                    className="px-2 py-1.5 text-xs font-mono font-bold bg-[#FAF3E0] hover:bg-[#FFF8E7] text-[#1E293B] rounded border border-[#E7E5E4] transition-colors cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideCases(c => c + 5)}
                    className="px-2 py-1.5 text-xs font-mono font-bold bg-[#FAF3E0] hover:bg-[#FFF8E7] text-[#1E293B] rounded border border-[#E7E5E4] transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                </div>
              </div>
              <span className="text-[10px] text-[#64748B] mt-1 block">
                Original algorithm recommendation: <strong className="text-[#1E293B]">{overrideModalLine.cases} cases</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Mandatory Planner Audit Reason (FR-11):
              </label>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={e => {
                  setOverrideReason(e.target.value);
                  setOverrideError('');
                }}
                placeholder="e.g. Retailer reported upcoming festival demand surge; branch manager authorized safety buffer."
                className="w-full bg-[#FFF8E7] border border-[#E7E5E4] rounded-xl p-2.5 text-xs text-[#1E293B] placeholder-[#64748B] focus:outline-none focus:border-[#2563EB] transition-colors"
              />
            </div>

            {overrideError && (
              <p className="text-xs text-[#DC2626] bg-[#FEF2F2] p-2.5 rounded-xl border border-[#FECACA] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                <span>{overrideError}</span>
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E5E4]">
              <button
                type="button"
                onClick={() => setOverrideModalLine(null)}
                className="px-4 py-2 text-xs font-semibold text-[#1E293B] bg-white border border-[#E7E5E4] hover:bg-[#FAF3E0] rounded-xl transition-colors cursor-pointer"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Commit Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

