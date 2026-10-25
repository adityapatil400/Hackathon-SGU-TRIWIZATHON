import React, { useState } from 'react';
import {
  ArrowDownRight,
  ShieldCheck,
  Zap,
  TrendingDown,
  Clock,
  PackageCheck,
  MapPin,
  ChevronRight,
  Sun,
  RotateCcw,
  Globe2,
  Activity
} from 'lucide-react';
import { TerraDusk } from './TerraDusk';
import { BENCHMARK_COMPARISONS, BENCHMARK_SOLVE_TIME } from '../data/mockData';
import { PLAN_HORIZON_DAYS } from '../data/demoScope';

export interface HeroBannerProps {
  onQuickGenerate: () => void;
  planStatus: string;
  onExploreMap?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onQuickGenerate,
  planStatus,
  onExploreMap
}) => {
  const [earthSpeed, setEarthSpeed] = useState<number>(8.5);
  const [sunMode, setSunMode] = useState<'cursor' | 'fixed'>('cursor');

  const stockoutDisplay = `${BENCHMARK_COMPARISONS.stockoutReductionVsCurrentPct}%`;
  const wasteDisplay = `${BENCHMARK_COMPARISONS.wasteReductionVsCurrentPct}%`;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E7E5E4] p-6 md:p-8 mb-8 shadow-xs">
      {/* Subtle light background accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#EFF6FF]/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#E9D8C8]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Core Value Prop & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              Indian FMCG &amp; Kirana Traditional Trade
            </span>
            <span className="text-xs text-[#78716C] flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#2563EB]" /> Weekly Cycle W43
            </span>
            <span className="text-xs text-[#8B5E3C] bg-[#E9D8C8]/60 border border-[#8B5E3C]/30 px-2 py-0.5 rounded-full font-medium">
              {PLAN_HORIZON_DAYS}-Day Horizon
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#292524] tracking-tight leading-tight">
            AI Marginal-Value Allocation &amp; Demand Intelligence
          </h1>

          <p className="text-sm md:text-base text-[#78716C] leading-relaxed">
            Eliminating the kirana replenishment trap for 13M+ stores where 3–5% distributor margins mean one expired case wipes out the profit of 20+ sales. Optimized via greedy marginal-value knapsack allocation with arrival shelf-life gating.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onQuickGenerate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] shadow-xs transition-all cursor-pointer select-none"
              title="Trigger immediate greedy marginal-value allocation run"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Quick Run Optimization</span>
            </button>

            {onExploreMap && (
              <button
                type="button"
                onClick={onExploreMap}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-all cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Maharashtra GIS Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="flex items-center gap-1.5 text-xs text-[#78716C] pl-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#15803D]" />
              <span>Status: <strong className="text-[#292524] uppercase font-mono">{planStatus}</strong></span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-[#15803D] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Arrival Shelf-Life Verified (&ge;70% Min)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1 rounded-full font-medium">
              <Zap className="w-3.5 h-3.5" />
              <span>Solve Time: {BENCHMARK_SOLVE_TIME.p95}ms p95</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#8B5E3C] bg-[#E9D8C8]/60 border border-[#8B5E3C]/30 px-3 py-1 rounded-full font-medium">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Explainable Marginal Reason Cards</span>
            </div>
          </div>

          {/* Quick KPI Stat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
            {/* Stockout reduction */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#15803D] font-bold">
                <span>Stockouts</span>
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div className="mt-1 text-2xl font-black text-[#15803D] tracking-tight">{stockoutDisplay}</div>
              <div className="text-[11px] text-[#78716C] font-medium">vs Current (simulated)</div>
            </div>

            {/* Waste reduction */}
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#2563EB] font-bold">
                <span>Expiry &amp; Waste</span>
                <TrendingDown className="w-4 h-4" />
              </div>
              <div className="mt-1 text-2xl font-black text-[#2563EB] tracking-tight">{wasteDisplay}</div>
              <div className="text-[11px] text-[#78716C] font-medium">Total waste reduction</div>
            </div>

            {/* vs Textbook */}
            <div className="bg-white p-4 rounded-xl border border-[#8B5E3C]/30 shadow-xs col-span-2 sm:col-span-1 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#8B5E3C] font-bold">
                <span>vs Textbook</span>
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div className="mt-1 text-2xl font-black text-[#8B5E3C] tracking-tight">{BENCHMARK_COMPARISONS.stockoutChangeVsTextbookPct}%</div>
              <div className="text-[11px] text-[#78716C] font-medium">Stockouts (simulated)</div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Interactive Rotating Earth (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center rounded-2xl bg-gradient-to-b from-[#F8F7F5] to-white border border-[#E7E5E4] p-2 shadow-xs group">
            <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center">
              <TerraDusk
                size={320}
                speed={earthSpeed}
                sun={sunMode}
                daylight={86}
                sunAngle={175}
                stars={4}
                hover={7.2}
                look={{
                  clouds: 5,
                  lights: 6,
                  atmosphere: '#2563EB',
                }}
                background="transparent"
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {/* Pune Hub Telemetry Badge */}
            <div className="absolute top-3 left-3 pointer-events-none">
              <div className="bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-[#E7E5E4] text-[10px] text-[#292524] flex items-center gap-1.5 shadow-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-ping" />
                <span className="font-bold">18.5204° N, 73.8567° E</span>
                <span className="text-[#78716C]">(Pune Hub)</span>
              </div>
            </div>

            <div className="absolute bottom-3 right-3 pointer-events-none">
              <div className="bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-[#E7E5E4] text-[10px] text-[#78716C] flex items-center gap-1 shadow-xs">
                <Activity className="w-3 h-3 text-[#2563EB]" />
                <span>Interactive 3D Grid</span>
              </div>
            </div>
          </div>

          {/* Micro-Controls */}
          <div className="w-full max-w-[340px] mt-2 bg-white px-3 py-1.5 rounded-xl border border-[#E7E5E4] flex items-center justify-between text-xs text-[#78716C] shadow-xs">
            <div className="flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-[11px] font-semibold text-[#292524]">Earth View</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSunMode(prev => prev === 'cursor' ? 'fixed' : 'cursor')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  sunMode === 'cursor'
                    ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                    : 'bg-[#F8F7F5] text-[#78716C] hover:text-[#292524]'
                }`}
                title="Toggle sun light vector following cursor"
              >
                <Sun className="w-2.5 h-2.5 inline mr-1 text-amber-500" />
                <span>{sunMode === 'cursor' ? 'Cursor Sun' : 'Fixed Sun'}</span>
              </button>

              <button
                type="button"
                onClick={() => setEarthSpeed(prev => prev === 0 ? 8.5 : prev < 15 ? prev + 4 : 0)}
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F8F7F5] hover:bg-[#E9D8C8]/50 text-[#78716C] border border-[#E7E5E4] transition-all cursor-pointer"
                title="Change Earth rotation speed"
              >
                <RotateCcw className="w-2.5 h-2.5 inline mr-1 text-[#8B5E3C]" />
                <span>{earthSpeed === 0 ? 'Paused' : `${(earthSpeed / 5).toFixed(1)}x`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
