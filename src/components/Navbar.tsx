import React, { useState } from 'react';
import {
  Boxes,
  TrendingUp,
  Cpu,
  BarChart3,
  Warehouse as WarehouseIcon,
  Store,
  UploadCloud,
  Activity,
  Wifi,
  WifiOff,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Globe,
  MapPin,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Truck,
  Sun,
  Moon
} from 'lucide-react';
import { UserRole, ThemeMode } from '../types';

export type ActiveTab = 'plans' | 'forecast' | 'map' | 'benchmark' | 'warehouse' | 'retailer' | 'dispatch' | 'import' | 'health';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  queuedEventCount: number;
  onOpenDemoModal: () => void;
  onOpenWhatIfModal: () => void;
  onTriggerSync: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  isOnline,
  setIsOnline,
  queuedEventCount,
  onOpenDemoModal,
  onOpenWhatIfModal,
  onTriggerSync,
  theme = 'night',
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);

  const roleNames: Record<UserRole, { name: string; title: string }> = {
    rohit: { name: 'Rohit Deshpande', title: 'Distribution Planner' },
    sunita: { name: 'Sunita Deshmukh', title: 'Warehouse Manager (Pune Hub)' },
    ganesh: { name: 'Ganesh Patil', title: 'Kirana Store Owner (Kolhapur)' },
    priya: { name: 'Priya Sharma', title: 'System Administrator' },
  };

  const navCategories = [
    {
      label: 'PLANNING & FORECAST',
      items: [
        { id: 'plans' as ActiveTab, label: 'Allocation Plan', icon: Cpu, badge: 'ALLOC' },
        { id: 'forecast' as ActiveTab, label: 'Demand Forecast', icon: TrendingUp, badge: 'Quantile' },
        { id: 'map' as ActiveTab, label: 'Demand Map', icon: MapPin, badge: 'Geo' },
        { id: 'benchmark' as ActiveTab, label: 'Impact Benchmark', icon: BarChart3, badge: '-40%' },
      ],
    },
    {
      label: 'FIELD & OPERATIONS',
      items: [
        { id: 'dispatch' as ActiveTab, label: 'Smart Delivery Agent', icon: Truck, badge: 'Native AI' },
        { id: 'warehouse' as ActiveTab, label: 'Warehouse Ops', icon: WarehouseIcon, badge: 'FEFO' },
        { id: 'retailer' as ActiveTab, label: 'Kirana Field POS', icon: Store, badge: 'Offline' },
      ],
    },
    {
      label: 'DATA & OBSERVABILITY',
      items: [
        { id: 'import' as ActiveTab, label: 'Data Import Studio', icon: UploadCloud, badge: '5% Rule' },
        { id: 'health' as ActiveTab, label: 'System Health & Alerts', icon: Activity, badge: 'API' },
      ],
    },
  ];

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between p-4 space-y-5 bg-white text-[#292524]">
      {/* Top Brand Section */}
      <div className="space-y-4">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => handleTabClick('plans')}
        >
          <div className="w-10 h-10 rounded-xl bg-[#8B5E3C] flex items-center justify-center shadow-md shadow-[#8B5E3C]/20 border border-[#8B5E3C]/30 group-hover:bg-[#734b2f] transition-all">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-[#292524]">
                FlowGrid
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 bg-[#E9D8C8]/60 text-[#8B5E3C] border border-[#8B5E3C]/30 rounded">
                v1.5
              </span>
            </div>
            <p className="text-[11px] text-[#78716C] leading-tight font-medium">
              Distribution Intelligence
            </p>
          </div>
        </div>

        {/* Hackathon Micro Badge */}
        <div className="px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between text-[11px]">
          <span className="text-[#2563EB] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" /> Problem Statement 2
          </span>
          <span className="text-[10px] text-[#78716C] font-mono font-medium">FMCG</span>
        </div>

        {/* User Persona Switcher Card */}
        <div className="relative">
          <div
            onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
            className="flex items-center justify-between bg-[#F8F7F5] border border-[#E7E5E4] hover:border-[#8B5E3C] rounded-xl p-2.5 cursor-pointer transition-all shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#8B5E3C] flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs">
                {userRole[0].toUpperCase()}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-bold text-[#292524] truncate leading-tight">
                  {roleNames[userRole].name}
                </p>
                <p className="text-[10px] text-[#78716C] truncate mt-0.5">
                  {roleNames[userRole].title}
                </p>
              </div>
            </div>
            <span className="text-[10px] text-[#2563EB] font-bold shrink-0 ml-1">
              Switch
            </span>
          </div>

          {/* Persona Switcher Dropdown */}
          {personaDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] px-2 py-1">
                Switch User Persona
              </p>
              {(Object.keys(roleNames) as UserRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => {
                    setUserRole(r);
                    setPersonaDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    userRole === r
                      ? 'bg-[#E9D8C8]/60 text-[#8B5E3C] font-bold border border-[#8B5E3C]/30'
                      : 'text-[#292524] hover:bg-[#F8F7F5]'
                  }`}
                >
                  <div className="truncate">
                    <p className="font-semibold truncate">{roleNames[r].name}</p>
                    <p className="text-[10px] text-[#78716C] truncate">{roleNames[r].title}</p>
                  </div>
                  {userRole === r && <CheckCircle2 className="w-4 h-4 text-[#8B5E3C] shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Connectivity & Sync Status Bar */}
        <div className="flex items-center justify-between bg-[#F8F7F5] border border-[#E7E5E4] p-2 rounded-xl text-xs">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                : 'bg-amber-50 text-[#D97706] border border-amber-200'
            }`}
            title="Toggle the simulated local event-processing mode; this does not change the backend connection."
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
                <Wifi className="w-3.5 h-3.5" />
                <span>Demo online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Demo offline</span>
              </>
            )}
          </button>

          {queuedEventCount > 0 ? (
            <button
              onClick={onTriggerSync}
<<<<<<< Updated upstream
              className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-2 py-1 rounded-lg border border-amber-500/30 transition-all"
              title="Process queued events in the local demo queue"
=======
              className="flex items-center gap-1 text-[11px] font-bold text-[#DC2626] bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg border border-red-200 transition-all cursor-pointer"
              title="Click to force sync offline queue"
>>>>>>> Stashed changes
            >
              <span>{queuedEventCount} queued</span>
              <span className="underline ml-0.5">Process</span>
            </button>
          ) : (
<<<<<<< Updated upstream
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500/70" /> Queue empty
=======
            <span className="text-[10px] text-[#78716C] flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3 text-[#15803D]" /> Synced
>>>>>>> Stashed changes
            </span>
          )}
        </div>

        {/* Navigation Categories */}
        <nav className="space-y-4 pt-1">
          {navCategories.map((cat, idx) => (
            <div key={idx} className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] px-3">
                {cat.label}
              </p>
              <div className="space-y-0.5">
                {cat.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                        isActive
                          ? 'bg-[#8B5E3C] text-white font-semibold shadow-xs'
                          : 'text-[#78716C] hover:text-[#292524] hover:bg-[#F8F7F5]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-[#78716C] group-hover:text-[#8B5E3C]'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#F8F7F5] text-[#78716C] border border-[#E7E5E4] group-hover:text-[#292524]'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Utility & Demo Buttons */}
<<<<<<< Updated upstream
      <div className="space-y-2 pt-4 border-t border-slate-800/80">
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer select-none ${
              theme === 'day'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {theme === 'day' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>Theme: Day (Cream Navy)</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>Theme: Night (Cosmic)</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onOpenDemoModal}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 transition-all shadow-sm cursor-pointer"
=======
      <div className="space-y-2 pt-3 border-t border-[#E7E5E4]">
        <button
          onClick={onOpenDemoModal}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-all shadow-xs cursor-pointer"
>>>>>>> Stashed changes
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>3-Min Demo Script</span>
        </button>

        <button
          onClick={onOpenWhatIfModal}
<<<<<<< Updated upstream
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all shadow-sm cursor-pointer"
=======
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#292524] bg-white hover:bg-[#E9D8C8]/50 border border-[#8B5E3C] transition-all shadow-xs cursor-pointer"
>>>>>>> Stashed changes
        >
          <Sliders className="w-3.5 h-3.5 text-[#8B5E3C]" />
          <span>What-If Simulator</span>
        </button>

        <p className="text-[10px] text-center text-[#78716C] pt-1">
          Marginal-Value Engine • scikit-learn 1.9
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Left Sidebar: Fixed/Sticky on the Left */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-screen sticky top-0 border-r border-[#E7E5E4] bg-white z-30 overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b border-[#E7E5E4] bg-white px-4 py-3 flex items-center justify-between shadow-xs">
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => handleTabClick('plans')}
        >
          <div className="w-8 h-8 rounded-lg bg-[#8B5E3C] flex items-center justify-center text-white shadow-xs">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-[#292524]">
              FlowGrid
            </span>
            <span className="text-[9px] uppercase tracking-wider ml-1.5 font-bold px-1 py-0.5 bg-[#E9D8C8]/60 text-[#8B5E3C] border border-[#8B5E3C]/30 rounded">
              v1.5
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Online status indicator */}
          <button
            onClick={() => setIsOnline(!isOnline)}
<<<<<<< Updated upstream
            aria-label={isOnline ? 'Demo network mode is online' : 'Demo network mode is offline'}
            title="Toggle simulated local event processing"
            className={`p-1.5 rounded-lg border text-xs ${
=======
            className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
>>>>>>> Stashed changes
              isOnline
                ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                : 'bg-amber-50 text-[#D97706] border-amber-200'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          </button>

          {/* Persona Avatar */}
          <div className="w-7 h-7 rounded-full bg-[#8B5E3C] flex items-center justify-center text-xs font-bold text-white shadow-xs">
            {userRole[0].toUpperCase()}
          </div>

          {/* Hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-[#F8F7F5] border border-[#E7E5E4] text-[#292524] hover:bg-[#E9D8C8]/50 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Sliding Drawer & Backdrop */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer container on the left */}
          <div className="relative w-72 max-w-[85vw] bg-white border-r border-[#E7E5E4] h-full flex flex-col z-10 shadow-2xl overflow-y-auto">
            <div className="p-3 border-b border-[#E7E5E4] flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                Navigation Menu
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-[#78716C] hover:text-[#292524] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};
