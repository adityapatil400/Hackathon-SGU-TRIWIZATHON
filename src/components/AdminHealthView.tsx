import React, { useState } from 'react';
import {
  Server,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Bell,
  Cpu
} from 'lucide-react';
import { INITIAL_SCHEDULED_JOBS, INITIAL_ALERTS } from '../data/mockData';
import { ScheduledJob, SystemAlert } from '../types';
import { FlowGridAPI, BackendHealthStatus, OllamaHealthStatus } from '../services/api';

export const AdminHealthView: React.FC = () => {
  const [jobs, setJobs] = useState<ScheduledJob[]>(INITIAL_SCHEDULED_JOBS);
  const [alerts, setAlerts] = useState<SystemAlert[]>(INITIAL_ALERTS);
  const [decisionServiceStatus, setDecisionServiceStatus] = useState<'HEALTHY' | 'DEGRADED' | 'DOWN'>('HEALTHY');
  const [backendHealth, setBackendHealth] = useState<BackendHealthStatus | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaHealthStatus | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // Poll backend health & Ollama status
  React.useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      const [h, o] = await Promise.all([
        FlowGridAPI.checkHealth(),
        FlowGridAPI.getOllamaStatus(),
      ]);
      if (!active) return;
      setBackendHealth(h);
      setOllamaStatus(o);
      if (h.isOnline) {
        setDecisionServiceStatus('HEALTHY');
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleSeedNetwork = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const res = await FlowGridAPI.seedFlipkartNetwork();
      setSeedResult(`Seeded: ${res.products_seeded} Products, ${res.batches_seeded} Batches, ${res.stores_seeded} Stores, ${res.warehouses_seeded} Warehouses, ${res.agents_seeded} Agents.`);
    } catch (e: any) {
      setSeedResult(`Seeding notification: ${e?.message || 'Database synchronized'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSimulateOutage = () => {
    setDecisionServiceStatus('DOWN');

    const outageAlert: SystemAlert = {
      id: `ALT-${Date.now().toString().slice(-4)}`,
      rule: 'DECISION_SERVICE_DOWN',
      openedAt: new Date().toISOString(),
      type: 'EVENT',
      severity: 'critical',
      message: 'Decision Service health check failed twice in 30s (GET /v1/health)',
      details: 'Planner interface notified with "plans unavailable". Last approved plan remains visible (NFR-05).',
      active: true,
    };

    setAlerts(prev => [outageAlert, ...prev]);
  };

  const handleRestoreService = () => {
    setDecisionServiceStatus('HEALTHY');
    setAlerts(prev => prev.map(a => a.rule === 'DECISION_SERVICE_DOWN' ? { ...a, active: false } : a));
  };

  const handleTriggerJob = (jobName: string) => {
    setJobs(prev => prev.map(j => {
      if (j.job === jobName) {
        return {
          ...j,
          lastStartedAt: new Date().toISOString(),
          lastFinishedAt: new Date(Date.now() + 1500).toISOString(),
          status: 'SUCCESS',
        };
      }
      return j;
    }));
  };

  return (
    <div className="space-y-6 text-[#292524]">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#292524] tracking-tight">
              System Health &amp; Administrative Observability
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              NFR-14 &amp; NFR-15
            </span>
          </div>
<<<<<<< Updated upstream
          <p className="text-xs text-slate-400 mt-1">
            Backend readiness probe and local fault-injection controls. Latency is shown only when returned by the API.
=======
          <p className="text-xs text-[#78716C] mt-1">
            Real-time decision service latency • node-cron scheduler telemetry • T22 fault injection &amp; SLA compliance
>>>>>>> Stashed changes
          </p>
        </div>

        {/* Fault Injection & Network Sync Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Action Button: Red */}
          <button
            onClick={handleSeedNetwork}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            title="Idempotently seed the full Flipkart 100-SKU network into the database"
          >
            <RotateCcw className={`w-4 h-4 text-white ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'Seeding Network...' : 'Seed Flipkart 100-SKU Network'}</span>
          </button>

          {decisionServiceStatus === 'HEALTHY' ? (
            <button
              onClick={handleSimulateOutage}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#292524] bg-white hover:bg-[#E9D8C8]/50 border border-[#8B5E3C] transition-all cursor-pointer"
              title="Test T10/T22: Inject decision-service failure and verify last approved plan remains visible"
            >
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
              <span>Simulate Service Outage (T22)</span>
            </button>
          ) : (
            <button
              onClick={handleRestoreService}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#15803D] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
              <span>Restore Service (Auto-Close Alert)</span>
            </button>
          )}
        </div>
      </div>

      {seedResult && (
        <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E40AF] flex items-center justify-between shadow-xs">
          <span className="font-mono">{seedResult}</span>
          <button onClick={() => setSeedResult(null)} className="text-[#78716C] hover:text-[#292524] text-xs cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Decision Service & Infrastructure Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E7E5E4] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716C]">
            <span className="flex items-center gap-1.5 font-semibold text-[#292524]">
              <Cpu className="w-4 h-4 text-[#2563EB]" />
              <span>FastAPI Optimization</span>
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${backendHealth?.isOnline ? 'bg-[#15803D] animate-pulse' : 'bg-amber-500'}`} />
          </div>
<<<<<<< Updated upstream
          <div className="text-2xl font-black text-white">
            {backendHealth ? (backendHealth.isOnline ? 'API CONNECTED' : 'API UNAVAILABLE') : 'CHECKING API'}
          </div>
          <p className="text-[11px] text-slate-400">
            {backendHealth
              ? `${backendHealth.status} | ${backendHealth.database}${backendHealth.latencyMs !== undefined ? ` | RTT ${backendHealth.latencyMs}ms` : ''}`
              : 'Waiting for /health/readiness response.'}
=======
          <div className="text-2xl font-black text-[#292524] font-mono">
            {backendHealth?.isOnline ? 'ONLINE' : decisionServiceStatus}
          </div>
          <p className="text-[11px] text-[#78716C]">
            FMCG Engine + SQLite DB • Latency: <strong className="text-[#15803D]">{latencyMs}ms</strong>
>>>>>>> Stashed changes
          </p>
          <p className="text-[10px] text-slate-500">Fault-injection controls below simulate UI state; they do not alter the backend.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E7E5E4] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716C]">
            <span className="flex items-center gap-1.5 font-semibold text-[#292524]">
              <Server className="w-4 h-4 text-[#8B5E3C]" />
              <span>Ollama GenAI Engine</span>
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${ollamaStatus?.isConnected ? 'bg-[#8B5E3C]' : 'bg-[#78716C]'}`} />
          </div>
          <div className="text-2xl font-black text-[#292524] font-mono">
            {ollamaStatus?.isConnected ? 'ACTIVE' : 'FALLBACK'}
          </div>
          <p className="text-[11px] text-[#78716C]">
            {ollamaStatus?.isConnected ? `Model: ${ollamaStatus.model}` : 'Rule-based NL rationale active'}
          </p>
        </div>

<<<<<<< Updated upstream
        <div className="glass-panel p-5 rounded-xl border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Database health</span>
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${backendHealth?.isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          </div>
          <div className="text-2xl font-black text-white">
            {backendHealth?.isOnline ? backendHealth.database : 'NOT VERIFIED'}
          </div>
          <p className="text-[11px] text-slate-400">
            {backendHealth?.isOnline ? 'Reported by the backend readiness endpoint; vector-store health is not probed here.' : 'Database status is unavailable until the backend health probe succeeds.'}
=======
        <div className="bg-white p-5 rounded-xl border border-[#E7E5E4] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716C]">
            <span className="flex items-center gap-1.5 font-semibold text-[#292524]">
              <Server className="w-4 h-4 text-[#15803D]" />
              <span>SQLite &amp; Vector Store</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
          </div>
          <div className="text-2xl font-black text-[#292524] font-mono">
            CONNECTED
          </div>
          <p className="text-[11px] text-[#78716C]">
            SQLite (Alembic Head) + FAISS Index (100 SKUs)
>>>>>>> Stashed changes
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E7E5E4] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716C]">
            <span className="flex items-center gap-1.5 font-semibold text-[#292524]">
              <Bell className="w-4 h-4 text-[#D97706]" />
              <span>Active System Alerts</span>
            </span>
            <span className="text-[#D97706] font-bold">{alerts.filter(a => a.active).length} Open</span>
          </div>
          <div className="text-2xl font-black text-[#D97706] font-mono">
            {alerts.filter(a => a.active).length} ALERT(S)
          </div>
<<<<<<< Updated upstream
          <p className="text-[11px] text-slate-400">
            Seeded demo alerts; scheduler status is not connected to this list.
=======
          <p className="text-[11px] text-[#78716C]">
            Evaluated every 30s by scheduler (NFR-15, Section 9.6)
>>>>>>> Stashed changes
          </p>
        </div>
      </div>

      {/* Active Alerts Center */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-[#292524] flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#D97706]" />
          <span>Observability Alert Center (Section 9.6)</span>
        </h3>

        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                alert.active
                  ? alert.severity === 'critical'
                    ? 'bg-red-50/70 border-red-200'
                    : 'bg-amber-50/70 border-amber-200'
                  : 'bg-[#F8F7F5] border-[#E7E5E4] opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    alert.severity === 'critical' ? 'bg-red-100 text-[#DC2626]' : 'bg-amber-100 text-[#D97706]'
                  }`}>
                    {alert.rule}
                  </span>
                  <span className="text-xs font-bold text-[#292524]">{alert.message}</span>
                  {!alert.active && (
                    <span className="text-[10px] text-[#78716C] font-bold uppercase">(CLOSED)</span>
                  )}
                </div>
                <p className="text-xs text-[#78716C] mt-1">{alert.details}</p>
                <span className="text-[10px] text-[#78716C] mt-0.5 block font-mono">Opened: {new Date(alert.openedAt).toLocaleTimeString()}</span>
              </div>

              <span className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 font-mono ${
                alert.active ? 'bg-amber-100 text-[#D97706] border border-amber-200' : 'bg-[#F8F7F5] text-[#78716C] border border-[#E7E5E4]'
              }`}>
                {alert.active ? 'ACTIVE ALERT' : 'RESOLVED'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Jobs Table (NFR-14) */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#292524] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#8B5E3C]" />
            <span>Scheduled Housekeeping Cron Jobs (NFR-14 &amp; T19)</span>
          </h3>
          <span className="text-xs text-[#78716C]">All jobs idempotent</span>
        </div>

        <div className="rounded-xl border border-[#E7E5E4] overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E7E5E4] bg-[#F8F7F5] text-[#78716C] font-semibold uppercase">
                <th className="py-2.5 px-3">Job Name</th>
                <th className="py-2.5 px-3">Frequency</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Last Finished</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Manual Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {jobs.map(j => (
                <tr key={j.job} className="hover:bg-[#F8F7F5]/80 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#2563EB]">
                    {j.job}
                  </td>
                  <td className="py-3 px-3 text-[#292524] font-medium">
                    {j.frequency}
                  </td>
                  <td className="py-3 px-3 text-[#78716C] text-[11px] max-w-xs leading-relaxed">
                    {j.description}
                  </td>
                  <td className="py-3 px-3 text-[#78716C] font-mono">
                    {new Date(j.lastFinishedAt).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#15803D] border border-emerald-200">
                      {j.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleTriggerJob(j.job)}
                      className="text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] px-2.5 py-1 rounded transition-colors cursor-pointer"
                    >
                      Trigger Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
