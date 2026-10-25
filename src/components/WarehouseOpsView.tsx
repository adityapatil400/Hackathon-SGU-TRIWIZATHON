import React, { useState } from 'react';
import {
  Warehouse as WarehouseIcon,
  Package,
  Truck,
  Send
} from 'lucide-react';
import { Warehouse, InventoryBatch, AllocationLine, Product, Retailer } from '../types';

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
    <div className="space-y-6 text-[#292524]">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#292524] tracking-tight">
              Warehouse Picking &amp; Dispatch Console
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-[#15803D] border border-emerald-200">
              J4 Sunita (Warehouse Mgr)
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            Pick approved batches in FEFO order • Shift stock to in-transit • Record offline warehouse counts (Section 11.3 Rule 7)
          </p>
        </div>

        {/* Warehouse Selector */}
        <div className="flex items-center gap-2">
          <WarehouseIcon className="w-4 h-4 text-[#8B5E3C]" />
          <select
            value={selectedWarehouseId}
            onChange={e => setSelectedWarehouseId(e.target.value)}
            className="bg-[#F8F7F5] border border-[#E7E5E4] text-[#292524] font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#2563EB] cursor-pointer"
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
          <span className="text-xs text-[#78716C] font-semibold">Hub Cycle Capacity</span>
          <p className="text-2xl font-black text-[#292524] mt-1 font-mono">
            {selectedWarehouse.capacityCasesPerCycle.toLocaleString()} cases
          </p>
          <span className="text-[11px] text-[#78716C]">Weekly dock throughput limit</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs text-[#15803D] font-semibold">Ready to Dispatch</span>
          <p className="text-2xl font-black text-[#15803D] mt-1 font-mono">
            {whDispatchLines.length} shipments
          </p>
          <span className="text-[11px] text-[#78716C]">
            {whDispatchLines.reduce((acc, l) => acc + l.cases, 0)} cases reserved
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#8B5E3C]/30 shadow-xs">
          <span className="text-xs text-[#8B5E3C] font-semibold">Physical Batches Held</span>
          <p className="text-2xl font-black text-[#8B5E3C] mt-1 font-mono">
            {whBatches.length} active batches
          </p>
          <span className="text-[11px] text-[#78716C]">FEFO tracked with version control</span>
        </div>
      </div>

      {/* Picking & Dispatch List for Approved Lines */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#8B5E3C]" />
            <h3 className="text-base font-bold text-[#292524]">
              Approved Dispatch Pick Slip ({selectedWarehouse.name})
            </h3>
          </div>
          <span className="text-xs text-[#78716C]">
            {whDispatchLines.length} lines waiting for truck load
          </span>
        </div>

        {whDispatchLines.length === 0 ? (
          <div className="text-center py-10 text-[#78716C] text-xs bg-[#F8F7F5] rounded-xl border border-[#E7E5E4]">
            No pending dispatches for this warehouse. Approve allocation lines in the "Allocation Plan" tab first.
          </div>
        ) : (
          <div className="rounded-xl border border-[#E7E5E4] overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E7E5E4] bg-[#F8F7F5] text-[#78716C] font-semibold uppercase">
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
                    <tr key={line.id} className="hover:bg-[#F8F7F5]/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#292524]">
                        {ret?.name} ({ret?.city})
                        <span className="block text-[10px] text-[#78716C]">Class {ret?.serviceClass} Kirana</span>
                      </td>

                      <td className="py-3 px-3 font-bold text-[#292524]">
                        {prod?.name}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                          {line.batchNo}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-[#292524] font-mono">
                        {line.cases} cs ({line.units} units)
                      </td>

                      <td className="py-3 px-3 font-bold text-[#15803D]">
                        {line.shelfLifeOnArrivalPct}% upon arrival
                      </td>

                      <td className="py-3 px-3 text-right">
                        {/* Primary Action Button: Red */}
                        <button
                          onClick={() => onDispatchLine(line.id)}
                          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs transition-all ml-auto cursor-pointer"
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
        )}
      </div>

      {/* Warehouse Physical Batches & Inventory Count (Offline-Capable) */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#8B5E3C]" />
            <h3 className="text-base font-bold text-[#292524]">
              Warehouse Batch Physical Inventory &amp; Stock Count
            </h3>
          </div>
          <span className="text-xs text-[#78716C]">
            Changes trigger batch version increment (Section 11.3)
          </span>
        </div>

        <div className="rounded-xl border border-[#E7E5E4] overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E7E5E4] bg-[#F8F7F5] text-[#78716C] font-semibold uppercase">
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
                  <tr key={batch.id} className="hover:bg-[#F8F7F5]/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-[#2563EB] font-bold">
                      {batch.batchNo}
                    </td>

                    <td className="py-3 px-3 font-semibold text-[#292524]">
                      {prod?.name}
                    </td>

                    <td className="py-3 px-3 text-[#78716C] font-mono">
                      {batch.expiryDate}
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-[#292524] font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          value={countInput}
                          onChange={e => setCountInput(parseInt(e.target.value) || 0)}
                          className="w-20 bg-[#F8F7F5] border border-[#2563EB] rounded px-2 py-0.5 text-center text-[#292524] font-mono font-bold"
                        />
                      ) : (
                        `${batch.qtyUnits} u`
                      )}
                    </td>

                    <td className="py-3 px-3 text-center font-semibold text-[#D97706] font-mono">
                      {batch.reservedUnits} u
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-[#15803D] font-mono">
                      {available} u
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-[#78716C]">
                      v{batch.version}
                    </td>

                    <td className="py-3 px-3 text-right">
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
                            className="px-2 py-1 rounded bg-[#F8F7F5] border border-[#E7E5E4] text-[#78716C] hover:text-[#292524] text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartCount(batch)}
                          className="text-[11px] font-semibold text-[#292524] bg-white border border-[#8B5E3C] hover:bg-[#E9D8C8]/50 px-2.5 py-1 rounded transition-colors cursor-pointer"
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
  );
};
