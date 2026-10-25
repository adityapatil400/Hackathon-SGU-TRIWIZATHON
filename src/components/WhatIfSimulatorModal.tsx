import React, { useState } from 'react';
import { Sliders, X, Sparkles, TrendingUp, Truck, Building, RotateCcw } from 'lucide-react';

interface WhatIfSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseCases: number;
  baseFreight: number;
  baseMargin: number;
}

export const WhatIfSimulatorModal: React.FC<WhatIfSimulatorModalProps> = ({
  isOpen,
  onClose,
  baseCases,
  baseFreight,
  baseMargin,
}) => {
  const [demandSurgePct, setDemandSurgePct] = useState<number>(15); // +15%
  const [freightShockPct, setFreightShockPct] = useState<number>(10); // +10%
  const [puneCapacityLimitPct, setPuneCapacityLimitPct] = useState<number>(100); // 100% normal

  if (!isOpen) return null;

  // Calculated what-if adjustments
  const multiplierDemand = 1 + demandSurgePct / 100;
  const multiplierFreight = 1 + freightShockPct / 100;
  const capacityConstraintFactor = puneCapacityLimitPct < 80 ? (puneCapacityLimitPct / 100) : 1;

  const simulatedCases = Math.round(baseCases * multiplierDemand * capacityConstraintFactor);
  const simulatedFreight = Math.round(baseFreight * (simulatedCases / Math.max(1, baseCases)) * multiplierFreight);
  const simulatedMargin = Math.round(baseMargin * (simulatedCases / Math.max(1, baseCases)));

  const handleReset = () => {
    setDemandSurgePct(0);
    setFreightShockPct(0);
    setPuneCapacityLimitPct(100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F8F7F5] border-b border-[#E7E5E4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8B5E3C]/10 border border-[#8B5E3C]/20 flex items-center justify-center text-[#8B5E3C]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#292524]">
                What-If Scenario Simulator (FR-17)
              </h3>
              <p className="text-xs text-[#78716C]">Stress-test allocation against macro shocks in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white hover:bg-[#F8F7F5] border border-[#E7E5E4] text-[#78716C] hover:text-[#292524] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sliders Body */}
        <div className="p-6 space-y-6">
          {/* Slider 1: Festival Demand Surge */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#292524] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#15803D]" />
                <span>Diwali Festival Demand Surge</span>
              </span>
              <span className="font-bold text-[#15803D]">+{demandSurgePct}%</span>
            </div>
            <input
              type="range"
              min={-30}
              max={60}
              step={5}
              value={demandSurgePct}
              onChange={e => setDemandSurgePct(parseInt(e.target.value))}
              className="w-full accent-[#15803D] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#78716C]">
              <span>-30% (Slump)</span>
              <span>0% (Baseline)</span>
              <span>+60% (Festive Peak)</span>
            </div>
          </div>

          {/* Slider 2: Fuel / Freight Rate Shock */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#292524] flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#D97706]" />
                <span>Secondary Route Freight Inflation</span>
              </span>
              <span className="font-bold text-[#D97706]">+{freightShockPct}%</span>
            </div>
            <input
              type="range"
              min={-20}
              max={50}
              step={5}
              value={freightShockPct}
              onChange={e => setFreightShockPct(parseInt(e.target.value))}
              className="w-full accent-[#D97706] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#78716C]">
              <span>-20% (Subsidy)</span>
              <span>0% (Normal)</span>
              <span>+50% (Fuel Hike)</span>
            </div>
          </div>

          {/* Slider 3: Warehouse Capacity Bottleneck */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#292524] flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#8B5E3C]" />
                <span>Pune Central Hub Throughput</span>
              </span>
              <span className="font-bold text-[#8B5E3C]">{puneCapacityLimitPct}% Available</span>
            </div>
            <input
              type="range"
              min={30}
              max={100}
              step={10}
              value={puneCapacityLimitPct}
              onChange={e => setPuneCapacityLimitPct(parseInt(e.target.value))}
              className="w-full accent-[#8B5E3C] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#78716C]">
              <span>30% (Dock Strike)</span>
              <span>70% (Restricted)</span>
              <span>100% (Full Capacity)</span>
            </div>
          </div>

          {/* Live Impact Preview */}
          <div className="p-4 rounded-xl bg-[#F8F7F5] border border-[#E7E5E4] space-y-3">
            <h4 className="text-xs font-bold text-[#292524] uppercase tracking-wider">
              Simulated Plan Outcome
            </h4>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-[#E7E5E4] shadow-xs">
                <span className="text-[#78716C] block text-[11px]">Cases Dispatched</span>
                <span className="text-base font-bold text-[#292524] mt-0.5 block">{simulatedCases} cs</span>
                <span className="text-[10px] text-[#78716C]">Base: {baseCases} cs</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-[#E7E5E4] shadow-xs">
                <span className="text-[#78716C] block text-[11px]">Route Freight</span>
                <span className="text-base font-bold text-[#D97706] mt-0.5 block">₹{simulatedFreight.toLocaleString()}</span>
                <span className="text-[10px] text-[#78716C]">Base: ₹{baseFreight.toLocaleString()}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-[#E7E5E4] shadow-xs">
                <span className="text-[#78716C] block text-[11px]">Gross Margin</span>
                <span className="text-base font-bold text-[#15803D] mt-0.5 block">₹{simulatedMargin.toLocaleString()}</span>
                <span className="text-[10px] text-[#78716C]">Base: ₹{baseMargin.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F8F7F5] border-t border-[#E7E5E4] flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-[#78716C] hover:text-[#292524] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sliders</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg shadow-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
