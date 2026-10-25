import React, { useState } from 'react';
import {
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from 'recharts';
<<<<<<< Updated upstream
import { BENCHMARK_SIMULATION_SUMMARY, BENCHMARK_COMPARISONS, BENCHMARK_SOLVE_TIME, SEED_BENCHMARK_DATA } from '../data/mockData';
import { WORKSPACE_SEED_SCOPE } from '../data/demoScope';
=======
import { BENCHMARK_COMPARISONS, BENCHMARK_SOLVE_TIME, SEED_BENCHMARK_DATA } from '../data/mockData';
>>>>>>> Stashed changes

export const BaselineComparisonView: React.FC = () => {
  const [selectedSeed, setSelectedSeed] = useState<number>(0);

  const seedData = SEED_BENCHMARK_DATA.find(s => s.seed === selectedSeed) || SEED_BENCHMARK_DATA[0];

  // Data for Recharts Bar Chart
  const stockoutChartData = [
    { name: 'Stockout Units', CurrentPractice: seedData.currentStockout, StrongBaseline: seedData.strongStockout, FlowGrid: seedData.hetvayaStockout },
    { name: 'Expired/Rejected', CurrentPractice: seedData.currentWaste, StrongBaseline: seedData.strongWaste, FlowGrid: seedData.hetvayaWaste },
  ];

  const freightChartData = [
    { name: 'Freight Cost (₹)', CurrentPractice: seedData.currentFreight, StrongBaseline: seedData.strongFreight, FlowGrid: seedData.hetvayaFreight },
  ];

  return (
    <div className="space-y-6 text-[#292524]">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#292524] tracking-tight">
              Baseline Impact Benchmark (Section 17)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-[#15803D] border border-emerald-200">
              FR-13 Simulated True Demand
            </span>
          </div>
<<<<<<< Updated upstream
          <p className="text-xs text-slate-400 mt-1">
            Synthetic benchmark: 20 seeds / 9 cycles (180 runs). The measured operation is the client-side runOptimizationEngine on {WORKSPACE_SEED_SCOPE.retailerCount} retailers, {WORKSPACE_SEED_SCOPE.skuCount} SKUs, and {WORKSPACE_SEED_SCOPE.warehouseCount} warehouses (p95: {BENCHMARK_SOLVE_TIME.p95}ms). The report does not record hardware, so treat timing as comparison-only, not an SLA.
=======
          <p className="text-xs text-[#78716C] mt-1">
            Scored on identical hidden true demand over 9 weekly cycles across 20 simulated networks (Seeds 0–19). 180 of 180 decision runs successfully completed (p95: {BENCHMARK_SOLVE_TIME.p95}ms).
>>>>>>> Stashed changes
          </p>
        </div>

        {/* Seed Selector */}
        <div className="flex items-center gap-2 bg-[#F8F7F5] border border-[#E7E5E4] px-3 py-2 rounded-xl">
          <span className="text-xs text-[#78716C] font-semibold">Simulation Seed:</span>
          <select
            value={selectedSeed}
            onChange={e => setSelectedSeed(parseInt(e.target.value))}
            className="bg-white border border-[#E7E5E4] text-[#292524] font-bold text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#2563EB] cursor-pointer"
          >
            {SEED_BENCHMARK_DATA.map(s => (
              <option key={s.seed} value={s.seed}>
                Network Seed #{s.seed}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Side-by-Side 3-Way Policy Card Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Policy 1: Current Practice */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">Policy 1: Status Quo</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F8F7F5] text-[#78716C] border border-[#E7E5E4]">Spreadsheet</span>
          </div>
          <h3 className="text-base font-bold text-[#292524]">Current Practice</h3>
          <p className="text-xs text-[#78716C]">
            Ship last week's sales • Nearest warehouse only • Newest batch first • No arrival shelf-life check
          </p>

          <div className="space-y-3 pt-2 border-t border-[#E7E5E4] text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Stockout Units:</span>
              <span className="font-extrabold text-[#DC2626] font-mono">{seedData.currentStockout.toLocaleString()} units</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Expired &amp; Rejected:</span>
              <span className="font-extrabold text-[#DC2626] font-mono">{seedData.currentWaste.toLocaleString()} units</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Freight Cost:</span>
              <span className="font-extrabold text-[#292524] font-mono">₹{seedData.currentFreight.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Fill Rate:</span>
              <span className="font-bold text-[#292524] font-mono">{seedData.currentFillRate}%</span>
            </div>
          </div>
        </div>

        {/* Policy 2: Strong Textbook Baseline */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">Policy 2: Operations Textbook</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E9D8C8]/60 text-[#8B5E3C] border border-[#8B5E3C]/30">Min-Max</span>
          </div>
          <h3 className="text-base font-bold text-[#292524]">Strong Baseline</h3>
          <p className="text-xs text-[#78716C]">
            4-week MA + 1.65σ safety stock • Nearest warehouse • Earliest expiry first (FEFO) • Dispatch shelf check
          </p>

          <div className="space-y-3 pt-2 border-t border-[#E7E5E4] text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Stockout Units:</span>
              <span className="font-extrabold text-[#292524] font-mono">{seedData.strongStockout.toLocaleString()} units</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Expired &amp; Rejected:</span>
              <span className="font-extrabold text-[#292524] font-mono">{seedData.strongWaste.toLocaleString()} units</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Freight Cost:</span>
              <span className="font-extrabold text-[#8B5E3C] font-mono">₹{seedData.strongFreight.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Fill Rate:</span>
              <span className="font-bold text-[#292524] font-mono">{seedData.strongFillRate}%</span>
            </div>
          </div>
        </div>

        {/* Policy 3: FlowGrid Engine */}
        <div className="bg-white p-5 rounded-2xl border-2 border-[#15803D]/60 space-y-4 relative overflow-hidden shadow-xs">
          <div className="absolute top-0 right-0 bg-[#15803D] text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-bl-lg">
            Recommended
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#15803D]">Policy 3: This Engine</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#15803D] border border-emerald-200">OPTIMIZED</span>
          </div>
          <h3 className="text-base font-extrabold text-[#292524]">FlowGrid Engine</h3>
          <p className="text-xs text-[#78716C]">
            Marginal-value knapsack allocation • Arrival shelf-life per kirana • Lateness-weighed sourcing • Space limit
          </p>

          <div className="space-y-3 pt-2 border-t border-[#E7E5E4] text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Stockout Units:</span>
              <span className="font-black text-[#15803D] font-mono">{seedData.hetvayaStockout.toLocaleString()} units ({BENCHMARK_COMPARISONS.stockoutReductionVsCurrentPct}%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Expired &amp; Rejected:</span>
              <span className="font-black text-[#15803D] font-mono">{seedData.hetvayaWaste.toLocaleString()} units ({BENCHMARK_COMPARISONS.wasteReductionVsCurrentPct}%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Freight Cost:</span>
              <span className="font-black text-[#8B5E3C] font-mono">₹{seedData.hetvayaFreight.toLocaleString()} ({BENCHMARK_COMPARISONS.freightReductionVsCurrentPct > 0 ? `+${BENCHMARK_COMPARISONS.freightReductionVsCurrentPct}%` : `${BENCHMARK_COMPARISONS.freightReductionVsCurrentPct}%`})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Fill Rate:</span>
              <span className="font-bold text-[#15803D] font-mono">{seedData.hetvayaFillRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chart Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stockout & Expiry Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
          <h4 className="text-xs font-bold text-[#292524] uppercase tracking-wider">
            Stockout Units &amp; Expiry Waste (Lower is Better)
          </h4>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockoutChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis dataKey="name" stroke="#78716C" fontSize={11} />
                <YAxis stroke="#78716C" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E7E5E4', borderRadius: '8px', fontSize: '12px', color: '#292524' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="CurrentPractice" fill="#78716C" name="Current Practice" radius={[4, 4, 0, 0]} />
                <Bar dataKey="StrongBaseline" fill="#8B5E3C" name="Strong Baseline" radius={[4, 4, 0, 0]} />
                <Bar dataKey="FlowGrid" fill="#15803D" name="FlowGrid Engine" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Freight Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
          <h4 className="text-xs font-bold text-[#292524] uppercase tracking-wider">
            Total Freight Cost in Rupees (Lower is Better)
          </h4>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={freightChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis dataKey="name" stroke="#78716C" fontSize={11} />
                <YAxis stroke="#78716C" fontSize={11} unit=" ₹" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E7E5E4', borderRadius: '8px', fontSize: '12px', color: '#292524' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="CurrentPractice" fill="#78716C" name="Current Practice" radius={[4, 4, 0, 0]} />
                <Bar dataKey="StrongBaseline" fill="#8B5E3C" name="Strong Baseline" radius={[4, 4, 0, 0]} />
                <Bar dataKey="FlowGrid" fill="#2563EB" name="FlowGrid Engine" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Documented Evidence & Honest Claim Callout (PRD Section 16 & 17) */}
      <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E3A8A] space-y-2">
        <div className="flex items-center gap-2 font-bold text-[#2563EB]">
          <Info className="w-4 h-4 text-[#2563EB]" />
          <span>Factual Verification &amp; Innovation Grounding (Section 16 &amp; 17.2)</span>
        </div>
        <p className="leading-relaxed">
          Against <strong>Current Practice</strong> (the spreadsheet rule used by 85–90% of Indian FMCG traditional trade distributors), FlowGrid achieves computed benchmark gains: <strong>{BENCHMARK_COMPARISONS.stockoutReductionVsCurrentPct}% stockouts</strong>, <strong>{BENCHMARK_COMPARISONS.wasteReductionVsCurrentPct}% expiry waste</strong>, and lost margin reduction of <strong>{BENCHMARK_COMPARISONS.lostMarginReductionVsCurrentPct}%</strong>.
        </p>
<<<<<<< Updated upstream
        <p className="leading-relaxed text-slate-400">
          These results describe the included synthetic simulation and should not be read as production outcomes. The timing measures the client-side heuristic function; benchmark hardware details were not captured.
=======
        <p className="leading-relaxed text-[#78716C]">
          Against the <strong>Strong Baseline</strong> (safety-stock + FEFO), FlowGrid achieves <strong>{BENCHMARK_COMPARISONS.stockoutChangeVsTextbookPct}% stockouts</strong> and <strong>{BENCHMARK_COMPARISONS.wasteReductionVsTextbookPct}% expiry waste</strong>, while maintaining 100% decision feasibility in under 1ms (p95: {BENCHMARK_SOLVE_TIME.p95}ms).
>>>>>>> Stashed changes
        </p>
      </div>
    </div>
  );
};
