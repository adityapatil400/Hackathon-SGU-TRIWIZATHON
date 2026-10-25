import React, { useState } from 'react';
import {
  Zap,
  Filter,
  Sparkles,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { DemandForecast, Product, Retailer } from '../types';
import { useTranslation } from '../context/TranslationContext';

interface ForecastReviewViewProps {
  forecasts: DemandForecast[];
  products: Product[];
  retailers: Retailer[];
}

export const ForecastReviewView: React.FC<ForecastReviewViewProps> = ({
  forecasts,
  products,
  retailers,
}) => {
  const { t, formatNumber } = useTranslation();
  const [selectedRetailer, setSelectedRetailer] = useState<string>('RET-GAN');
  const [selectedSku, setSelectedSku] = useState<string>('SKU-ATT-05');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [showStockoutCorrectedOnly, setShowStockoutCorrectedOnly] = useState<boolean>(false);

  const activeForecast = forecasts.find(
    f => f.retailerId === selectedRetailer && f.sku === selectedSku
  ) || forecasts[0];

  const activeProduct = products.find(p => p.sku === (activeForecast?.sku || selectedSku));
  const activeRetailer = retailers.find(r => r.id === (activeForecast?.retailerId || selectedRetailer));

  // Generate simulated 7-day quantile spread daily fan
  const dailyQuantileData = [
    { day: 'Mon', p10: Math.round(activeForecast.q10 / 7 * 0.9), p50: Math.round(activeForecast.q50 / 7 * 0.95), p95: Math.round(activeForecast.q95 / 7 * 1.05) },
    { day: 'Tue', p10: Math.round(activeForecast.q10 / 7 * 0.95), p50: Math.round(activeForecast.q50 / 7 * 0.98), p95: Math.round(activeForecast.q95 / 7 * 1.02) },
    { day: 'Wed', p10: Math.round(activeForecast.q10 / 7 * 1.0), p50: Math.round(activeForecast.q50 / 7 * 1.0), p95: Math.round(activeForecast.q95 / 7 * 1.0) },
    { day: 'Thu', p10: Math.round(activeForecast.q10 / 7 * 1.02), p50: Math.round(activeForecast.q50 / 7 * 1.02), p95: Math.round(activeForecast.q95 / 7 * 1.04) },
    { day: 'Fri', p10: Math.round(activeForecast.q10 / 7 * 1.1), p50: Math.round(activeForecast.q50 / 7 * 1.15), p95: Math.round(activeForecast.q95 / 7 * 1.18) },
    { day: 'Sat', p10: Math.round(activeForecast.q10 / 7 * 1.3), p50: Math.round(activeForecast.q50 / 7 * 1.4), p95: Math.round(activeForecast.q95 / 7 * 1.45) },
    { day: 'Sun', p10: Math.round(activeForecast.q10 / 7 * 1.25), p50: Math.round(activeForecast.q50 / 7 * 1.35), p95: Math.round(activeForecast.q95 / 7 * 1.38) },
  ];

  const filteredForecasts = forecasts.filter(f => {
    if (filterMethod !== 'all' && f.method !== filterMethod) return false;
    if (showStockoutCorrectedOnly && !f.stockoutCorrected) return false;
    return true;
  });

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Header Overview */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1E293B] tracking-tight">
              {t('forecast.title', 'AI Demand Intelligence & Quantile Forecasts')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              FR-08 Quantile ML
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            {t('forecast.subtitle', '7-day replenishment cycle quantiles (p10 to p95) • Scikit-learn HistGradientBoosting vs 4-week Moving Average Baseline • Stockout Day Correction (RC2)')}
          </p>
        </div>

        {/* Forecast Health Badge */}
        <div className="flex items-center gap-3 bg-[#FFF8E7] border border-[#E7E5E4] px-3.5 py-2 rounded-xl">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">Model WAPE</span>
            <span className="text-sm font-black text-[#15803D] font-mono">14.2%</span>
          </div>
          <div className="h-6 w-px bg-[#E7E5E4]" />
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">Coverage (p95)</span>
            <span className="text-sm font-black text-[#2563EB] font-mono">94.3%</span>
          </div>
          <div className="h-6 w-px bg-[#E7E5E4]" />
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">Bias</span>
            <span className="text-sm font-black text-[#1E293B] font-mono">+0.0%</span>
          </div>
        </div>
      </div>

      {/* Selected SKU Quantile Breakdown Card */}
      {activeForecast && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Panel */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                  <span>{activeProduct?.name}</span>
                  <span className="text-xs font-normal text-[#64748B]">@ {activeRetailer?.name}</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Quantile Fan Spread (10th percentile floor to 95th percentile peak)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                  {activeForecast.method}
                </span>
                {activeForecast.stockoutCorrected && (
                  <span className="px-2 py-1 rounded text-xs font-bold bg-[#FFF8E7] text-[#EA580C] border border-[#E7E5E4] flex items-center gap-1" title="Stockout day was corrected to historical median (RC2)">
                    <Sparkles className="w-3 h-3 text-[#EAB308]" /> Stockout Corrected
                  </span>
                )}
              </div>
            </div>

            {/* Recharts Area Fan Chart */}
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyQuantileData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02}/>
                    </linearGradient>
                    <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#15803D" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#15803D" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                  <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} unit=" u" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E7E5E4', borderRadius: '8px', fontSize: '12px', color: '#1E293B' }}
                    labelStyle={{ color: '#1E293B', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="p95" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#p95Grad)" name="95th %ile (Peak)" />
                  <Area type="monotone" dataKey="p50" stroke="#15803D" strokeWidth={2.5} fillOpacity={1} fill="url(#p50Grad)" name="Median (q50)" />
                  <Area type="monotone" dataKey="p10" stroke="#EA580C" strokeWidth={1.5} fill="none" strokeDasharray="4 4" name="10th %ile (Floor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#E7E5E4]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]"></span>
                <span>Median (q50): {formatNumber(activeForecast.q50)} units</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                <span>95th %ile (q95): {formatNumber(activeForecast.q95)} units</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]"></span>
                <span>10th %ile (q10): {formatNumber(activeForecast.q10)} units</span>
              </span>
            </div>
          </div>

          {/* Model Intelligence & Stockout Correction Details */}
          <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 flex flex-col justify-between shadow-xs">
            <div>
              <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#2563EB]" />
                <span>Forecasting Algorithm Rules (Section 13)</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#FAF3E0] border border-[#E7E5E4]">
                  <div className="text-[#64748B] font-medium">Selected Technique:</div>
                  <div className="text-sm font-bold text-[#1E293B] mt-0.5">{activeForecast.method}</div>
                  <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                    {activeForecast.method === 'HistGradientBoosting'
                      ? 'Gradient boosting quantile loss with lag-7, 14, 28 features + festival proximity. Switched to because it beat 4-week MA.'
                      : activeForecast.method === 'Bootstrap'
                      ? 'Intermittent demand (interval ≥ 1.32 days): 1,000 resampled uncensored 7-day totals.'
                      : 'Peer transfer model: scaled from peer kiranas due to short history (<56 days).'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FFF8E7] border border-[#E7E5E4]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B] font-medium">Stockout Correction:</span>
                    <span className={activeForecast.stockoutCorrected ? 'text-[#15803D] font-bold' : 'text-[#64748B]'}>
                      {activeForecast.stockoutCorrected ? 'ACTIVE' : 'NONE DETECTED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                    Days where closing stock reached 0 were corrected to 4-week weekday median, preventing the kirana death spiral where zero stock creates zero forecast.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#E7E5E4]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B] font-medium">Last Week Accuracy:</span>
                    <span className="text-[#2563EB] font-semibold font-mono">
                      Actual {formatNumber(activeForecast.lastWeekActual)} vs Pred {formatNumber(activeForecast.q50)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Series WAPE: {Math.round(activeForecast.wape * 100)}% • Error is within 1.2× validation threshold (FR-18 Health Pass).
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#2563EB]">
              <span className="font-bold">Next Action:</span> These quantile curves feed the Marginal Value Tiers in Section 14.
            </div>
          </div>
        </div>
      )}

      {/* Series Filter and Comprehensive Table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E7E5E4] shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#64748B]" />
            <span className="text-xs font-semibold text-[#1E293B]">Filter Series (SKU × Kirana):</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <select
              value={filterMethod}
              onChange={e => setFilterMethod(e.target.value)}
              className="bg-[#FFF8E7] border border-[#E7E5E4] text-[#1E293B] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2563EB] cursor-pointer font-medium"
            >
              <option value="all">All ML Methods</option>
              <option value="HistGradientBoosting">HistGradientBoosting</option>
              <option value="MovingAverage">4-Week Moving Average</option>
              <option value="Bootstrap">Bootstrap Resampling</option>
              <option value="PeerTransfer">Peer Transfer</option>
            </select>

            <label className="flex items-center gap-2 cursor-pointer text-[#1E293B]">
              <input
                type="checkbox"
                checked={showStockoutCorrectedOnly}
                onChange={e => setShowStockoutCorrectedOnly(e.target.checked)}
                className="rounded border-[#E7E5E4] text-[#DC2626] focus:ring-0"
              />
              <span className="font-medium">Stockout Corrected Only (RC2)</span>
            </label>
          </div>
        </div>

        {/* Forecast Table */}
        <div className="rounded-2xl border border-[#E7E5E4] overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E7E5E4] bg-[#FAF3E0] text-[#64748B] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Kirana Retailer</th>
                  <th className="py-3 px-4">FMCG SKU</th>
                  <th className="py-3 px-4 text-center">10th %ile</th>
                  <th className="py-3 px-4 text-center">Median (q50)</th>
                  <th className="py-3 px-4 text-center">80th %ile</th>
                  <th className="py-3 px-4 text-center">90th %ile</th>
                  <th className="py-3 px-4 text-center font-bold text-[#2563EB]">95th %ile</th>
                  <th className="py-3 px-4">Model Used</th>
                  <th className="py-3 px-4">Flags</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {filteredForecasts.map((f, idx) => {
                  const ret = retailers.find(r => r.id === f.retailerId);
                  const prod = products.find(p => p.sku === f.sku);
                  const isSelected = selectedRetailer === f.retailerId && selectedSku === f.sku;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-[#FFF8E7]/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#EFF6FF]/60' : ''
                      }`}
                      onClick={() => {
                        setSelectedRetailer(f.retailerId);
                        setSelectedSku(f.sku);
                      }}
                    >
                      <td className="py-3 px-4 font-semibold text-[#1E293B]">
                        {ret?.name}
                        <span className="block text-[10px] text-[#64748B]">{ret?.city}</span>
                      </td>

                      <td className="py-3 px-4 font-bold text-[#1E293B]">
                        {prod?.name}
                        <span className="block text-[10px] text-[#64748B] font-mono whitespace-nowrap select-all">{prod?.sku}</span>
                      </td>

                      <td className="py-3 px-4 text-center text-[#64748B] font-mono">{formatNumber(f.q10)}</td>
                      <td className="py-3 px-4 text-center font-black text-sm text-[#15803D] font-mono">{formatNumber(f.q50)}</td>
                      <td className="py-3 px-4 text-center text-[#1E293B] font-mono">{formatNumber(f.q80)}</td>
                      <td className="py-3 px-4 text-center text-[#1E293B] font-mono">{formatNumber(f.q90)}</td>
                      <td className="py-3 px-4 text-center font-bold text-[#2563EB] font-mono">{formatNumber(f.q95)}</td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FFF8E7] text-[#1E293B] border border-[#E7E5E4]">
                          {f.method}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {f.stockoutCorrected && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FAF3E0] text-[#EA580C] border border-[#E7E5E4]">
                              CORRECTED
                            </span>
                          )}
                          {f.flags.map((flag, fIdx) => (
                            <span key={fIdx} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#FFF8E7] text-[#64748B] border border-[#E7E5E4]">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedRetailer(f.retailerId);
                            setSelectedSku(f.sku);
                          }}
                          className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#2563EB] text-white shadow-xs'
                              : 'text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE]'
                          }`}
                        >
                          View Curve
                        </button>
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
