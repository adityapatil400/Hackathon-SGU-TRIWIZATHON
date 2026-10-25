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
  MapPin,
  Menu,
  X,
  Truck,
  Sun,
  Moon,
  Languages
} from 'lucide-react';
import { UserRole, ThemeMode } from '../types';
import { useTranslation, SUPPORTED_LANGUAGES } from '../context/TranslationContext';


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
  theme = 'day',
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const { lang, setLang, t } = useTranslation();

  const roleNames: Record<UserRole, { name: string; title: string }> = {
    rohit: { name: 'Rohit Deshpande', title: 'Distribution Planner' },
    sunita: { name: 'Sunita Deshmukh', title: 'Warehouse Manager (Pune Hub)' },
    ganesh: { name: 'Ganesh Patil', title: 'Kirana Store Owner (Kolhapur)' },
    priya: { name: 'Priya Sharma', title: 'System Administrator' },
  };

  const navCategories = [
    {
      label: t('nav.decisionSuite', 'PLANNING & FORECAST'),
      items: [
        { id: 'plans' as ActiveTab, label: t('nav.plans', 'Allocation Plan'), icon: Cpu, badge: 'ALLOC' },
        { id: 'forecast' as ActiveTab, label: t('nav.forecast', 'Demand Forecast'), icon: TrendingUp, badge: 'Quantile' },
        { id: 'map' as ActiveTab, label: t('nav.map', 'Demand Map'), icon: MapPin, badge: 'Geo' },
        { id: 'benchmark' as ActiveTab, label: t('nav.benchmark', 'Impact Benchmark'), icon: BarChart3, badge: '-40%' },
      ],
    },
    {
      label: t('nav.operations', 'FIELD & OPERATIONS'),
      items: [
        { id: 'dispatch' as ActiveTab, label: t('nav.dispatch', 'Smart Delivery Dispatch'), icon: Truck, badge: 'Native AI' },
        { id: 'warehouse' as ActiveTab, label: t('nav.warehouse', 'Warehouse Ops'), icon: WarehouseIcon, badge: 'FEFO' },
        { id: 'retailer' as ActiveTab, label: t('nav.retailer', 'Kirana Field POS'), icon: Store, badge: 'Offline' },
      ],
    },
    {
      label: t('nav.system', 'DATA & OBSERVABILITY'),
      items: [
        { id: 'import' as ActiveTab, label: t('nav.import', 'Data Import Studio'), icon: UploadCloud, badge: '5% Rule' },
        { id: 'health' as ActiveTab, label: t('nav.health', 'System Health & Alerts'), icon: Activity, badge: 'API' },
      ],
    },
  ];

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between p-4 space-y-4 bg-white text-[#1E293B]">
      {/* Top Brand Section */}
      <div className="space-y-3.5">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => handleTabClick('plans')}
        >
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-md shadow-[#2563EB]/25 group-hover:bg-[#1D4ED8] transition-all">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-[#1E293B]">
                HETVAYA
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded">
                v1.5
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-tight font-medium">
              Distribution Intelligence
            </p>
          </div>
        </div>

        {/* Multilingual Selector (Global Language State) */}
        <div className="bg-[#FFF8E7] border border-[#E7E5E4] rounded-xl p-2 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B] mb-1.5 px-1">
            <span className="flex items-center gap-1.5 text-[#1E293B]">
              <Languages className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Language / भाषा</span>
            </span>
            <span className="text-[10px] uppercase font-mono font-bold text-[#2563EB] bg-white px-1.5 py-0.2 rounded border border-[#E7E5E4]">
              {lang.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {SUPPORTED_LANGUAGES.map(opt => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setLang(opt.code)}
                className={`py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  lang === opt.code
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-white text-[#64748B] hover:text-[#1E293B] hover:bg-[#FAF3E0] border border-[#E7E5E4]'
                }`}
                title={`Switch to ${opt.name}`}
              >
                <span>{opt.flag}</span>
                <span>{opt.nativeName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hackathon Micro Badge */}
        <div className="px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between text-[11px]">
          <span className="text-[#2563EB] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" /> Problem Statement 2
          </span>
          <span className="text-[10px] text-[#64748B] font-mono font-medium">FMCG</span>
        </div>

        {/* User Persona Switcher Card */}
        <div className="relative">
          <div
            onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
            className="flex items-center justify-between bg-[#FAF3E0] border border-[#E7E5E4] hover:border-[#2563EB] rounded-xl p-2.5 cursor-pointer transition-all shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs">
                {userRole[0].toUpperCase()}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-bold text-[#1E293B] truncate leading-tight">
                  {roleNames[userRole].name}
                </p>
                <p className="text-[10px] text-[#64748B] truncate mt-0.5">
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
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] px-2 py-1">
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
                      ? 'bg-[#EFF6FF] text-[#2563EB] font-bold border border-[#BFDBFE]'
                      : 'text-[#1E293B] hover:bg-[#FAF3E0]'
                  }`}
                >
                  <div className="truncate">
                    <p className="font-semibold truncate">{roleNames[r].name}</p>
                    <p className="text-[10px] text-[#64748B] truncate">{roleNames[r].title}</p>
                  </div>
                  {userRole === r && <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Connectivity & Sync Status Bar */}
        <div className="flex items-center justify-between bg-[#FFF8E7] border border-[#E7E5E4] p-2 rounded-xl text-xs">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                : 'bg-orange-50 text-[#EA580C] border border-orange-200'
            }`}
            title="Toggle the simulated local event-processing mode; this does not change the backend connection."
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
                <Wifi className="w-3.5 h-3.5" />
                <span>{t('header.online', 'Online Mode')}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#EA580C]"></span>
                <WifiOff className="w-3.5 h-3.5" />
                <span>{t('header.offline', 'Offline Mode')}</span>
              </>
            )}
          </button>

          {queuedEventCount > 0 ? (
            <button
              onClick={onTriggerSync}
              className="flex items-center gap-1 text-[11px] font-bold text-[#DC2626] bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg border border-red-200 transition-all cursor-pointer"
              title="Click to force sync offline queue"
            >
              <span>{queuedEventCount} {t('header.queued', 'queued')}</span>
              <span className="underline ml-0.5">{t('header.processQueue', 'Process')}</span>
            </button>
          ) : (
            <span className="text-[10px] text-[#64748B] flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3 text-[#15803D]" /> {t('header.synced', 'Synced')}
            </span>
          )}
        </div>

        {/* Navigation Categories */}
        <nav className="space-y-3.5 pt-1">
          {navCategories.map((cat, idx) => (
            <div key={idx} className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] px-3">
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all group cursor-pointer ${
                        isActive
                          ? 'bg-[#2563EB] text-white font-bold shadow-xs'
                          : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#FAF3E0] font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                          isActive ? 'text-white' : 'text-[#2563EB]'
                        }`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ml-1.5 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#FAF3E0] text-[#64748B] border border-[#E7E5E4] group-hover:text-[#1E293B]'
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
      <div className="space-y-2 pt-3 border-t border-[#E7E5E4]">
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer select-none ${
              theme === 'night'
                ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                : 'bg-[#FFF8E7] text-[#1E293B] border border-[#E7E5E4] hover:bg-[#FAF3E0]'
            }`}
          >
            {theme === 'night' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>{t('header.nightMode', 'Night Mode (Cosmic)')}</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('header.dayMode', 'Day Mode (Light Enterprise)')}</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onOpenDemoModal}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-all shadow-xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>{t('header.demoScript', '3-Min Demo Script')}</span>
        </button>

        <button
          onClick={onOpenWhatIfModal}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#1E293B] bg-white hover:bg-[#FFF8E7] border border-[#2563EB]/40 transition-all shadow-xs cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>{t('header.whatIf', 'What-If Simulator')}</span>
        </button>

        <p className="text-[10px] text-center text-[#64748B] pt-1">
          HETVAYA Intelligence Engine
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
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-[#1E293B]">
              HETVAYA
            </span>
            <span className="text-[9px] uppercase tracking-wider ml-1.5 font-bold px-1 py-0.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded">
              v1.5
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Language Toggle on Mobile */}
          <div className="flex rounded-lg bg-[#FFF8E7] border border-[#E7E5E4] p-0.5 text-[10px] font-bold">
            {SUPPORTED_LANGUAGES.map(opt => (
              <button
                key={opt.code}
                onClick={() => setLang(opt.code)}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${lang === opt.code ? 'bg-[#2563EB] text-white' : 'text-[#64748B]'}`}
              >
                {opt.code.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Online status indicator */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            aria-label={isOnline ? 'Demo network mode is online' : 'Demo network mode is offline'}
            title="Toggle simulated local event processing"
            className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
              isOnline
                ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                : 'bg-orange-50 text-[#EA580C] border-orange-200'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          </button>

          {/* Persona Avatar */}
          <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-xs font-bold text-white shadow-xs">
            {userRole[0].toUpperCase()}
          </div>

          {/* Hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-[#FFF8E7] border border-[#E7E5E4] text-[#1E293B] hover:bg-[#FAF3E0] cursor-pointer"
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
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                Navigation Menu
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#1E293B] cursor-pointer"
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
