import React, { useState, useEffect, useMemo } from 'react';
import {
  UserRole,
  ThemeMode,
  CriticalMessage,
  CriticalMessagesSummary,
  MessagePriority,
  MessageStatus,
  RelatedModule,
} from '../types';
import { FlowGridAPI } from '../services/api';
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Boxes,
  TrendingUp,
  Truck,
  Warehouse as WarehouseIcon,
  Store,
  Activity,
  MapPin,
  X,
  Eye,
  Check,
  Building,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface ProfileViewProps {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  theme?: ThemeMode;
  onNavigateTab?: (tab: any) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userRole,
  setUserRole,
  theme = 'day',
  onNavigateTab: _onNavigateTab,
}) => {
  // State for Critical Messages
  const [messages, setMessages] = useState<CriticalMessage[]>([]);
  const [summary, setSummary] = useState<CriticalMessagesSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Filters & Search
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Detail Modal
  const [activeModalMessage, setActiveModalMessage] = useState<CriticalMessage | null>(null);

  // User Profile metadata
  const profileDetails: Record<
    UserRole,
    {
      name: string;
      title: string;
      email: string;
      department: string;
      location: string;
      assignedNodes: string[];
      permissions: string[];
      badgeColor: string;
      roleTier: 'Administrator' | 'Operational Planner' | 'Depot Approver' | 'Field Operator';
    }
  > = {
    priya: {
      name: 'Priya Sharma',
      title: 'System Administrator & Governance Lead',
      email: 'priya@flowgrid.internal',
      department: 'Enterprise Logistics Architecture & IT Ops',
      location: 'Statewide Headquarters (Pune / Mumbai)',
      assignedNodes: ['All Maharashtra Depots', 'Chakan Hub', 'Satara Depot', 'Kolhapur Depot', 'OR-Tools Solver Cluster'],
      permissions: [
        'Full System Observability & Telemetry',
        'Systemwide Issue Resolution (Root Admin)',
        'Statewide Allocation Solver Config',
        'Data Import Studio & Master Ingestion',
        'Cross-Depot Rebalancing Approval',
      ],
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      roleTier: 'Administrator',
    },
    rohit: {
      name: 'Rohit Deshpande',
      title: 'Senior Distribution & Allocation Planner',
      email: 'rohit@flowgrid.internal',
      department: 'Central Supply Chain & Inventory Planning',
      location: 'Pune Central Planning Cell',
      assignedNodes: ['Pune Central Hub (W-PUN)', 'Satara Regional Hub (W-SAT)', 'NH-48 Transit Corridors'],
      permissions: [
        'Quantile ML Demand Forecast Review',
        'Greedy Marginal Allocation Run Execution',
        'Manual Allocation Line Overrides',
        'Ghat Road Risk & Lateness Analysis',
        'Operational Message Acknowledgement',
      ],
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      roleTier: 'Operational Planner',
    },
    sunita: {
      name: 'Sunita Deshmukh',
      title: 'Warehouse & Fulfillment Operations Manager',
      email: 'sunita@flowgrid.internal',
      department: 'Hub Logistics & Material Handling',
      location: 'Pune Central Hub (Chakan MIDC)',
      assignedNodes: ['Pune Hub Staging Bays 1-4', 'Conveyor A & B', 'Cold Chain Zone C', 'Satara Cross-Dock'],
      permissions: [
        'FEFO Lot Picking Verification',
        'Dock Bay & Outbound Staging Management',
        'Warehouse Physical Count Adjustment',
        'Shipment Dispatch Execution',
        'Depot Operational Message Acknowledgement',
      ],
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      roleTier: 'Depot Approver',
    },
    ganesh: {
      name: 'Ganesh Patil',
      title: 'Store Management Owner & Field Retail Partner',
      email: 'ganesh@flowgrid.internal',
      department: 'Store Management Partner Network',
      location: 'Ganesh Store, Shahupuri, Kolhapur',
      assignedNodes: ['STORE-MH-KOL-001 (Kolhapur)', 'Offline IndexedDB POS Queue', 'Kolhapur Store Management Cluster'],
      permissions: [
        'Offline Store Management POS Sales Capture',
        'Inbound Shipment Acceptance & Rejection',
        'Localized Stock Count Reporting',
        'Store Critical Alert Acknowledgement',
      ],
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      roleTier: 'Field Operator',
    },
  };

  const currentProfile = profileDetails[userRole];

  // Fetch messages and summary
  const loadMessagesData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [msgs, sum] = await Promise.all([
        FlowGridAPI.getCriticalMessages({ userRole }),
        FlowGridAPI.getCriticalMessagesSummary(userRole),
      ]);
      setMessages(msgs);
      setSummary(sum);
    } catch (err: any) {
      console.error('Failed to load critical messages:', err);
      setError(err?.message || 'Unable to retrieve critical messages. Please check connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessagesData();
  }, [userRole]);

  // Acknowledge Action
  const handleAcknowledge = async (message: CriticalMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionInProgressId(message.id);
    try {
      const updated = await FlowGridAPI.acknowledgeCriticalMessage(message.id, userRole);
      setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
      if (activeModalMessage?.id === updated.id) {
        setActiveModalMessage(updated);
      }
      // Refresh summary
      const newSummary = await FlowGridAPI.getCriticalMessagesSummary(userRole);
      setSummary(newSummary);
    } catch (err: any) {
      alert(`Acknowledgement error: ${err?.message || 'Failed to acknowledge message.'}`);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Resolve Action (Admin or non-restricted messages)
  const handleResolve = async (message: CriticalMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (message.admin_only && userRole !== 'priya') {
      alert('This is a core system infrastructure issue that requires System Administrator privileges to resolve.');
      return;
    }
    setActionInProgressId(message.id);
    try {
      const updated = await FlowGridAPI.resolveCriticalMessage(message.id, userRole);
      setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
      if (activeModalMessage?.id === updated.id) {
        setActiveModalMessage(updated);
      }
      const newSummary = await FlowGridAPI.getCriticalMessagesSummary(userRole);
      setSummary(newSummary);
    } catch (err: any) {
      alert(`Resolution error: ${err?.message || 'Failed to resolve message.'}`);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Filtered and Sorted Messages
  const filteredMessages = useMemo(() => {
    let result = [...messages];

    // Priority filter
    if (selectedPriority !== 'ALL') {
      result = result.filter(m => m.priority === selectedPriority);
    }

    // Module filter
    if (selectedModule !== 'ALL') {
      result = result.filter(m => {
        if (selectedModule === 'Store Management' || selectedModule === 'POS Sync' || selectedModule === 'Kirana') {
          return m.module === 'POS Sync' || (m.module as string) === 'Store Management' || (m.module as string) === 'Kirana';
        }
        return m.module.toLowerCase() === selectedModule.toLowerCase();
      });
    }

    // Status filter
    if (selectedStatus !== 'ALL') {
      result = result.filter(m => m.status === selectedStatus);
    }

    // Search query filter (title, description, or affected nodes)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        m =>
          m.title.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.affected_nodes.some(n => n.toLowerCase().includes(query)) ||
          m.module.toLowerCase().includes(query)
      );
    }

    // Sort order
    result.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [messages, selectedPriority, selectedModule, selectedStatus, searchQuery, sortOrder]);

  // Priority UI styling helpers
  const getPriorityBadge = (priority: MessagePriority) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50 text-[#DC2626] border-red-200',
          dot: 'bg-[#DC2626] animate-pulse',
          icon: AlertCircle,
          label: 'Critical Priority',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-600',
          icon: AlertTriangle,
          label: 'High Priority',
        };
      case 'MEDIUM':
      default:
        return {
          bg: 'bg-blue-50 text-[#2563EB] border-blue-200',
          dot: 'bg-[#2563EB]',
          icon: Info,
          label: 'Medium Priority',
        };
    }
  };

  // Status UI styling helpers
  const getStatusBadge = (status: MessageStatus) => {
    switch (status) {
      case 'NEW':
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          icon: Clock,
          label: 'New',
        };
      case 'ACKNOWLEDGED':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Eye,
          label: 'Acknowledged',
        };
      case 'RESOLVED':
        return {
          bg: 'bg-emerald-50 text-[#15803D] border-emerald-200',
          icon: CheckCircle2,
          label: 'Resolved',
        };
    }
  };

  // Module Label formatter
  const formatModuleLabel = (module: string) => {
    if (module === 'POS Sync' || module === 'Kirana') {
      return 'Store Management';
    }
    return module;
  };

  // Module Icon helper
  const getModuleIcon = (module: RelatedModule | string) => {
    switch (module) {
      case 'Inventory':
        return Boxes;
      case 'Forecasting':
        return TrendingUp;
      case 'Delivery':
        return Truck;
      case 'Warehouse':
        return WarehouseIcon;
      case 'Store Management':
      case 'POS Sync':
      case 'Kirana':
        return Store;
      case 'System Health':
      default:
        return Activity;
    }
  };

  // Date formatter
  const formatMessageDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return {
        formatted: date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        relative: getRelativeTimeString(date),
      };
    } catch {
      return { formatted: isoString, relative: '' };
    }
  };

  const getRelativeTimeString = (date: Date) => {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const isDay = theme === 'day';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* =========================================================================
          SECTION 1: USER PROFILE HEADER & ROLE DETAILS
          ========================================================================= */}
      <section
        className={`rounded-2xl border p-6 shadow-xs transition-all ${
          isDay
            ? 'bg-white border-[#E7E5E4]'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E7E5E4]">
          {/* Avatar and Identity */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white text-2xl font-black shadow-md shadow-[#2563EB]/20">
                {currentProfile.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold ${
                  userRole === 'priya' ? 'bg-purple-600' : 'bg-emerald-600'
                }`}
                title={`Verified ${currentProfile.roleTier}`}
              >
                ✓
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1E293B]">
                  {currentProfile.name}
                </h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border tracking-wide uppercase ${currentProfile.badgeColor}`}
                >
                  {currentProfile.roleTier}
                </span>
                {userRole === 'priya' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-600" /> Root Privileges
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#64748B]">
                {currentProfile.title}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B] pt-0.5">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-[#2563EB]" />
                  {currentProfile.department}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                  {currentProfile.location}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Persona Switcher for Testing Different Roles */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-[#FFF8E7] border border-[#E7E5E4] rounded-xl p-3">
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Active Persona Simulation
              </p>
              <p className="text-xs font-semibold text-[#1E293B]">
                Switch role to test message visibility:
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'priya', label: 'Admin (Priya)', short: 'Admin', tier: 'All Messages' },
                  { id: 'rohit', label: 'Planner (Rohit)', short: 'Planner', tier: 'Planning & Routes' },
                  { id: 'sunita', label: 'Warehouse (Sunita)', short: 'Warehouse', tier: 'Depot & FEFO' },
                  { id: 'ganesh', label: 'Store Management (Ganesh)', short: 'Store Management', tier: 'Field & POS' },
                ] as const
              ).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setUserRole(p.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    userRole === p.id
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'bg-white text-[#64748B] hover:text-[#1E293B] hover:bg-[#FAF3E0] border border-[#E7E5E4]'
                  }`}
                  title={`Simulate persona as ${p.label} (${p.tier})`}
                >
                  {p.short}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Assigned Nodes & Verified Permissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="bg-[#FAF3E0] border border-[#E7E5E4] rounded-xl p-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B] mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#2563EB]" /> Assigned Operations & Facilities
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {currentProfile.assignedNodes.map((node, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-white border border-[#E7E5E4] px-2 py-0.5 rounded-md font-medium text-[#1E293B]"
                >
                  {node}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#FAF3E0] border border-[#E7E5E4] rounded-xl p-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B] mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#2563EB]" /> Verified Permissions & Roles
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {currentProfile.permissions.map((perm, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-white border border-[#E7E5E4] px-2 py-0.5 rounded-md font-medium text-[#64748B] flex items-center gap-1"
                >
                  <Check className="w-3 h-3 text-[#15803D]" />
                  {perm}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: CRITICAL MESSAGES HEADER & KPI SUMMARY CARDS
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black tracking-tight text-[#1E293B]">
                Critical Messages &amp; System Alerts
              </h2>
              {summary && summary.new_count > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-[#DC2626] border border-red-200 animate-pulse">
                  {summary.new_count} Unacknowledged
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              {userRole === 'priya'
                ? '👑 Administrator View: Complete system-wide observability across all modules, hubs, and infrastructure nodes.'
                : `Operational View: Filtered alerts specifically relevant to ${currentProfile.name} (${currentProfile.roleTier}).`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadMessagesData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#1E293B] bg-white hover:bg-[#FAF3E0] border border-[#E7E5E4] shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#2563EB] ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {userRole === 'priya' && (
              <button
                onClick={async () => {
                  if (confirm('Reset all critical messages to initial baseline fixtures?')) {
                    await FlowGridAPI.resetCriticalMessages();
                    loadMessagesData();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#64748B] hover:text-[#DC2626] bg-white border border-[#E7E5E4] shadow-xs transition-all cursor-pointer"
                title="Reset messages store to initial seed"
              >
                <span>Reset Demo Seed</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-[#E7E5E4] rounded-xl p-3 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Total Messages</p>
              <p className="text-xl font-black text-[#1E293B] mt-1">{summary.total}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#DC2626] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse"></span>
                Critical Priority
              </p>
              <p className="text-xl font-black text-[#DC2626] mt-1">{summary.critical_count}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">High Priority</p>
              <p className="text-xl font-black text-amber-800 mt-1">{summary.high_count}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">Medium Priority</p>
              <p className="text-xl font-black text-[#2563EB] mt-1">{summary.medium_count}</p>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800">New / Unread</p>
              <p className="text-xl font-black text-sky-800 mt-1">{summary.new_count}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#15803D]">Resolved</p>
              <p className="text-xl font-black text-[#15803D] mt-1">{summary.resolved_count}</p>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 3: FILTER CONTROLS BAR
            ========================================================================= */}
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search messages by title, facility, SKU, or keyword..."
                className="w-full pl-9 pr-8 py-2 bg-[#FAF3E0] border border-[#E7E5E4] rounded-xl text-xs text-[#1E293B] placeholder-[#64748B] focus:outline-none focus:border-[#2563EB] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#64748B] font-medium">Sort:</span>
              <button
                type="button"
                onClick={() => setSortOrder(prev => (prev === 'newest' ? 'oldest' : 'newest'))}
                className="px-3 py-1.5 rounded-xl bg-[#FFF8E7] hover:bg-[#FAF3E0] border border-[#E7E5E4] text-xs font-bold text-[#1E293B] cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
              </button>
            </div>
          </div>

          {/* Filter Pills Grid: Priority, Module, Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E7E5E4] text-xs">
            {/* Priority Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[#64748B] font-bold text-[11px] uppercase mr-1">Priority:</span>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    selectedPriority === p
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'bg-[#FFF8E7] text-[#64748B] hover:text-[#1E293B] hover:bg-[#FAF3E0] border border-[#E7E5E4]'
                  }`}
                >
                  {p === 'ALL' ? 'All Priorities' : p}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[#64748B] font-bold text-[11px] uppercase mr-1">Status:</span>
              {['ALL', 'NEW', 'ACKNOWLEDGED', 'RESOLVED'].map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    selectedStatus === s
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'bg-[#FFF8E7] text-[#64748B] hover:text-[#1E293B] hover:bg-[#FAF3E0] border border-[#E7E5E4]'
                  }`}
                >
                  {s === 'ALL' ? 'All Statuses' : s}
                </button>
              ))}
            </div>

            {/* Module Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[#64748B] font-bold text-[11px] uppercase mr-1">Module:</span>
              <select
                value={selectedModule}
                onChange={e => setSelectedModule(e.target.value)}
                className="bg-[#FFF8E7] border border-[#E7E5E4] rounded-lg px-2.5 py-1 text-xs font-bold text-[#1E293B] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">All Modules</option>
                <option value="Inventory">Inventory</option>
                <option value="Forecasting">Forecasting</option>
                <option value="Delivery">Delivery</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Store Management">Store Management</option>
                <option value="System Health">System Health</option>
              </select>

              {(selectedPriority !== 'ALL' || selectedModule !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedPriority('ALL');
                    setSelectedModule('ALL');
                    setSelectedStatus('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs text-[#DC2626] hover:underline font-bold ml-2 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: RESPONSIVE 3-COLUMN GRID DISPLAY
          Desktop: 3 columns (lg:grid-cols-3)
          Tablet: 2 columns (md:grid-cols-2)
          Mobile: 1 column (grid-cols-1)
          ========================================================================= */}
      {isLoading ? (
        // Loading State: Skeleton Cards
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div
              key={n}
              className="bg-white border border-[#E7E5E4] rounded-2xl p-5 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="w-24 h-5 bg-[#FAF3E0] rounded-md"></div>
                <div className="w-16 h-5 bg-[#FAF3E0] rounded-md"></div>
              </div>
              <div className="w-3/4 h-5 bg-[#FAF3E0] rounded-md"></div>
              <div className="space-y-2">
                <div className="w-full h-3 bg-[#FAF3E0] rounded-md"></div>
                <div className="w-5/6 h-3 bg-[#FAF3E0] rounded-md"></div>
              </div>
              <div className="w-1/2 h-4 bg-[#FAF3E0] rounded-md pt-2"></div>
              <div className="flex gap-2 pt-2 border-t border-[#E7E5E4]">
                <div className="flex-1 h-8 bg-[#FAF3E0] rounded-xl"></div>
                <div className="w-24 h-8 bg-[#FAF3E0] rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // Error State
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto" />
          <h3 className="text-base font-bold text-[#DC2626]">Unable to Load Critical Messages</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">{error}</p>
          <button
            onClick={loadMessagesData}
            className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#1D4ED8] transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredMessages.length === 0 ? (
        // Empty State
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-10 text-center space-y-3 shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-[#15803D] mx-auto" />
          <h3 className="text-base font-bold text-[#1E293B]">No Critical Messages Found</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            {searchQuery || selectedPriority !== 'ALL' || selectedModule !== 'ALL' || selectedStatus !== 'ALL'
              ? 'No messages matched your current active filter settings. Try adjusting or clearing your filters.'
              : 'All systems, warehouses, corridors, and Store Management POS nodes within your operational jurisdiction are functioning normally.'}
          </p>
          {(searchQuery || selectedPriority !== 'ALL' || selectedModule !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedPriority('ALL');
                setSelectedModule('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#1D4ED8] transition-all cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        // Responsive 3-Column Grid of Critical Messages
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredMessages.map(msg => {
            const pStyle = getPriorityBadge(msg.priority);
            const sStyle = getStatusBadge(msg.status);
            const ModuleIcon = getModuleIcon(msg.module);
            const dateInfo = formatMessageDate(msg.timestamp);
            const isPendingAction = actionInProgressId === msg.id;

            return (
              <div
                key={msg.id}
                onClick={() => setActiveModalMessage(msg)}
                className={`bg-white border rounded-2xl p-4.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all cursor-pointer group relative ${
                  msg.priority === 'CRITICAL' && msg.status === 'NEW'
                    ? 'border-red-300 ring-1 ring-red-100 hover:border-[#DC2626]'
                    : 'border-[#E7E5E4] hover:border-[#2563EB]'
                }`}
              >
                {/* Top Card Header: Module Badge & Priority Badge */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    {/* Module Tag */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF8E7] border border-[#E7E5E4] text-[11px] font-bold text-[#1E293B]">
                      <ModuleIcon className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{formatModuleLabel(msg.module)}</span>
                    </span>

                    {/* Priority Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${pStyle.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
                      <span>{msg.priority}</span>
                    </span>
                  </div>

                  {/* Message Title */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-[#1E293B] group-hover:text-[#2563EB] transition-colors leading-snug">
                      {msg.title}
                    </h3>
                    <p className="text-xs text-[#64748B] line-clamp-3 leading-relaxed">
                      {msg.description}
                    </p>
                  </div>

                  {/* Affected Nodes Pills */}
                  {msg.affected_nodes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {msg.affected_nodes.map((node, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-[#FAF3E0] border border-[#E7E5E4] text-[#1E293B] px-1.5 py-0.5 rounded font-mono font-medium"
                        >
                          {node}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Admin Only Notice Badge */}
                  {msg.admin_only && (
                    <div className="flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                      <Shield className="w-3 h-3 text-purple-600" />
                      <span>Admin Infrastructure Incident</span>
                    </div>
                  )}
                </div>

                {/* Card Footer: Timestamp, Status, and Actions */}
                <div className="pt-4 mt-3 border-t border-[#E7E5E4] space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span className="flex items-center gap-1 font-medium" title={dateInfo.formatted}>
                      <Clock className="w-3 h-3 text-[#64748B]" />
                      <span>{dateInfo.relative}</span>
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${sStyle.bg}`}
                    >
                      <sStyle.icon className="w-3 h-3" />
                      <span>{sStyle.label}</span>
                    </span>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setActiveModalMessage(msg)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>

                    {/* Action: Acknowledge or Resolve */}
                    {msg.status === 'NEW' ? (
                      <button
                        type="button"
                        disabled={isPendingAction}
                        onClick={e => handleAcknowledge(msg, e)}
                        className="py-1.5 px-3 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs disabled:opacity-50"
                        title="Acknowledge awareness of this critical operational issue"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    ) : msg.status === 'ACKNOWLEDGED' ? (
                      userRole === 'priya' || !msg.admin_only ? (
                        <button
                          type="button"
                          disabled={isPendingAction}
                          onClick={e => handleResolve(msg, e)}
                          className="py-1.5 px-3 rounded-xl text-xs font-bold text-white bg-[#15803D] hover:bg-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs disabled:opacity-50"
                          title="Confirm and mark this issue as resolved"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolve</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-purple-700 font-bold px-2 py-1 bg-purple-50 rounded-lg border border-purple-200">
                          Admin to Resolve
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-bold text-[#15803D] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          SECTION 5: MESSAGE DETAIL MODAL DIALOG
          ========================================================================= */}
      {activeModalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveModalMessage(null)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-2xl bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl p-6 z-10 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#E7E5E4] pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#64748B] bg-[#FFF8E7] px-2 py-0.5 rounded border border-[#E7E5E4]">
                    {activeModalMessage.id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                      getPriorityBadge(activeModalMessage.priority).bg
                    }`}
                  >
                    <span>{activeModalMessage.priority}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      getStatusBadge(activeModalMessage.status).bg
                    }`}
                  >
                    <span>{getStatusBadge(activeModalMessage.status).label}</span>
                  </span>
                </div>
                <h3 className="text-lg font-black text-[#1E293B] leading-tight">
                  {activeModalMessage.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalMessage(null)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#FAF3E0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs text-[#1E293B]">
              {/* Description */}
              <div className="bg-[#FAF3E0] border border-[#E7E5E4] rounded-xl p-3.5 space-y-1">
                <p className="font-bold uppercase tracking-wider text-[10px] text-[#64748B]">
                  Context &amp; Operational Impact
                </p>
                <p className="text-xs leading-relaxed text-[#1E293B]">
                  {activeModalMessage.description}
                </p>
              </div>

              {/* Recommended Action */}
              {activeModalMessage.action_required && (
                <div className="bg-blue-50 border border-[#BFDBFE] rounded-xl p-3.5 space-y-1">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-[#2563EB] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Recommended Operational Protocol
                  </p>
                  <p className="text-xs leading-relaxed text-[#1E293B] font-medium">
                    {activeModalMessage.action_required}
                  </p>
                </div>
              )}

              {/* Affected Nodes */}
              {activeModalMessage.affected_nodes.length > 0 && (
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px] text-[#64748B] mb-1.5">
                    Affected System Entities &amp; Facilities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeModalMessage.affected_nodes.map((node, i) => (
                      <span
                        key={i}
                        className="bg-white border border-[#E7E5E4] px-2.5 py-1 rounded-lg font-mono text-xs font-semibold text-[#1E293B]"
                      >
                        {node}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Audit Trail */}
              <div className="border border-[#E7E5E4] rounded-xl p-3.5 bg-[#FFF8E7] space-y-2">
                <p className="font-bold uppercase tracking-wider text-[10px] text-[#64748B]">
                  Incident Audit &amp; Telemetry Log
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#64748B]">Opened At:</span>{' '}
                    <span className="font-semibold text-[#1E293B]">
                      {formatMessageDate(activeModalMessage.timestamp).formatted}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Related Module:</span>{' '}
                    <span className="font-semibold text-[#1E293B]">{formatModuleLabel(activeModalMessage.module)}</span>
                  </div>
                  {activeModalMessage.acknowledged_at && (
                    <div>
                      <span className="text-[#64748B]">Acknowledged:</span>{' '}
                      <span className="font-semibold text-[#1E293B]">
                        {formatMessageDate(activeModalMessage.acknowledged_at).formatted} (by{' '}
                        {activeModalMessage.acknowledged_by || 'Operator'})
                      </span>
                    </div>
                  )}
                  {activeModalMessage.resolved_at && (
                    <div>
                      <span className="text-[#64748B]">Resolved:</span>{' '}
                      <span className="font-semibold text-[#15803D]">
                        {formatMessageDate(activeModalMessage.resolved_at).formatted} (by{' '}
                        {activeModalMessage.resolved_by || 'Admin'})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-[#E7E5E4] pt-4">
              <button
                type="button"
                onClick={() => setActiveModalMessage(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:text-[#1E293B] bg-[#FFF8E7] border border-[#E7E5E4] cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {activeModalMessage.status === 'NEW' && (
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(activeModalMessage)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Acknowledge Message</span>
                  </button>
                )}

                {activeModalMessage.status !== 'RESOLVED' && (
                  userRole === 'priya' || !activeModalMessage.admin_only ? (
                    <button
                      type="button"
                      onClick={() => handleResolve(activeModalMessage)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#15803D] hover:bg-emerald-700 shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  ) : (
                    <span className="text-xs text-purple-700 font-bold px-3 py-1.5 bg-purple-50 rounded-xl border border-purple-200">
                      System Administrator Required to Resolve
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
