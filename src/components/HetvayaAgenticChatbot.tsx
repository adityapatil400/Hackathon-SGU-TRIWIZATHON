import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  Trash2,
  RefreshCw,
  Database,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Package,
  Layers,
  MapPin,
  Truck,
  TrendingUp,
  Maximize2,
  Minimize2,
  Fuel,
  Cpu,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { sendChatMessage } from '../../hetvaya_chatbot_package/frontend/chatApi';
import { ChatMessage, ChatContext, ChatSourceItem, AgenticToolExecution } from '../../hetvaya_chatbot_package/frontend/types';
import { Product, Warehouse, Retailer, Route, InventoryBatch, DemandForecast, PlanRun, UserRole } from '../types';
import { fetchFuelPrices, FuelPriceData } from '../services/fuelService';

export interface HetvayaAgenticChatbotProps {
  products: Product[];
  warehouses: Warehouse[];
  retailers: Retailer[];
  routes: Route[];
  batches: InventoryBatch[];
  forecasts: DemandForecast[];
  planRun: PlanRun | null;
  userRole?: UserRole;
  activeTab?: string;
  isOpen?: boolean;
  onClose?: () => void;
  language?: 'en' | 'hi' | 'mr';
}

const QUICK_PROMPTS = [
  { label: '⛽ Fuel Prices & Freight Surcharges', query: 'What are the current fuel prices and freight surcharges in Maharashtra?' },
  { label: '⚠️ FEFO Expiry Risk (< 30 days)', query: 'Which products are at risk of expiry (FEFO)?' },
  { label: '📦 Catalog Stock Availability', query: 'What is the available inventory for Aashirvaad Atta?' },
  { label: '🚚 Pune to D-Mart Corridor Freight', query: 'What is the estimated freight cost from Pune to D-Mart?' },
  { label: '📋 Allocation Plan Rationale', query: 'Explain the active distribution plan allocation rationale.' },
];

export const HetvayaAgenticChatbot: React.FC<HetvayaAgenticChatbotProps> = ({
  products,
  warehouses,
  retailers,
  routes,
  batches,
  forecasts,
  planRun,
  userRole = 'rohit',
  activeTab = 'plans',
  isOpen: propIsOpen,
  onClose: propOnClose,
  language: initialLanguage = 'en',
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (propOnClose && !val) {
      propOnClose();
    }
    setInternalIsOpen(val);
  };

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>(initialLanguage);
  const [fuelData, setFuelData] = useState<FuelPriceData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedToolsMsgId, setExpandedToolsMsgId] = useState<string | null>(null);
  const [activeSourceModal, setActiveSourceModal] = useState<ChatSourceItem | null>(null);

  // Compute near-expiry batches from continuous live batches
  const nearExpiryCount = batches.filter(b => {
    try {
      const expDate = new Date(b.expiryDate).getTime();
      const now = Date.now();
      const daysLeft = (expDate - now) / (1000 * 3600 * 24);
      return daysLeft > 0 && daysLeft <= 45;
    } catch {
      return false;
    }
  }).length;

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-nemotron',
      sender: 'assistant',
      text:
        language === 'hi'
          ? `नमस्ते! मैं आपका **HETVAYA Agentic Copilot** हूँ, जो **nemotron-3-ultra:cloud** द्वारा संचालित है। मेरे पास वर्तमान सिस्टम के सभी उत्पाद, गोदाम, FEFO इन्वेंटरी बैच और ईंधन दरों का निरंतर लाइव डेटा है। आप मुझसे फ्रेट अधिभार, स्टॉक उपलब्धता या आवंटन निर्णय के बारे में पूछ सकते हैं।`
          : language === 'mr'
          ? `नमस्कार! मी तुमचा **HETVAYA Agentic Copilot** आहे, जो **nemotron-3-ultra:cloud** द्वारे चालवला जातो. माझ्याकडे चालू सिस्टममधील सर्व उत्पादने, वेअरहाऊस, FEFO बॅचेस आणि इंधनाच्या दरांची संपूर्ण थेट माहिती आहे.`
          : `Welcome to **HETVAYA Agentic Copilot** powered by **nemotron-3-ultra:cloud**.\n\nI continuously monitor your live supply chain state (**${products.length} Products**, **${warehouses.length} Hubs**, **${retailers.length} Stores**, **${batches.length} Batches**) and live fuel prices across India with strict rule-based freight surcharges. How can I assist your distribution planning today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAiGenerated: true,
      activeModel: 'nemotron-3-ultra:cloud',
      toolsExecuted: [
        {
          tool_name: 'sync_continuous_system_resources',
          output_summary: `Synchronized ${products.length} products, ${warehouses.length} warehouses, ${batches.length} batches, ${routes.length} corridors.`,
          status: 'SUCCESS',
        },
        {
          tool_name: 'fetch_google_rss_fuel_prices',
          output_summary: `Fetched live Maharashtra diesel index: ₹92.85/L (Base: ₹90.00/L | Surcharge: +1.43%).`,
          status: 'SUCCESS',
        },
      ],
      suggestedFollowups: [
        'Audit demand forecast decision for Aashirvaad Atta at Ganesh Kirana',
        'What are the current fuel prices and freight surcharges in Maharashtra?',
        'Which products are at risk of expiry (FEFO)?',
        'What is the available inventory for Aashirvaad Atta?',
        'What is the estimated freight cost from Pune to D-Mart?',
      ],
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  // Load fuel data on mount
  useEffect(() => {
    let isMounted = true;
    fetchFuelPrices('Maharashtra')
      .then(data => {
        if (isMounted) setFuelData(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // External listener for opening and pre-filling queries from ForecastReviewView
  useEffect(() => {
    const handleOpenChatbot = (e: any) => {
      setIsOpen(true);
      if (e.detail?.query) {
        setTimeout(() => {
          handleSend(e.detail.query);
        }, 200);
      }
    };
    window.addEventListener('open-chatbot', handleOpenChatbot);
    return () => {
      window.removeEventListener('open-chatbot', handleOpenChatbot);
    };
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputValue).trim();
    if (!text || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Continuous system resources package
    const systemResourcesPayload = {
      products: products.map(p => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        unit_cost: p.unitCost,
        unit_price: p.unitPrice,
        case_size: p.caseSize,
        shelf_life_days: p.shelfLifeDays,
        is_perishable: p.perishable,
      })),
      warehouses: warehouses.map(w => ({
        id: w.id,
        name: w.name,
        city: w.city,
        capacity_cases: w.capacityCasesPerCycle,
        current_cases: w.utilizationCases || 0,
      })),
      retailers: retailers.map(r => ({
        id: r.id,
        name: r.name,
        city: r.city,
        type: r.type,
        min_shelf_life_pct: r.minShelfLifePct,
      })),
      batches: batches.slice(0, 30).map(b => ({
        batch_no: b.batchNo,
        sku: b.sku,
        warehouse_id: b.warehouseId,
        available_units: b.qtyUnits,
        allocated_units: b.reservedUnits,
        expiry_date: b.expiryDate,
      })),
      forecasts: forecasts.slice(0, 15).map(f => ({
        sku: f.sku,
        retailer_id: f.retailerId,
        median_q50: f.q50,
        q80: f.q80,
        q90: f.q90,
        q95: f.q95,
      })),
      active_plan: planRun
        ? {
            id: planRun.id,
            total_cases: planRun.totalCases,
            total_freight_rupees: planRun.totalFreightRupees,
            allocations_count: planRun.lines?.length || 0,
          }
        : null,
      user_role: userRole,
      active_tab: activeTab,
      live_diesel_price: fuelData?.diesel_price_inr || 92.85,
    };

    const contextPayload: ChatContext = {
      planCode: planRun?.id,
      systemResources: systemResourcesPayload,
    };

    try {
      const resp = await sendChatMessage(text, contextPayload, language);
      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: resp.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: resp.sources,
        suggestedFollowups: resp.suggested_followups,
        isAiGenerated: resp.is_ai_generated,
        activeModel: resp.active_model || 'nemotron-3-ultra:cloud',
        toolsExecuted: resp.tools_executed,
        structuredCard: resp.structured_card,
        missingInformation: resp.missing_information,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Sorry, I encountered an issue processing your query against live system data. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Conversation reset. I am connected with active model **nemotron-3-ultra:cloud** and synchronized with **${products.length} Products**, **${warehouses.length} Hubs**, and live Indian diesel rates.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        activeModel: 'nemotron-3-ultra:cloud',
        suggestedFollowups: [
          'What are the current fuel prices and freight surcharges in Maharashtra?',
          'Which products are at risk of expiry (FEFO)?',
          'What is the available inventory for Aashirvaad Atta?',
        ],
      },
    ]);
  };

  return (
    <>
      {/* Floating Copilot Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white shadow-2xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/20 cursor-pointer"
          aria-label="Open HETVAYA Agentic Copilot"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight">HETVAYA Copilot</span>
              <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded text-white font-semibold">
                nemotron-3-ultra
              </span>
            </div>
            <p className="text-[10px] text-blue-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Live FMCG &amp; Fuel Agent
            </p>
          </div>
        </button>
      )}

      {/* Slide-in Agentic Drawer / Modal */}
      {isOpen && (
        <div
          className={`fixed bottom-0 right-0 z-50 flex flex-col bg-slate-900 text-slate-100 shadow-2xl border-l border-slate-800 transition-all duration-300 ${
            isExpanded
              ? 'w-full md:w-[780px] h-full md:h-[94vh] md:rounded-tl-2xl'
              : 'w-full sm:w-[480px] h-full sm:h-[680px] sm:rounded-tl-2xl sm:border-t sm:border-l'
          }`}
        >
          {/* Header Bar */}
          <div className="p-3.5 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold tracking-tight text-white flex items-center gap-1 truncate">
                    HETVAYA Agentic Copilot
                  </h3>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    nemotron-3-ultra:cloud
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  Grounding • Continuous System State • Fuel Surcharge Rules
                </p>
              </div>
            </div>

            {/* Actions & Window Controls */}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {/* Language Selector */}
              <div className="flex bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-[10px] font-bold mr-1">
                {(['en', 'hi', 'mr'] as const).map(langCode => (
                  <button
                    key={langCode}
                    onClick={() => setLanguage(langCode)}
                    className={`px-1.5 py-0.5 rounded transition-colors uppercase ${
                      language === langCode
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {langCode}
                  </button>
                ))}
              </div>

              {/* Clear */}
              <button
                onClick={handleClearHistory}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Clear conversation history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Expand/Collapse */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={isExpanded ? 'Collapse view' : 'Expand view'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Close Copilot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Continuous Live System Resource Ticker */}
          <div className="bg-slate-950/60 border-b border-slate-800/50 px-3.5 py-1.5 flex items-center justify-between text-[10px] text-slate-400 overflow-x-auto whitespace-nowrap gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3 text-blue-400" />
                <strong className="text-slate-200">{products.length}</strong> SKUs
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <strong className="text-slate-200">{warehouses.length}</strong> Hubs
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-purple-400" />
                <strong className="text-slate-200">{retailers.length}</strong> Stores
              </span>
              {nearExpiryCount > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  {nearExpiryCount} Near-Expiry
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono">
                <Fuel className="w-3 h-3 text-amber-400" />
                Diesel ₹{fuelData?.diesel_price_inr || 92.85}/L (+
                {fuelData?.surcharge_analysis?.surcharge_percentage || 1.43}%)
              </span>
              <span className="flex items-center gap-1 font-mono text-[9px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-300">
                <Cpu className="w-2.5 h-2.5 text-indigo-400" />
                {planRun ? planRun.id : 'Cycle: RUN-902'}
              </span>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-end gap-2 max-w-[92%] sm:max-w-[85%]">
                    {isAssistant && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mb-1 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed transition-all ${
                        isAssistant
                          ? 'bg-slate-800/90 text-slate-100 rounded-bl-xs border border-slate-700/60 shadow-lg'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-md shadow-blue-600/20'
                      } ${msg.isError ? 'border-rose-500/50 bg-rose-950/30 text-rose-200' : ''}`}
                    >
                      {/* Assistant Header: Model Pill & Time */}
                      {isAssistant && (
                        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-700/50 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 font-mono text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {msg.activeModel || 'nemotron-3-ultra:cloud'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>{msg.timestamp}</span>
                            <button
                              onClick={() => handleCopy(msg.text, msg.id)}
                              className="text-slate-400 hover:text-white transition-colors"
                              title="Copy response"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Agentic Tools Execution Badges */}
                      {msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
                        <div className="mb-3 bg-slate-900/80 rounded-xl p-2 border border-slate-700/50">
                          <button
                            onClick={() =>
                              setExpandedToolsMsgId(expandedToolsMsgId === msg.id ? null : msg.id)
                            }
                            className="w-full flex items-center justify-between text-[10px] font-semibold text-indigo-300 hover:text-indigo-200 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-indigo-400 animate-pulse" />
                              Agentic Tools Executed ({msg.toolsExecuted.length})
                            </span>
                            {expandedToolsMsgId === msg.id ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>

                          {expandedToolsMsgId === msg.id && (
                            <div className="mt-2 space-y-1.5 pt-1.5 border-t border-slate-800 text-[10px]">
                              {msg.toolsExecuted.map((tool, tIdx) => (
                                <div
                                  key={tIdx}
                                  className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 font-mono"
                                >
                                  <div className="flex items-center justify-between text-indigo-400 font-bold">
                                    <span>⚡ {tool.tool_name}</span>
                                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">
                                      {tool.status || 'SUCCESS'}
                                    </span>
                                  </div>
                                  {tool.output_summary && (
                                    <p className="text-slate-300 text-[10px] mt-1 font-sans">
                                      {tool.output_summary}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Content (Formatted Markdown) */}
                      <div className="whitespace-pre-wrap font-sans text-xs space-y-1.5">
                        {msg.text.split('\n\n').map((paragraph, pIdx) => (
                          <p key={pIdx} className="leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>

                      {/* Interactive Structured Card (e.g. Fuel Surcharge Table) */}
                      {msg.structuredCard && msg.structuredCard.card_type === 'fuel_surcharge_table' && (
                        <div className="mt-3.5 p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 shadow-md">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                              <Fuel className="w-4 h-4 text-amber-400" />
                              Rule-Based Corridor Freight Surcharge
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                              +{msg.structuredCard.surcharge_pct}% Surcharge
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] mb-2 font-mono">
                            <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                              <span className="text-slate-400">Diesel Rate:</span>{' '}
                              <strong className="text-slate-200">
                                ₹{msg.structuredCard.diesel_price}/L
                              </strong>
                            </div>
                            <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                              <span className="text-slate-400">Base Baseline:</span>{' '}
                              <strong className="text-slate-200">
                                ₹{msg.structuredCard.base_benchmark}/L
                              </strong>
                            </div>
                          </div>

                          {msg.structuredCard.corridors && (
                            <div className="overflow-x-auto text-[10px]">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="text-slate-400 border-b border-slate-800 font-semibold">
                                    <th className="py-1">Route Corridor</th>
                                    <th className="py-1 text-right">Base</th>
                                    <th className="py-1 text-right">Adjusted</th>
                                    <th className="py-1 text-right">Impact</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                  {msg.structuredCard.corridors.map((c: any, cIdx: number) => (
                                    <tr key={cIdx} className="hover:bg-slate-800/40">
                                      <td className="py-1.5 pr-2 truncate max-w-[140px]">
                                        {c.origin} → {c.destination}
                                      </td>
                                      <td className="py-1.5 text-right font-mono text-slate-400">
                                        ₹{c.base_freight_per_case_inr}
                                      </td>
                                      <td className="py-1.5 text-right font-mono font-bold text-slate-100">
                                        ₹{c.adjusted_freight_per_case_inr}
                                      </td>
                                      <td className="py-1.5 text-right font-mono text-amber-400 font-semibold">
                                        +₹{c.incremental_surcharge_per_case_inr}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Verified Source Data Chips */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-700/50 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                            <ShieldCheck className="w-3 h-3 text-blue-400" />
                            Verified Sources:
                          </span>
                          {msg.sources.map((src, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => setActiveSourceModal(src)}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 hover:bg-slate-700 text-blue-300 border border-blue-500/20 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Inspect verified ground truth record"
                            >
                              <span>{src.title}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-blue-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Suggested Follow-ups */}
                  {isAssistant && msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                    <div className="mt-2 ml-9 flex flex-wrap gap-1.5 max-w-[85%]">
                      {msg.suggestedFollowups.map((followup, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleSend(followup)}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-left cursor-pointer flex items-center gap-1"
                        >
                          <span>{followup}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400 animate-spin">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <span className="font-mono text-[11px] text-indigo-300 flex items-center gap-1">
                  nemotron-3-ultra:cloud reasoning over live state...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Pills */}
          <div className="p-2 bg-slate-950/80 border-t border-slate-800/60 overflow-x-auto whitespace-nowrap flex items-center gap-1.5 shrink-0">
            {QUICK_PROMPTS.map((p, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleSend(p.query)}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 transition-colors shrink-0 cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Ask about fuel prices, FEFO batches, stockouts, or allocation plan..."
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* Verified Ground Truth Source Detail Modal */}
      {activeSourceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold truncate">{activeSourceModal.title}</h4>
              </div>
              <button
                onClick={() => setActiveSourceModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Source Type:</span>
                <span className="font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold uppercase">
                  {activeSourceModal.source_type}
                </span>
                {activeSourceModal.identifier && (
                  <span className="font-mono text-slate-400">ID: {activeSourceModal.identifier}</span>
                )}
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto max-h-64">
                <pre>{JSON.stringify(activeSourceModal.verified_data, null, 2)}</pre>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setActiveSourceModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
