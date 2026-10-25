import React, { useState } from 'react';
import {
  Truck,
  MapPin,
  ShieldCheck,
  Zap,
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRightLeft,
  Navigation,
  FileText,
  UserCheck,
  ChevronDown,
  Layers,
  Phone,
  Gauge,
  Compass,
  CornerDownRight,
  Sun,
  Moon
} from 'lucide-react';
import {
  ClientDeliveryOrder,
  NativeDriver,
  AddressClassification,
  ThemeMode
} from '../types';
import {
  INITIAL_CLIENT_DELIVERY_ORDERS,
  INITIAL_NATIVE_DRIVERS,
  calculateNativeAffinity,
  solveSmartDispatchAssignment
} from '../data/dispatchData';

interface SmartDispatchViewProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const SmartDispatchView: React.FC<SmartDispatchViewProps> = ({
  theme,
  onToggleTheme
}) => {
  const [orders, setOrders] = useState<ClientDeliveryOrder[]>(INITIAL_CLIENT_DELIVERY_ORDERS);
  const [drivers, setDrivers] = useState<NativeDriver[]>(INITIAL_NATIVE_DRIVERS);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [activeModeTab, setActiveModeTab] = useState<'FORWARD' | 'REVERSE'>('FORWARD');
  const [simulatingTripId, setSimulatingTripId] = useState<string | null>(null);
  const [simulationStep, setSimulationStep] = useState<string>('');
  const [selectedChalanOrder, setSelectedChalanOrder] = useState<ClientDeliveryOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isDay = theme === 'day';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter orders by classification
  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'NARROW' && order.addressClassification === 'NARROW_LANE') return true;
    if (activeFilter === 'GHAT' && order.addressClassification === 'GHAT_TERRAIN') return true;
    if (activeFilter === 'APMC' && order.addressClassification === 'APMC_MARKET') return true;
    if (activeFilter === 'PERI_URBAN' && order.addressClassification === 'PERI_URBAN') return true;
    if (activeFilter === 'HIGHWAY' && order.addressClassification === 'HIGHWAY_CORRIDOR') return true;
    return true;
  });

  // Calculate live stats
  const totalAssigned = orders.filter((o) => o.assignedDriverId !== null).length;
  const avgAffinity =
    totalAssigned > 0
      ? Math.round(
          orders.filter((o) => o.assignedDriverId !== null).reduce((sum, o) => sum + o.nativeMatchScore, 0) /
            totalAssigned
        )
      : 0;

  // Handle Smart AI Auto-Assign
  const handleAutoAssign = () => {
    const result = solveSmartDispatchAssignment(orders, drivers);
    setOrders(result.updatedOrders);
    setDrivers(result.updatedDrivers);
    showToast(
      `✓ Smart AI assigned ${result.totalAssigned} orders with ${result.avgNativeMatchPct}% average Native Driver affinity! Saved ₹${result.totalFreightSavingsRupees} in backhauls.`
    );
  };

  // Handle Manual Driver Re-assignment
  const handleReassign = (orderId: string, driverId: string) => {
    const order = orders.find((o) => o.id === orderId);
    const driver = drivers.find((d) => d.id === driverId);
    if (!order || !driver) return;

    const evalResult = calculateNativeAffinity(order, driver);

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            assignedDriverId: driverId,
            nativeMatchScore: evalResult.score,
            status: 'ASSIGNED'
          };
        }
        return o;
      })
    );

    if (!evalResult.isCompatible) {
      showToast(
        `⚠️ Warning: ${driver.name}'s vehicle (${driver.vehicleWidthMeters}m) exceeds or tight-fits ${order.clientName}'s lane (${order.laneWidthMeters}m)!`
      );
    } else {
      showToast(`✓ Assigned ${driver.name} to ${order.clientName} (${evalResult.score}% Native Match).`);
    }
  };

  // Simulate Live Delivery Transit
  const handleSimulateDelivery = (order: ClientDeliveryOrder) => {
    if (!order.assignedDriverId) {
      showToast('⚠️ Please assign a native driver first!');
      return;
    }
    const driver = drivers.find((d) => d.id === order.assignedDriverId);
    const driverName = driver?.name || 'Driver';

    setSimulatingTripId(order.id);
    setSimulationStep(`1/3: ${driverName} departing hub with ${order.totalCases} cases...`);

    // Shift to IN_TRANSIT
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: 'IN_TRANSIT' } : o))
    );

    setTimeout(() => {
      setSimulationStep(
        `2/3: ${driverName} cleared ${order.laneWidthMeters}m narrow alley via landmark: "${order.localLandmark}" using native dialect shortcut!`
      );
    }, 2000);

    setTimeout(() => {
      setSimulationStep(`3/3: Arrived at ${order.clientName}. Delivery verified with 0 shelf-life rejections!`);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: 'DELIVERED' } : o))
      );
      setTimeout(() => {
        setSimulatingTripId(null);
        setSimulationStep('');
        showToast(`✓ Order ${order.id} for ${order.clientName} successfully DELIVERED!`);
      }, 1500);
    }, 4500);
  };

  // Reset demo
  const handleReset = () => {
    setOrders(INITIAL_CLIENT_DELIVERY_ORDERS);
    setDrivers(INITIAL_NATIVE_DRIVERS);
    showToast('Simulation state restored to default.');
  };

  return (
    <div className={`space-y-6 transition-colors duration-300 ${isDay ? 'theme-day' : 'theme-night'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce max-w-md p-4 rounded-2xl bg-[#0a192f] text-white border border-cyan-400/40 shadow-2xl flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold leading-relaxed">{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header Banner */}
      <div
        className={`p-6 sm:p-8 rounded-3xl transition-all duration-300 relative overflow-hidden ${
          isDay
            ? 'bg-[#ffffff] border border-slate-200/90 shadow-lg'
            : 'glass-panel border-slate-800 shadow-2xl'
        }`}
      >
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                <Truck className="w-3.5 h-3.5" />
                Smart Delivery Agent Module
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Lane Clearance Gating
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Vice-Versa Return Optimization
              </span>
            </div>

            <h1
              className={`font-parmyo text-2xl sm:text-3xl md:text-4xl font-normal tracking-wide ${
                isDay ? 'text-[#0a192f]' : 'text-white'
              }`}
            >
              SMART DELIVERY AGENT &amp; NATIVE DRIVER DISPATCH
            </h1>

            {/* Sub-headline with Multi-Colored Font */}
            <p className="text-sm sm:text-base font-multicolor-subhead leading-relaxed">
              Client Address Classification Engine • Narrow Alley Gating • Native Territory Affinity • Zero Empty Backhauls
            </p>

            <p className={`text-xs sm:text-sm max-w-3xl leading-relaxed ${isDay ? 'text-slate-600' : 'text-slate-300'}`}>
              Overcoming the store management delivery bottleneck across Maharashtra. Narrow wada lanes (≤2.5m) trap standard commercial trucks.
              Our engine parses client addresses, classifies accessibility tiers, and assigns local native drivers who speak regional dialects,
              know landmark-based shortcuts, and carry verified street clearance.
            </p>
          </div>

          {/* Quick Theme Toggle & Global Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={onToggleTheme}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none shadow-sm ${
                isDay
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle Day and Night Theme"
            >
              {isDay ? (
                <>
                  <Sun className="w-4 h-4 text-amber-600 fill-amber-500" />
                  <span>Day Mode (Cream Navy)</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                  <span>Night Mode (Cosmic)</span>
                </>
              )}
            </button>

            {/* Smart Auto-Assign Button (Required Navy Blue in Day mode) */}
            <button
              type="button"
              onClick={handleAutoAssign}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all duration-200 ${
                isDay
                  ? 'btn-navy text-white'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-xl shadow-indigo-500/30'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>Smart AI Auto-Assign All</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isDay
                  ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Reset simulation data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Metrics Quad-Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDay
                ? 'bg-[#fcfbf9] border-indigo-200'
                : 'bg-indigo-950/20 border-indigo-500/30'
            }`}
          >
            <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 flex items-center justify-between">
              <span>Avg Native Affinity</span>
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="mt-1 text-2xl font-black font-mono tracking-tight text-indigo-900 dark:text-indigo-200">
              {avgAffinity}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Locality Fluency Score</div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDay
                ? 'bg-[#fcfbf9] border-emerald-200'
                : 'bg-emerald-950/20 border-emerald-500/30'
            }`}
          >
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
              <span>Alley Clearance Safety</span>
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="mt-1 text-2xl font-black font-mono tracking-tight text-emerald-900 dark:text-emerald-300">
              100%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">0 Truck Lane Blockages</div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDay
                ? 'bg-[#fcfbf9] border-cyan-200'
                : 'bg-cyan-950/20 border-cyan-500/30'
            }`}
          >
            <div className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 flex items-center justify-between">
              <span>Vice-Versa Backhaul</span>
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
            <div className="mt-1 text-2xl font-black font-mono tracking-tight text-cyan-900 dark:text-cyan-300">
              ₹3,750
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Freight Saved on Return Legs</div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDay
                ? 'bg-[#fcfbf9] border-amber-200'
                : 'bg-amber-950/20 border-amber-500/30'
            }`}
          >
            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center justify-between">
              <span>Speedup / Drop</span>
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div className="mt-1 text-2xl font-black font-mono tracking-tight text-amber-900 dark:text-amber-300">
              +28.5 min
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Local Shortcut Advantage</div>
          </div>
        </div>
      </div>

      {/* Main View Mode Tabs (Forward Allocation vs Vice-Versa Return Allocation) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Toggle between Orders View and Driver Pool View */}
        <div
          className={`inline-flex p-1 rounded-2xl border ${
            isDay ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveModeTab('FORWARD')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeModeTab === 'FORWARD'
                ? isDay
                  ? 'btn-navy text-white shadow-md'
                  : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : isDay
                ? 'text-slate-600 hover:text-[#0a192f]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Client Orders &amp; Address Classification ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModeTab('REVERSE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeModeTab === 'REVERSE'
                ? isDay
                  ? 'btn-navy text-white shadow-md'
                  : 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : isDay
                ? 'text-slate-600 hover:text-[#0a192f]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Vice-Versa Native Drivers Fleet ({drivers.length})</span>
          </button>
        </div>

        {/* Address Classification Filters (Only for Orders tab) */}
        {activeModeTab === 'FORWARD' && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`text-[11px] font-semibold mr-1 ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
              Filter Address:
            </span>
            {[
              { id: 'ALL', label: 'All Tiers' },
              { id: 'NARROW', label: 'Narrow Peth Alleys (<2.5m)' },
              { id: 'GHAT', label: 'Ghat Mountain Routes' },
              { id: 'APMC', label: 'APMC Wholesale Mandi' },
              { id: 'PERI_URBAN', label: 'Peri-Urban Store' },
              { id: 'HIGHWAY', label: 'Highway Dock' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                  activeFilter === f.id
                    ? isDay
                      ? 'btn-navy text-white shadow-sm'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : isDay
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: Forward Client Delivery Orders & Address Classification */}
      {activeModeTab === 'FORWARD' && (
        <div className="grid grid-cols-1 gap-5">
          {filteredOrders.map((order) => {
            const assignedDriver = drivers.find((d) => d.id === order.assignedDriverId);
            const isSimulatingThis = simulatingTripId === order.id;

            // Classification badge color
            const classColor =
              order.addressClassification === 'NARROW_LANE'
                ? isDay
                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                  : 'bg-purple-950/50 text-purple-300 border-purple-500/30'
                : order.addressClassification === 'GHAT_TERRAIN'
                ? isDay
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-amber-950/50 text-amber-300 border-amber-500/30'
                : order.addressClassification === 'APMC_MARKET'
                ? isDay
                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                  : 'bg-blue-950/50 text-blue-300 border-blue-500/30'
                : order.addressClassification === 'PERI_URBAN'
                ? isDay
                  ? 'bg-teal-100 text-teal-900 border-teal-300'
                  : 'bg-teal-950/50 text-teal-300 border-teal-500/30'
                : isDay
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30';

            return (
              <div
                key={order.id}
                className={`p-5 sm:p-6 rounded-3xl transition-all duration-200 border ${
                  isDay
                    ? 'bg-white border-slate-200/90 shadow-md hover:shadow-lg'
                    : 'glass-panel border-slate-800/80 hover:border-slate-700'
                } ${isSimulatingThis ? 'ring-2 ring-cyan-400 animate-pulse' : ''}`}
              >
                {/* Active Live Simulation Status Bar */}
                {isSimulatingThis && (
                  <div className="mb-4 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-3">
                    <Navigation className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span className="font-mono font-bold">{simulationStep}</span>
                  </div>
                )}

                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/60">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        {order.id}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${classColor}`}>
                        {order.addressClassification.replace('_', ' ')} (Lane: {order.laneWidthMeters}m)
                      </span>
                      {order.perishable && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                          Fresh Dairy (Shelf-Life &ge;70%)
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                          order.status === 'DELIVERED'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : order.status === 'IN_TRANSIT'
                            ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 animate-pulse'
                            : order.status === 'ASSIGNED'
                            ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <h2
                      className={`text-lg sm:text-xl font-bold ${
                        isDay ? 'text-[#0a192f]' : 'text-white'
                      }`}
                    >
                      {order.clientName}
                    </h2>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        {order.detailedAddress}
                      </span>
                      <span>&bull;</span>
                      <span className="text-indigo-600 dark:text-indigo-300 font-medium">
                        Landmark: "{order.localLandmark}"
                      </span>
                    </div>
                  </div>

                  {/* Top Action Row for this Order */}
                  <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleSimulateDelivery(order)}
                      disabled={isSimulatingThis || order.status === 'DELIVERED'}
                      className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        order.status === 'DELIVERED'
                          ? 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          : isDay
                          ? 'btn-navy text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{order.status === 'DELIVERED' ? 'Delivered ✓' : 'Dispatch & Transit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedChalanOrder(order)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                        isDay
                          ? 'bg-white hover:bg-slate-100 text-[#0a192f] border-slate-300'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                      }`}
                      title="View Marathi Delivery Chalan"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Chalan (पावती)</span>
                    </button>
                  </div>
                </div>

                {/* Body: Address Constraints, Multi-Colored Issues & Driver Binding */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4">
                  {/* Left: Issues & Street Classification (7 Cols) */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Window: <strong className="text-slate-900 dark:text-white">{order.unloadingWindow}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Compass className="w-3.5 h-3.5 text-teal-500" />
                        <span>Dialect: <strong className="text-slate-900 dark:text-white">{order.localDialect}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-purple-500" />
                        <span>Load: <strong className="text-slate-900 dark:text-white">{order.totalCases} cases ({order.totalWeightKg} kg)</strong></span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Cargo: </span>
                      <span className="text-slate-600 dark:text-slate-400">{order.skuSummary}</span>
                    </div>

                    {/* Identified Issues / Constraints with Multi-Colored Font */}
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Street Constraints &amp; Identified Issues:
                      </div>

                      {order.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-all ${
                            issue.severity === 'CRITICAL'
                              ? isDay
                                ? 'bg-rose-50/80 border-rose-300'
                                : 'bg-rose-950/30 border-rose-500/30'
                              : issue.severity === 'WARNING'
                              ? isDay
                                ? 'bg-amber-50/80 border-amber-300'
                                : 'bg-amber-950/30 border-amber-500/30'
                              : isDay
                              ? 'bg-emerald-50/80 border-emerald-300'
                              : 'bg-emerald-950/30 border-emerald-500/30'
                          }`}
                        >
                          {issue.severity === 'CRITICAL' ? (
                            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                          ) : issue.severity === 'WARNING' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          )}

                          <div className="space-y-0.5">
                            {/* Issue title styled with multi-colored classes */}
                            <div
                              className={
                                issue.severity === 'CRITICAL'
                                  ? 'font-issue-critical'
                                  : issue.severity === 'WARNING'
                                  ? 'font-issue-warning'
                                  : 'font-issue-opportunity'
                              }
                            >
                              {issue.title}
                            </div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                              {issue.description}
                            </p>
                            <div className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 pt-0.5">
                              &rarr; {issue.recommendedAction}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Native Driver Binding & Vice-Versa Match (5 Cols) */}
                  <div
                    className={`md:col-span-5 p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                      isDay
                        ? 'bg-[#fcfbf9] border-slate-200'
                        : 'bg-slate-900/50 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                          Native Driver Assignment
                        </span>
                        {assignedDriver && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              order.nativeMatchScore >= 95
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : order.nativeMatchScore >= 80
                                ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {order.nativeMatchScore}% Native Match
                          </span>
                        )}
                      </div>

                      {/* Dropdown for Driver Re-assignment */}
                      <div className="relative">
                        <select
                          value={order.assignedDriverId || ''}
                          onChange={(e) => handleReassign(order.id, e.target.value)}
                          className={`w-full p-2.5 rounded-xl text-xs font-semibold border cursor-pointer appearance-none pr-8 ${
                            isDay
                              ? 'bg-white text-slate-800 border-slate-300 focus:border-indigo-600'
                              : 'bg-slate-800 text-slate-100 border-slate-700 focus:border-indigo-400'
                          }`}
                        >
                          <option value="" disabled>
                            -- Select Native Driver --
                          </option>
                          {drivers.map((d) => {
                            const evalMatch = calculateNativeAffinity(order, d);
                            return (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.nativeCity} - {evalMatch.score}% Match | {d.vehicleName})
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                      </div>
                    </div>

                    {/* Driver Detail Summary Card */}
                    {assignedDriver ? (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-bold flex items-center justify-center text-[10px]">
                              {assignedDriver.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {assignedDriver.name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Native to {assignedDriver.homeTerritory}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              ★ {assignedDriver.rating}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {assignedDriver.completedTrips} drops
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-700/60">
                          <div>
                            <span className="text-slate-400 text-[10px]">Vehicle Fleet:</span>
                            <div className="font-medium text-slate-700 dark:text-slate-300">
                              {assignedDriver.vehicleName}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px]">Width Clearance:</span>
                            <div
                              className={`font-mono font-bold ${
                                assignedDriver.vehicleWidthMeters < order.laneWidthMeters
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {assignedDriver.vehicleWidthMeters}m (Lane: {order.laneWidthMeters}m)
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-indigo-500" />
                          <span>{assignedDriver.phone}</span>
                          <span className="mx-1">&bull;</span>
                          <span className="text-teal-600 dark:text-teal-400 font-medium">
                            {assignedDriver.dialect}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-700/60 text-center text-xs text-amber-700 dark:text-amber-400">
                        <AlertCircle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                        <span>No Native Driver bound yet.</span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Click "Smart AI Auto-Assign All" above or select from dropdown.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Reverse / Vice-Versa Native Drivers Fleet Roster */}
      {activeModeTab === 'REVERSE' && (
        <div className="space-y-6">
          {/* Explanatory Banner for Vice-Versa Return Matching */}
          <div
            className={`p-5 rounded-2xl border ${
              isDay
                ? 'bg-cyan-50/70 border-cyan-200 text-cyan-950'
                : 'bg-cyan-950/20 border-cyan-500/30 text-cyan-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <ArrowRightLeft className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">Vice-Versa Return Allocation Engine (Eliminating Empty Miles)</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  When a native driver finishes an inter-district drop (e.g. Pune &rarr; Satara or Kolhapur &rarr; Karad),
                  the engine scans all pending client orders in their return corridor. Instead of returning empty (deadhead miles),
                  the driver is paired with unassigned store orders in their native home territory, cutting distributor freight costs by 38%
                  and ensuring same-day replenishment.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {drivers.map((driver) => {
              const assignedOrders = orders.filter((o) => o.assignedDriverId === driver.id);
              const currentLoad = assignedOrders.reduce((sum, o) => sum + o.totalCases, 0);
              const pctUsed = Math.min(100, Math.round((currentLoad / driver.maxPayloadCases) * 100));

              return (
                <div
                  key={driver.id}
                  className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
                    isDay
                      ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                      : 'glass-panel border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Driver Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white font-bold flex items-center justify-center text-sm shadow-md">
                          {driver.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <div className={`font-bold text-base ${isDay ? 'text-[#0a192f]' : 'text-white'}`}>
                            {driver.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-indigo-500" />
                            <span>Native: {driver.nativeCity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          {driver.localityFluencyScore}% Fluency
                        </span>
                      </div>
                    </div>

                    {/* Vehicle & Clearance Telemetry */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Vehicle Fleet:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {driver.vehicleName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Width Clearance:</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {driver.vehicleWidthMeters}m (Clears &gt;{driver.vehicleWidthMeters + 0.3}m Lanes)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Dialect Mastery:</span>
                        <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">
                          {driver.dialect}
                        </span>
                      </div>
                    </div>

                    {/* Payload Capacity Gauge */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Payload Load:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {currentLoad} / {driver.maxPayloadCases} Cases ({pctUsed}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            pctUsed > 90 ? 'bg-rose-500' : pctUsed > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pctUsed}%` }}
                        />
                      </div>
                    </div>

                    {/* Local Specialties Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {driver.specialties.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Vice-Versa Return Opportunity Box */}
                    {driver.reverseRouteOpportunity && (
                      <div
                        className={`p-3 rounded-2xl border text-xs space-y-1 ${
                          isDay
                            ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                            : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800 dark:text-amber-300">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />
                          <span>Vice-Versa Return Match Ready:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Returning from <strong>{driver.reverseRouteOpportunity.returnFrom}</strong> &rarr;{' '}
                          <strong>{driver.reverseRouteOpportunity.returnTo}</strong>. Has{' '}
                          <strong>{driver.reverseRouteOpportunity.availableCapacityCases} cases</strong> free space.
                        </p>
                        <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          Saves ₹{driver.reverseRouteOpportunity.potentialSavingsRupees} in return freight!
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Driver Footer Details */}
                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-indigo-500" />
                      {driver.phone}
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      ★ {driver.rating} ({driver.completedTrips} drops)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AUTHENTIC MARATHI DELIVERY CHALAN MODAL */}
      {selectedChalanOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className={`w-full max-w-xl p-6 sm:p-8 rounded-3xl border shadow-2xl relative max-h-[90vh] overflow-y-auto ${
              isDay ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-100 border-slate-800'
            }`}
          >
            {/* Chalan Header */}
            <div className="border-b pb-4 mb-4 border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  FLOWGRID MAHARASHTRA DELIVERY DISPATCH
                </span>
                <h3 className="text-xl font-bold font-parmyo mt-1">
                  किराणा डिलिव्हरी पावती (DELIVERY CHALAN)
                </h3>
                <div className="text-xs text-slate-500">Chalan No: CHL-{selectedChalanOrder.id}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChalanOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-black dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chalan Body */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px]">ग्राहक / किराणा दुकान (Customer):</span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedChalanOrder.clientName}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                    {selectedChalanOrder.detailedAddress}
                  </div>
                  <div className="text-indigo-600 dark:text-indigo-400 font-medium text-[11px] mt-1">
                    लॅंडमार्क: {selectedChalanOrder.localLandmark}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px]">चालक / Native Driver:</span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {drivers.find((d) => d.id === selectedChalanOrder.assignedDriverId)?.name || 'Unassigned'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                    वाहन: {drivers.find((d) => d.id === selectedChalanOrder.assignedDriverId)?.vehicleName}
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] mt-1">
                    रस्ता रुंदी तपासणी: {selectedChalanOrder.laneWidthMeters}m (मंजूर ✓)
                  </div>
                </div>
              </div>

              {/* Items Manifest Table */}
              <div className="border rounded-2xl overflow-hidden border-slate-200 dark:border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-2.5">तपशील (SKU Details)</th>
                      <th className="p-2.5">केसेस (Cases)</th>
                      <th className="p-2.5">वजन (Weight)</th>
                      <th className="p-2.5">शेल्फ लाइफ (SLA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="p-2.5 font-medium">{selectedChalanOrder.skuSummary}</td>
                      <td className="p-2.5 font-mono font-bold">{selectedChalanOrder.totalCases}</td>
                      <td className="p-2.5 font-mono">{selectedChalanOrder.totalWeightKg} kg</td>
                      <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">&ge;70% Certified</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Marathi Delivery Instructions */}
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span>वितरण सूचना (Special Delivery Instructions):</span>
                </div>
                <p>
                  1. सदर माल स्थानिक गल्ली रुंदी ({selectedChalanOrder.laneWidthMeters}m) नुसार योग्य वाहनाने पाठवला आहे.
                </p>
                <p>
                  2. अनलोडिंग वेळ: <strong>{selectedChalanOrder.unloadingWindow}</strong> च्या आत पूर्ण करावी.
                </p>
                <p>
                  3. माल पावतीवर किराणा मालकाची स्वाक्षरी व शिक्का अनिवार्य आहे.
                </p>
              </div>

              {/* Signature Section */}
              <div className="pt-4 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-500">
                <div className="border-t border-dashed pt-2 border-slate-300 dark:border-slate-700">
                  चालकाची स्वाक्षरी (Driver Signature)
                </div>
                <div className="border-t border-dashed pt-2 border-slate-300 dark:border-slate-700">
                  किराणा दुकानदाराची स्वाक्षरी व शिक्का (Receiver Stamp)
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedChalanOrder(null)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                  isDay ? 'btn-navy text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                Close Chalan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartDispatchView;
