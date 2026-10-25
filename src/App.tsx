import React, { useState, useEffect } from 'react';
import {
  Navbar,
  ActiveTab
} from './components/Navbar';
import { PlanGeneratorView } from './components/PlanGeneratorView';
import { ForecastReviewView } from './components/ForecastReviewView';
import { BaselineComparisonView } from './components/BaselineComparisonView';
import { WarehouseOpsView } from './components/WarehouseOpsView';
import { KiranaRetailerView } from './components/KiranaRetailerView';
import { ImportStudioView } from './components/ImportStudioView';
import { AdminHealthView } from './components/AdminHealthView';
import { SmartDispatchView } from './components/SmartDispatchView';
import { MapSection } from './components/map-section/MapSection';
import { DemoWalkthroughModal } from './components/DemoWalkthroughModal';
import { WhatIfSimulatorModal } from './components/WhatIfSimulatorModal';
import { Sun, Moon } from 'lucide-react';

import {
  INITIAL_PRODUCTS,
  INITIAL_WAREHOUSES,
  INITIAL_RETAILERS,
  INITIAL_ROUTES,
  INITIAL_BATCHES,
  INITIAL_FORECASTS
} from './data/mockData';

import {
  Product,
  Warehouse,
  Retailer,
  Route,
  InventoryBatch,
  DemandForecast,
  PlanRun,
  AllocationLine,
  ReasonCard,
  UserRole,
  SyncEvent,
  InTransitShipment,
  RejectionReason,
  ThemeMode
} from './types';

import { runOptimizationEngine } from './services/optimizationEngine';
import {
  getStoredEventQueue,
  enqueueEvent,
  processEventQueue
} from './services/offlineSyncService';
import { FlowGridAPI, BackendHealthStatus, setActiveUserRole } from './services/api';
import { PLAN_HORIZON_DAYS, SYNTHETIC_SALES_PANEL } from './data/demoScope';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('plans');
  const [userRole, setUserRole] = useState<UserRole>('rohit');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [backendStatus, setBackendStatus] = useState<BackendHealthStatus | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('day');

  const handleToggleTheme = () => setTheme(prev => prev === 'night' ? 'day' : 'night');

  // Sync active user persona with API client
  useEffect(() => {
    setActiveUserRole(userRole);
  }, [userRole]);

  // Core Data State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);
  const [retailers, setRetailers] = useState<Retailer[]>(INITIAL_RETAILERS);
  const [routes, setRoutes] = useState<Route[]>(INITIAL_ROUTES);
  const [batches, setBatches] = useState<InventoryBatch[]>(INITIAL_BATCHES);
  const [forecasts, setForecasts] = useState<DemandForecast[]>(INITIAL_FORECASTS);

  // In-Transit Shipments
  const [inTransitShipments, setInTransitShipments] = useState<InTransitShipment[]>([
    {
      id: 'TR-PUN-GAN-001',
      planLineId: 'LINE-INIT-1',
      warehouseId: 'WH-01',
      retailerId: 'STORE-001',
      sku: 'SKU-001',
      batchNo: 'LOT-2',
      cases: 10,
      units: 120,
      dispatchedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      eta: '2026-10-25',
      status: 'IN_TRANSIT',
    },
    {
      id: 'TR-PUN-GAN-002',
      planLineId: 'LINE-INIT-2',
      warehouseId: 'WH-01',
      retailerId: 'STORE-001',
      sku: 'SKU-002',
      batchNo: 'LOT-1',
      cases: 6,
      units: 72,
      dispatchedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      eta: '2026-10-25',
      status: 'IN_TRANSIT',
    },
  ]);

  // Offline Event Queue
  const [queuedEvents, setQueuedEvents] = useState<SyncEvent[]>([]);

  // Optimization Plan State
  const [planRun, setPlanRun] = useState<PlanRun | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Modals
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [isWhatIfModalOpen, setIsWhatIfModalOpen] = useState<boolean>(false);

  // Initial backend health probe & data load
  useEffect(() => {
    let isMounted = true;

    const bootstrapBackend = async () => {
      const health = await FlowGridAPI.checkHealth();
      if (!isMounted) return;
      setBackendStatus(health);

      if (health.isOnline) {
        try {
          const [p, w, r, b] = await Promise.all([
            FlowGridAPI.getProducts(),
            FlowGridAPI.getWarehouses(),
            FlowGridAPI.getRetailers(),
            FlowGridAPI.getBatches(),
          ]);
          if (!isMounted) return;
          if (p.length > 0) setProducts(p);
          if (w.length > 0) setWarehouses(w);
          if (r.length > 0) setRetailers(r);
          if (b.length > 0) setBatches(b);
        } catch (e) {
          console.warn('Real backend catalog fetch notice:', e);
        }
      }
    };

    bootstrapBackend();
    setQueuedEvents(getStoredEventQueue());

    // Generate initial plan
    const initialPlan = runOptimizationEngine({
      products: INITIAL_PRODUCTS,
      warehouses: INITIAL_WAREHOUSES,
      retailers: INITIAL_RETAILERS,
      routes: INITIAL_ROUTES,
      batches: INITIAL_BATCHES,
      forecasts: INITIAL_FORECASTS,
    });
    setPlanRun(initialPlan);

    // Heartbeat health check
    const timer = setInterval(async () => {
      const h = await FlowGridAPI.checkHealth();
      if (isMounted) setBackendStatus(h);
    }, 12000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Handler: Generate or Re-generate Optimization Plan
  const handleGeneratePlan = async (simulateTimeout: boolean = false) => {
    setIsGenerating(true);

    // Try real backend AI FMCG Distribution Engine if online and not testing timeout
    if (!simulateTimeout && (backendStatus?.isOnline ?? false)) {
      try {
        const result = await FlowGridAPI.runDistributionEngine({
          top_n_skus: 20,
          num_stores: 10,
          use_net_replenishment: true,
          create_plan_record: true,
        });

        const recs = result.module_3_distribution_recommendations || [];
        let totalCases = 0;
        let totalFreight = 0;

        const lines: AllocationLine[] = recs.map((rec, idx) => {
          const cases = Math.max(1, Math.round(rec.quantity / 12));
          const costVal = parseFloat(rec.estimated_cost.replace(/[^0-9.]/g, '')) || 12;
          const freight = Math.round(costVal * cases);
          totalCases += cases;
          totalFreight += freight;

          const match = rec.product.match(/(SKU-\d+)/);
          const sku = match ? match[1] : `SKU-${String(idx + 1).padStart(3, '0')}`;

          const reasonCard: ReasonCard = {
            summary: rec.reason,
            skuName: rec.product,
            retailerName: rec.to_store,
            sourceWarehouseName: rec.from_warehouse,
            demandMedian: rec.quantity,
            demandP95: Math.round(rec.quantity * 1.35),
            effectiveStockBefore: 8,
            effectiveStockAfter: 8 + rec.quantity,
            casesAllocated: cases,
            unitsAllocated: rec.quantity,
            shelfLifeOnArrivalPct: 88,
            minRequiredShelfLifePct: 70,
            shelfLifeDaysRemaining: 75,
            latenessDays: 0,
            latenessCostRupees: 0,
            marginalTiers: [],
            cutoffReason: rec.reason,
          };

          return {
            id: `LINE-${String(idx + 1).padStart(3, '0')}`,
            planRunId: result.plan_code || `PLAN-AI-${Date.now().toString().slice(-6)}`,
            warehouseId: rec.from_warehouse,
            retailerId: rec.to_store,
            sku,
            batchNo: `LOT-${rec.from_warehouse}-${idx + 1}`,
            cases,
            units: rec.quantity,
            freightRupees: freight,
            arrivalDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
            shelfLifeOnArrivalPct: 88,
            explanation: reasonCard,
            status: 'PROPOSED' as const,
            reservationExpiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
          };
        });

        const newPlan: PlanRun = {
          id: result.plan_code || `PLAN-AI-${Date.now().toString().slice(-6)}`,
          createdAt: new Date().toISOString(),
          createdBy: 'Rohit Sharma (Supply Chain Planner)',
          cycleStart: new Date().toISOString().split('T')[0],
          status: 'PROVISIONAL',
          snapshotHash: 'not-provided-by-api',
          solverStatus: 'FEASIBLE',
          totalCases,
          totalFreightRupees: totalFreight,
          lines,
          unmet: [],
          staleLocations: [],
          executiveDispatchBriefing: result.executive_dispatch_briefing,
          keyFeatureInsights: result.key_feature_insights,
        };

        setPlanRun(newPlan);

        setIsGenerating(false);
        return;
      } catch (err) {
        console.warn('Real backend AI engine fallback to local simulation:', err);
      }
    }

    // Resilient local simulation fallback
    setTimeout(() => {
      const newPlan = runOptimizationEngine({
        products,
        warehouses,
        retailers,
        routes,
        batches,
        forecasts,
        simulateTimeout,
      });
      setPlanRun(newPlan);
      setIsGenerating(false);
    }, 450);
  };

  // Handler: Approve All Lines
  const handleApproveAll = async () => {
    if (!planRun) return;

    // Call backend approval endpoint if backend is live and plan has backend ID
    if (backendStatus?.isOnline && planRun.id.startsWith('PLAN-AI-')) {
      try {
        await FlowGridAPI.approvePlan(planRun.id);
      } catch (err) {
        console.warn('Backend approval sync notice:', err);
      }
    }

    const updatedLines = planRun.lines.map(line => ({
      ...line,
      status: 'APPROVED' as const,
    }));
    setPlanRun({
      ...planRun,
      status: 'APPROVED',
      lines: updatedLines,
    });
  };

  // Handler: Approve Single Line
  const handleApproveLine = (lineId: string) => {
    if (!planRun) return;
    const updatedLines = planRun.lines.map(line =>
      line.id === lineId ? { ...line, status: 'APPROVED' as const } : line
    );
    setPlanRun({
      ...planRun,
      lines: updatedLines,
    });
  };

  // Handler: Override Line
  const handleOverrideLine = (lineId: string, newCases: number, reason: string) => {
    if (!planRun) return;
    const updatedLines = planRun.lines.map(line => {
      if (line.id === lineId) {
        const prod = products.find(p => p.sku === line.sku);
        const caseSize = prod?.caseSize || 12;
        const newUnits = newCases * caseSize;
        return {
          ...line,
          cases: newCases,
          units: newUnits,
          status: 'OVERRIDDEN' as const,
          override: {
            originalCases: line.cases,
            newCases,
            reason,
            overriddenBy: 'Rohit Deshpande (Planner)',
            timestamp: new Date().toISOString(),
          },
        };
      }
      return line;
    });

    setPlanRun({
      ...planRun,
      lines: updatedLines,
    });
  };

  // Handler: Simulate 409 Snapshot Stale Conflict (FR-11, T9)
  const handleSimulateStaleConflict = () => {
    if (!planRun) return;
    // Mark the first line as STALE (e.g. batch stock changed on warehouse dock)
    const updatedLines = planRun.lines.map((line, idx) =>
      idx === 0 ? { ...line, status: 'STALE' as const } : line
    );
    setPlanRun({
      ...planRun,
      lines: updatedLines,
    });
  };

  // Handler: Re-plan Stale Lines from Fresh Snapshot (FR-11b)
  const handleReplanStaleLines = () => {
    if (!planRun) return;
    const freshPlan = runOptimizationEngine({
      products,
      warehouses,
      retailers,
      routes,
      batches,
      forecasts,
    });

    // Replace stale lines with freshly computed optimal lines
    const preservedApprovedLines = planRun.lines.filter(l => l.status === 'APPROVED');
    const freshReplacedLines = freshPlan.lines.filter(
      fl => !preservedApprovedLines.some(al => al.id === fl.id)
    );

    setPlanRun({
      ...planRun,
      lines: [...preservedApprovedLines, ...freshReplacedLines],
    });
  };

  // Handler: Warehouse Dispatch Line -> in_transit (J4)
  const handleDispatchLine = (lineId: string) => {
    if (!planRun) return;
    const line = planRun.lines.find(l => l.id === lineId);
    if (!line) return;

    // Shift line status to DISPATCHED
    const updatedLines = planRun.lines.map(l =>
      l.id === lineId ? { ...l, status: 'DISPATCHED' as const } : l
    );
    setPlanRun({
      ...planRun,
      lines: updatedLines,
    });

    // Create In-Transit record
    const newShipment: InTransitShipment = {
      id: `TR-${Date.now().toString().slice(-6)}`,
      planLineId: line.id,
      warehouseId: line.warehouseId,
      retailerId: line.retailerId,
      sku: line.sku,
      batchNo: line.batchNo,
      cases: line.cases,
      units: line.units,
      dispatchedAt: new Date().toISOString(),
      eta: line.arrivalDate,
      status: 'IN_TRANSIT',
    };

    setInTransitShipments(prev => [newShipment, ...prev]);

    // Decrement physical batch stock and increment version (Section 11.3)
    setBatches(prev => prev.map(b => {
      if (b.batchNo === line.batchNo) {
        return {
          ...b,
          qtyUnits: Math.max(0, b.qtyUnits - line.units),
          reservedUnits: Math.max(0, b.reservedUnits - line.units),
          version: b.version + 1,
        };
      }
      return b;
    }));
  };

  // Handler: Warehouse Batch Stock Count
  const handleUpdateBatchCount = (batchId: string, countedUnits: number) => {
    setBatches(prev => prev.map(b => {
      if (b.id === batchId) {
        return {
          ...b,
          qtyUnits: countedUnits,
          version: b.version + 1,
          asOf: new Date().toISOString(),
        };
      }
      return b;
    }));

    enqueueEvent('STOCK_COUNT', { batchId, qtyUnits: countedUnits, asOf: new Date().toISOString() }, isOnline);
    setQueuedEvents(getStoredEventQueue());
  };

  // Handler: Kirana Sale Entry (FR-04 single sales path)
  const handleRecordSale = (sku: string, unitsSold: number) => {
    enqueueEvent(
      'SALE',
      { retailerId: 'RET-GAN', sku, unitsSold, date: new Date().toISOString().split('T')[0] },
      isOnline
    );
    setQueuedEvents(getStoredEventQueue());
  };

  // Handler: Kirana Stock Count
  const handleRecordStockCount = (sku: string, closingUnits: number) => {
    enqueueEvent(
      'STOCK_COUNT',
      { retailerId: 'RET-GAN', sku, closingUnits, asOf: new Date().toISOString() },
      isOnline
    );
    setQueuedEvents(getStoredEventQueue());
  };

  // Handler: Kirana Receipt Confirmation
  const handleRecordReceipt = (
    shipmentId: string,
    acceptedCases: number,
    rejectedCases: number,
    reason?: RejectionReason
  ) => {
    setInTransitShipments(prev => prev.map(s => {
      if (s.id === shipmentId) {
        return {
          ...s,
          status: rejectedCases === 0 ? 'RECEIVED' : acceptedCases === 0 ? 'REJECTED' : 'PARTIAL',
          acceptedCases,
          rejectedCases,
          rejectionReason: reason,
        };
      }
      return s;
    }));

    enqueueEvent(
      'RECEIPT',
      { shipmentId, acceptedCases, rejectedCases, rejectionReason: reason },
      isOnline
    );
    setQueuedEvents(getStoredEventQueue());
  };

  // Handler: Trigger Queue Sync (Section 15.3)
  const handleTriggerSync = () => {
    const existingMap = new Map<string, string>();
    batches.forEach(b => existingMap.set(b.id, b.asOf));

    const result = processEventQueue(queuedEvents, existingMap);
    setQueuedEvents(result.processedEvents.filter(e => e.status === 'QUEUED'));
  };

  const currentKirana = retailers.find(r => r.id === 'RET-GAN') || retailers[0];

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row transition-colors duration-200 ${
      theme === 'night' ? 'theme-night bg-slate-950 text-slate-100' : 'theme-day bg-[#F8F7F5] text-[#292524]'
    }`}>
      {/* Left Sidebar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        isOnline={isOnline}
        setIsOnline={setIsOnline}
        queuedEventCount={queuedEvents.filter(e => e.status === 'QUEUED').length}
        onOpenDemoModal={() => setIsDemoModalOpen(true)}
        onOpenWhatIfModal={() => setIsWhatIfModalOpen(true)}
        onTriggerSync={handleTriggerSync}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Context Sub-Bar (Desktop) */}
        <div className={`hidden lg:flex flex-wrap items-center justify-between gap-x-5 gap-y-2 px-6 py-2.5 border-b text-xs transition-colors duration-200 ${
          theme === 'night'
            ? 'bg-slate-900/40 border-slate-800/80 text-slate-400'
            : 'bg-white border-[#E7E5E4] text-[#78716C] shadow-xs'
        }`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`font-bold capitalize ${theme === 'night' ? 'text-slate-200' : 'text-[#292524]'}`}>
              {activeTab === 'plans' ? 'Allocation Plan & AI Engine' :
               activeTab === 'forecast' ? 'Demand Forecasting Intelligence' :
               activeTab === 'map' ? 'Demand Map Intelligence' :
               activeTab === 'benchmark' ? 'Baseline Impact Benchmark' :
               activeTab === 'dispatch' ? 'Smart Delivery Agent & Native Driver Dispatch' :
               activeTab === 'warehouse' ? 'Warehouse Picking & Operations' :
               activeTab === 'retailer' ? 'Kirana Field POS & Capture' :
               activeTab === 'import' ? 'Master Data Import Studio' :
               'System Health & Monitoring'}
            </span>
            <span className={theme === 'night' ? 'text-slate-600' : 'text-[#E7E5E4]'}>•</span>
            <span className={theme === 'night' ? 'text-slate-400' : 'text-[#78716C]'}>{PLAN_HORIZON_DAYS}-day planning horizon • W43</span>
            <span className={theme === 'night' ? 'text-slate-600' : 'text-[#E7E5E4]'}>•</span>
            <span className={`font-mono text-[11px] font-semibold ${theme === 'night' ? 'text-indigo-400' : 'text-[#8B5E3C]'}`}>
              Maharashtra Logistics Grid (Pune Hub, Satara, Kolhapur)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className={theme === 'night' ? 'text-slate-400' : 'text-[#78716C]'}>Avg Kirana Margin: <strong className="text-[#15803D]">3–5%</strong></span>
            <span className={theme === 'night' ? 'text-slate-600' : 'text-[#E7E5E4]'}>•</span>
            <span className={theme === 'night' ? 'text-slate-400' : 'text-[#78716C]'}>
              Solve Time: <strong className={theme === 'night' ? 'text-indigo-400' : 'text-[#2563EB]'}>{planRun?.solveSeconds ? `${(planRun.solveSeconds * 1000).toFixed(2)}ms` : '<1ms'}</strong>
            </span>
            {/* Quick Theme Toggle Button */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs transition-all cursor-pointer shadow-xs ${
                theme === 'night'
                  ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                  : 'bg-[#E9D8C8] text-[#8B5E3C] border border-[#8B5E3C]/30 hover:bg-[#8B5E3C] hover:text-white'
              }`}
            >
              {theme === 'night' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                  <span>Night Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#8B5E3C]" />
                  <span>Day Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* View Switcher based on Active Tab */}
          {activeTab === 'plans' && (
            <PlanGeneratorView
              planRun={planRun}
              onGeneratePlan={handleGeneratePlan}
              onApproveAll={handleApproveAll}
              onApproveLine={handleApproveLine}
              onOverrideLine={handleOverrideLine}
              onSimulateStaleConflict={handleSimulateStaleConflict}
              onReplanStaleLines={handleReplanStaleLines}
              products={products}
              warehouses={warehouses}
              retailers={retailers}
              batches={batches}
              isGenerating={isGenerating}
            />
          )}

          {activeTab === 'dispatch' && (
            <SmartDispatchView
              theme={theme}
              onToggleTheme={handleToggleTheme}
            />
          )}

          {activeTab === 'forecast' && (
            <ForecastReviewView
              forecasts={forecasts}
              products={products}
              retailers={retailers}
            />
          )}

          {activeTab === 'map' && <MapSection />}

          {activeTab === 'benchmark' && (
            <BaselineComparisonView />
          )}

          {activeTab === 'warehouse' && (
            <WarehouseOpsView
              warehouses={warehouses}
              batches={batches}
              approvedLines={planRun?.lines || []}
              products={products}
              retailers={retailers}
              onDispatchLine={handleDispatchLine}
              onUpdateBatchCount={handleUpdateBatchCount}
              isOnline={isOnline}
            />
          )}

          {activeTab === 'retailer' && (
            <KiranaRetailerView
              currentRetailer={currentKirana}
              products={products}
              inTransitShipments={inTransitShipments}
              onRecordSale={handleRecordSale}
              onRecordReceipt={handleRecordReceipt}
              onRecordStockCount={handleRecordStockCount}
              queuedEvents={queuedEvents}
              isOnline={isOnline}
              onTriggerSync={handleTriggerSync}
            />
          )}

          {activeTab === 'import' && (
            <ImportStudioView />
          )}

          {activeTab === 'health' && (
            <AdminHealthView />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#E7E5E4] bg-white py-5 text-xs text-[#78716C] mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-medium">
              FlowGrid Distribution Intelligence &amp; Inventory Optimization Engine • Problem Statement 2 (FMCG)
            </p>
            <p className="text-[11px] text-[#78716C]">
              Greedy Marginal Allocation • Scikit-learn Quantile ML • React 19 • Offline Resilient Event Queue
            </p>
            <a href="/" className="text-indigo-300 hover:text-white transition-colors">
              Landing page
            </a>
          </div>
        </footer>
      </div>

      {/* 3-Minute Demo Walkthrough Modal */}
      <DemoWalkthroughModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onNavigateTab={tab => setActiveTab(tab)}
        onTriggerGenerate={() => handleGeneratePlan(false)}
        onTriggerStaleConflict={handleSimulateStaleConflict}
        onToggleOffline={() => setIsOnline(false)}
      />

      {/* What-If Scenario Simulator Modal */}
      <WhatIfSimulatorModal
        isOpen={isWhatIfModalOpen}
        onClose={() => setIsWhatIfModalOpen(false)}
        baseCases={planRun?.totalCases || 38}
        baseFreight={planRun?.totalFreightRupees || 1420}
        baseMargin={planRun?.expectedMarginRupees || 49958}
      />
    </div>
  );
};


export default App;
