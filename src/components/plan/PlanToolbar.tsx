import React from 'react';
import {
  Search,
  ArrowUpDown,
  X,
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown
} from 'lucide-react';
import { Warehouse, Retailer } from '../../types';

export type SortOption =
  | 'default'
  | 'freight_asc'
  | 'freight_desc'
  | 'cases_desc'
  | 'cases_asc'
  | 'shelf_life_asc'
  | 'shelf_life_desc'
  | 'product_asc'
  | 'retailer_asc'
  | 'warehouse_asc';

export type ShelfLifeFilter = 'all' | 'healthy' | 'warning' | 'critical';

export interface PlanFilterState {
  searchQuery: string;
  warehouseId: string;
  retailerId: string;
  status: string;
  shelfLifeRisk: ShelfLifeFilter;
  sortBy: SortOption;
  viewMode: 'table' | 'cards';
  pageSize: number;
}

interface PlanToolbarProps {
  filters: PlanFilterState;
  onFilterChange: (newFilters: Partial<PlanFilterState>) => void;
  onResetFilters: () => void;
  warehouses: Warehouse[];
  retailers: Retailer[];
  totalResultsCount: number;
  filteredCount: number;
}

export const PlanToolbar: React.FC<PlanToolbarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  warehouses,
  retailers,
  totalResultsCount,
  filteredCount,
}) => {
  const activeFiltersCount = [
    filters.searchQuery.trim() !== '',
    filters.warehouseId !== 'all',
    filters.retailerId !== 'all',
    filters.status !== 'all',
    filters.shelfLifeRisk !== 'all',
    filters.sortBy !== 'default',
  ].filter(Boolean).length;

  return (
    <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-3">
      {/* Search & Main Controls Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={e => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search by SKU, Product name, Kirana Retailer, or Warehouse Hub..."
            className="w-full bg-[#F8F7F5] border border-[#E7E5E4] hover:border-[#8B5E3C]/50 focus:border-[#2563EB] rounded-xl pl-9 pr-9 py-2 text-xs text-[#292524] placeholder-[#78716C] focus:outline-none transition-colors"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#292524] p-0.5 rounded transition-colors cursor-pointer"
              title="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Toggle & Status Count */}
        <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0">
          <div className="text-xs text-[#78716C] font-medium whitespace-nowrap">
            Showing <span className="font-bold text-[#292524] font-mono">{filteredCount}</span> of{' '}
            <span className="font-bold text-[#78716C] font-mono">{totalResultsCount}</span>
            {activeFiltersCount > 0 && (
              <span className="ml-1 text-[11px] text-[#2563EB]">({totalResultsCount - filteredCount} filtered)</span>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#F8F7F5] border border-[#E7E5E4] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: 'table' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filters.viewMode === 'table'
                  ? 'bg-[#8B5E3C] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#292524]'
              }`}
              title="Dense enterprise table layout"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: 'cards' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filters.viewMode === 'cards'
                  ? 'bg-[#8B5E3C] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#292524]'
              }`}
              title="Responsive card grid layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips & Sorting Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#E7E5E4] text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Warehouse Dropdown */}
          <div className="relative">
            <select
              value={filters.warehouseId}
              onChange={e => onFilterChange({ warehouseId: e.target.value })}
              className="appearance-none bg-[#F8F7F5] border border-[#E7E5E4] hover:border-[#8B5E3C]/50 text-[#292524] rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:border-[#2563EB] font-medium cursor-pointer"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.city} Hub ({w.id})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#78716C] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Retailer Dropdown */}
          <div className="relative">
            <select
              value={filters.retailerId}
              onChange={e => onFilterChange({ retailerId: e.target.value })}
              className="appearance-none bg-[#F8F7F5] border border-[#E7E5E4] hover:border-[#8B5E3C]/50 text-[#292524] rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:border-[#2563EB] font-medium max-w-[180px] truncate cursor-pointer"
            >
              <option value="all">All Retailers</option>
              {retailers.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.city})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#78716C] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={filters.status}
              onChange={e => onFilterChange({ status: e.target.value })}
              className="appearance-none bg-[#F8F7F5] border border-[#E7E5E4] hover:border-[#8B5E3C]/50 text-[#292524] rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:border-[#2563EB] font-medium cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="PROPOSED">Proposed</option>
              <option value="APPROVED">Approved / Reserved</option>
              <option value="OVERRIDDEN">Overridden (Audit)</option>
              <option value="STALE">Stale (409 Conflict)</option>
              <option value="DISPATCHED">Dispatched</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#78716C] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Shelf Life Risk Dropdown */}
          <div className="relative">
            <select
              value={filters.shelfLifeRisk}
              onChange={e => onFilterChange({ shelfLifeRisk: e.target.value as ShelfLifeFilter })}
              className="appearance-none bg-[#F8F7F5] border border-[#E7E5E4] hover:border-[#8B5E3C]/50 text-[#292524] rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:border-[#2563EB] font-medium cursor-pointer"
            >
              <option value="all">All Shelf-Life</option>
              <option value="healthy">Healthy (≥75%)</option>
              <option value="warning">Near Min (70-74%)</option>
              <option value="critical">Critical (&lt;70% SLA Violation)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#78716C] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE] font-semibold transition-colors cursor-pointer"
              title="Reset all search queries and filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[#78716C] text-[11px] font-medium hidden sm:inline flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3 text-[#78716C]" />
            Sort by:
          </span>
          <div className="relative">
            <select
              value={filters.sortBy}
              onChange={e => onFilterChange({ sortBy: e.target.value as SortOption })}
              className="appearance-none bg-[#F8F7F5] border border-[#E7E5E4] hover:border-[#8B5E3C]/50 text-[#292524] rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:border-[#2563EB] font-medium cursor-pointer"
            >
              <option value="default">Engine Priority</option>
              <option value="freight_asc">Freight: Low → High</option>
              <option value="freight_desc">Freight: High → Low</option>
              <option value="cases_desc">Cases: High → Low</option>
              <option value="cases_asc">Cases: Low → High</option>
              <option value="shelf_life_asc">Shelf Life: Lowest First (FEFO Urgency)</option>
              <option value="shelf_life_desc">Shelf Life: Highest First</option>
              <option value="product_asc">Product: A → Z</option>
              <option value="retailer_asc">Retailer: A → Z</option>
              <option value="warehouse_asc">Warehouse Hub: A → Z</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#78716C] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
