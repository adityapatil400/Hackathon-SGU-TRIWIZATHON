import React from 'react';
import {
  Sparkles,
  X,
  ArrowRight,
  CheckCircle2,
  Play,
  RotateCcw,
  WifiOff,
  BarChart3,
  Cpu,
  Layers,
  HelpCircle
} from 'lucide-react';
import { ActiveTab } from './Navbar';
import { BENCHMARK_COMPARISONS } from '../data/mockData';
import { useTranslation } from '../context/TranslationContext';

interface DemoWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onTriggerGenerate: () => void;
  onTriggerStaleConflict: () => void;
  onToggleOffline: () => void;
}

export const DemoWalkthroughModal: React.FC<DemoWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onTriggerGenerate,
  onTriggerStaleConflict,
  onToggleOffline,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const demoSteps = [
    {
      step: 1,
      title: 'Import & Validate Master Data (FR-02, J1)',
      desc: 'Verify schema, foreign keys, and the 5% error threshold rule (≤5% commits valid rows, >5% transactional rollback). Demonstrates single sales path deduplication.',
      tab: 'import' as ActiveTab,
      actionLabel: 'Go to Data Import',
      action: () => onNavigateTab('import'),
    },
    {
      step: 2,
      title: 'Review Demand Quantiles & Stockout Correction (FR-08, J2)',
      desc: 'Inspect 7-day quantile forecasts (p10 to p95). Notice how stockout days are corrected (RC2) to prevent downward replenishment spirals, and ML switches between HistGradientBoosting and moving average.',
      tab: 'forecast' as ActiveTab,
      actionLabel: 'Review Demand Intelligence',
      action: () => onNavigateTab('forecast'),
    },
    {
      step: 3,
      title: 'Generate Plan & Inspect Explainable AI Reason Card (FR-09, FR-10, J3)',
      desc: 'Review the generated allocation and open a reason card to inspect forecast demand, available stock, arrival shelf-life, and the alternative warehouse comparison.',
      tab: 'plans' as ActiveTab,
      actionLabel: 'Generate & Explain Plan',
      action: () => {
        onNavigateTab('plans');
        onTriggerGenerate();
      },
    },
    {
      step: 4,
      title: 'Simulate 409 Snapshot Stale Conflict & 1-Click Re-plan (FR-11, FR-11b)',
      desc: 'Simulate what happens when physical stock changes during planner review. Approval is blocked with 409 for affected lines, and one click re-plans only those lines without disturbing approved stock.',
      tab: 'plans' as ActiveTab,
      actionLabel: 'Simulate 409 Stale Conflict',
      action: () => {
        onNavigateTab('plans');
        onTriggerStaleConflict();
      },
    },
    {
      step: 5,
      title: 'Offline Store Management POS Capture & Conflict Resolution (FR-05, FR-06, J5)',
      desc: 'Toggle offline mode to simulate weak village network. Record sales and receipts into the offline queue with unique UUIDs. Reconnect and watch them sync with zero duplicates or data loss.',
      tab: 'retailer' as ActiveTab,
      actionLabel: 'Test Offline Store Management POS',
      action: () => {
        onNavigateTab('retailer');
        onToggleOffline();
      },
    },
    {
      step: 6,
      title: 'Benchmark Against Current Practice & Strong Baseline (FR-13, J6)',
      desc: `Compare policies on the included synthetic benchmark: ${BENCHMARK_COMPARISONS.stockoutReductionVsCurrentPct}% stockouts and ${BENCHMARK_COMPARISONS.wasteReductionVsCurrentPct}% expiry waste versus the current-practice simulation. These are simulated results, not production guarantees.`,
      tab: 'benchmark' as ActiveTab,
      actionLabel: 'View Impact Benchmark',
      action: () => onNavigateTab('benchmark'),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-[#FAF3E0] border-b border-[#E7E5E4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1E293B]">
                {t('modal.demoTitle', '3-Minute Hackathon Demo Script (Section 20)')}
              </h3>
              <p className="text-xs text-[#64748B]">{t('modal.demoSubtitle', 'Step-by-step evaluator guide to Problem Statement 2')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white hover:bg-[#FFF8E7] border border-[#E7E5E4] text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step List */}
        <div className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {demoSteps.map(step => (
            <div
              key={step.step}
              className="p-4 rounded-xl bg-white border border-[#E7E5E4] hover:border-[#2563EB]/50 hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
            >
              <div className="space-y-1 max-w-md">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#EFF6FF] text-[#2563EB] font-bold text-[11px] flex items-center justify-center border border-[#BFDBFE]">
                    {step.step}
                  </span>
                  <h4 className="text-xs font-bold text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                    {step.title}
                  </h4>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed pl-7">
                  {step.desc}
                </p>
              </div>

              <button
                onClick={() => {
                  step.action();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-all flex items-center gap-1.5 shrink-0 ml-7 sm:ml-0 cursor-pointer"
              >
                <span>{step.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#FFF8E7] border-t border-[#E7E5E4] flex items-center justify-between text-xs text-[#64748B]">
          <span>HETVAYA Enterprise • FMCG Trade Distribution Intelligence</span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-[#1E293B] hover:bg-[#FAF3E0] bg-white border border-[#E7E5E4] rounded-lg transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
