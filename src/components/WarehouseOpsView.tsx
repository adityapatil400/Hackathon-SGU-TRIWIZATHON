import React, { useState } from 'react';
import {
  Warehouse as WarehouseIcon,
  Package,
  Truck,
  Send,
  Boxes,
  Clock,
  Layers
} from 'lucide-react';
import { Warehouse, InventoryBatch, AllocationLine, Product, Retailer } from '../types';
import { useTranslation } from '../context/TranslationContext';

interface WarehouseOpsViewProps {
  warehouses: Warehouse[];
  batches: InventoryBatch[];
  approvedLines: AllocationLine[];
  products: Product[];
  retailers: Retailer[];
  onDispatchLine: (lineId: string) => void;
  onUpdateBatchCount: (batchId: string, countedUnits: number) => void;
  isOnline: boolean;
}

export const WarehouseOpsView: React.FC<WarehouseOpsViewProps> = ({
  warehouses,
  batches,
  approvedLines,
  products,
  retailers,
  onDispatchLine,
  onUpdateBatchCount,
}) => {
  const { t, formatNumber } = useTranslation();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('WH-PUN');
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [countInput, setCountInput] = useState<number>(0);

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId) || warehouses[0];
  const whBatches = batches.filter(b => b.warehouseId === selectedWarehouseId);
  const whDispatchLines = approvedLines.filter(l => l.warehouseId === selectedWarehouseId && l.status === 'APPROVED');

  const handleStartCount = (batch: InventoryBatch) => {
    setEditingBatchId(batch.id);
    setCountInput(batch.qtyUnits);
  };

  const handleSaveCount = (batchId: string) => {
    onUpdateBatchCount(batchId, countInput);
    setEditingBatchId(null);
  };

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1E293B] tracking-tight">
              {t('warehouse.title', 'Warehouse Picking & Dispatch Console')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-[#15803D] border border-emerald-200">
              J4 Sunita (Warehouse Mgr)
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            {t('warehouse.subtitle', 'Pick approved batches in FEFO order • Shift stock to in-transit • Record offline warehouse counts')}
          </p>
        </div>

        {/* Warehouse Selector */}
        <div className="flex items-center gap-2">
          <WarehouseIcon className="w-4 h-4 text-[#2563EB]" />
          <select
            value={selectedWarehouseId}
            onChange={e => setSelectedWarehouseId(e.target.value)}
            className="bg-[#FFF8E7] border border-[#E7E5E4] text-[#1E293B] font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#2563EB] cursor-pointer"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Warehouse Capacity Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E7E5E4] shadow-xs">
          <span className="text-xs text-[#64748B] font-semibold flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-[#2563EB]" />
            Hub Cycle Capacity
          </span>
          <p className="text-2xl font-black text-[#1E293B] mt-1 font-mono">
            {formatNumber(selectedWarehouse.capacityCasesPerCycle)} cs
          </p>
          <span className="text-[11px] text-[#64748B]">Weekly dock throughput limit</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs text-[#15803D] font-semibold flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-[#15803D]" />
            Ready to Dispatch
          </span>
          <p className="text-2xl font-black text-[#15803D] mt-1 font-mono">
            {formatNumber(whDispatchLines.length)} shipments
          </p>
          <span className="text-[11px] text-[#64748B]">
            {formatNumber(whDispatchLines.reduce((acc, l) => acc + l.cases, 0))} cases reserved
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#BFDBFE] shadow-xs">
          <span className="text-xs text-[#2563EB] font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
            Physical Batches Held
          </span>
          <p className="text-2xl font-black text-[#2563EB] mt-1 font-mono">
            {formatNumber(whBatches.length)} active batches
          </p>
          <span className="text-[11px] text-[#64748B]">FEFO tracked with version control</span>
        </div>
      </div>

      {/* Picking & Dispatch List for Approved Lines */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-base font-bold text-[#1E293B]">
              Approved Dispatch Pick Slip ({selectedWarehouse.name})
            </h3>
          </div>
          <span className="text-xs text-[#64748B]">
            {formatNumber(whDispatchLines.length)} {t('warehouse.pickingList', 'lines waiting for truck load')}
          </span>
        </div>

        {whDispatchLines.length === 0 ? (
          <div className="text-center py-10 text-[#64748B] text-xs bg-[#FFF8E7] rounded-xl border border-[#E7E5E4]">
            No pending dispatches for this warehouse. Approve allocation lines in the "Allocation Plan" tab first.
          </div>
        ) : (
          <div className="rounded-xl border border-[#E7E5E4] overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E7E5E4] bg-[#FAF3E0] text-[#64748B] font-semibold uppercase">
                    <th className="py-2.5 px-3">Destination Kirana</th>
                    <th className="py-2.5 px-3">Product SKU</th>
                    <th className="py-2.5 px-3">Batch to Pick</th>
                    <th className="py-2.5 px-3 text-center">Cases (Units)</th>
                    <th className="py-2.5 px-3">Shelf Life Remaining</th>
                    <th className="py-2.5 px-3 text-right">Dispatch Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4]">
                  {whDispatchLines.map(line => {
                    const ret = retailers.find(r => r.id === line.retailerId);
                    const prod = products.find(p => p.sku === line.sku);

                    return (
                      <tr key={line.id} className="hover:bg-[#FFF8E7]/50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-[#1E293B]">
                          {ret?.name} ({ret?.city})
                          <span className="block text-[10px] text-[#64748B]">Class {ret?.serviceClass} Kirana</span>
                        </td>

                        <td className="py-3 px-3 font-bold text-[#1E293B]">
                          {prod?.name}
                          <span className="block text-[10px] font-mono text-[#64748B] whitespace-nowrap">{prod?.sku}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] whitespace-nowrap select-all font-semibold">
                            {line.batchNo}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-[#1E293B] font-mono whitespace-nowrap">
                          {formatNumber(line.cases)} cs ({formatNumber(line.units)} units)
                        </td>

                        <td className="py-3 px-3 font-bold text-[#15803D]">
                          {line.shelfLifeOnArrivalPct}% upon arrival
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {/* Primary Action Button: Red */}
                          <button
                            onClick={() => onDispatchLine(line.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Confirm Dispatch</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Warehouse Physical Batches & Inventory Count (Offline-Capable) */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-base font-bold text-[#1E293B]">
              Warehouse Batch Physical Inventory &amp; Stock Count
            </h3>
          </div>
          <span className="text-xs text-[#64748B]">
            Changes trigger batch version increment (Section 11.3)
          </span>
        </div>

        <div className="rounded-xl border border-[#E7E5E4] overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E7E5E4] bg-[#FAF3E0] text-[#64748B] font-semibold uppercase">
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-center">Physical Units</th>
                  <th className="py-2.5 px-3 text-center">Reserved Units</th>
                  <th className="py-2.5 px-3 text-center">Available Units</th>
                  <th className="py-2.5 px-3 text-center">Version</th>
                  <th className="py-2.5 px-3 text-right">Count Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {whBatches.map(batch => {
                  const prod = products.find(p => p.sku === batch.sku);
                  const available = Math.max(0, batch.qtyUnits - batch.reservedUnits);
                  const isEditing = editingBatchId === batch.id;

                  return (
                    <tr key={batch.id} className="hover:bg-[#FFF8E7]/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-[#2563EB] font-bold whitespace-nowrap select-all">
                        {batch.batchNo}
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#1E293B]">
                        {prod?.name}
                        <span className="block text-[10px] font-mono text-[#64748B]">{batch.sku}</span>
                      </td>

                      <td className="py-3 px-3 text-[#64748B] font-mono whitespace-nowrap">
                        {batch.expiryDate}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-[#1E293B] font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            value={countInput}
                            onChange={e => setCountInput(parseInt(e.target.value) || 0)}
                            className="w-20 bg-[#FFF8E7] border border-[#2563EB] rounded px-2 py-0.5 text-center text-[#1E293B] font-mono font-bold"
                          />
                        ) : (
                          `${formatNumber(batch.qtyUnits)} u`
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-[#EA580C] font-mono">
                        {formatNumber(batch.reservedUnits)} u
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-[#15803D] font-mono">
                        {formatNumber(available)} u
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-[#64748B]">
                        v{batch.version}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveCount(batch.id)}
                              className="px-2.5 py-1 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-[11px] cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingBatchId(null)}
                              className="px-2 py-1 rounded bg-[#FFF8E7] border border-[#E7E5E4] text-[#64748B] hover:text-[#1E293B] text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartCount(batch)}
                            className="text-[11px] font-semibold text-[#1E293B] bg-white border border-[#2563EB] hover:bg-[#EFF6FF] px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            Record Count
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
