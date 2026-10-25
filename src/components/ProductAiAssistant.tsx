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
} from 'lucide-react';
import { FlowGridAPI } from '../services/api';
import { ChatMessage, ChatContext, ChatSourceItem } from '../types';
import { useTranslation } from '../context/TranslationContext';

interface ProductAiAssistantProps {
  context?: ChatContext | null;
  onClearContext?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const INITIAL_SUGGESTED_PROMPTS = [
  { label: 'Out of stock products', query: 'Which products are currently out of stock?', icon: Package },
  { label: 'Expiry risk (FEFO)', query: 'Which products are at risk of expiry?', icon: AlertTriangle },
  { label: 'Atta inventory levels', query: 'What is the available inventory for Aashirvaad Atta?', icon: Layers },
  { label: 'Warehouse sourcing', query: 'Which warehouse can supply Amul Milk?', icon: MapPin },
  { label: 'Allocation reasoning', query: 'Why was this product allocated to this retailer?', icon: ShieldCheck },
  { label: 'Corridor freight costs', query: 'What is the estimated freight cost from Pune to D-Mart?', icon: Truck },
  { label: 'FMCG demand forecasts', query: 'Which products have high demand?', icon: TrendingUp },
  { label: 'Explain distribution plan', query: 'Explain this distribution recommendation.', icon: Sparkles },
];

export const ProductAiAssistant: React.FC<ProductAiAssistantProps> = ({
  context,
  onClearContext,
  onNavigateTab,
}) => {
  const { language, t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: `Welcome to **HETVAYA Product AI Assistant**.\n\nI provide real-time, fact-verified insights regarding product catalog specifications, inventory availability, First-Expiry-First-Out (FEFO) batches, warehouse sourcing, freight rates, and allocation decisions.\n\nSelect a suggested prompt below or ask any question about your supply chain network.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowups: [
          'Which products are currently out of stock?',
          'Which products are at risk of expiry?',
          'What is the available inventory for Aashirvaad Atta?',
          'What is the estimated freight cost?',
        ],
        isAiGenerated: false,
      },
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // When context changes from outside (e.g. user clicked "Ask AI" from a product), insert helpful prompt
  useEffect(() => {
    if (context?.productSku) {
      const sku = context.productSku;
      const name = context.productName || sku;
      const promptMsg: ChatMessage = {
        id: `ctx-${Date.now()}`,
        sender: 'assistant',
        text: `Active context set to **${name}** (\`${sku}\`)${context.retailerId ? ` for retailer \`${context.retailerId}\`` : ''}.\n\nYou can ask about its stock across warehouses, batch expiry dates, freight transit times, or allocation rules.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        context,
        suggestedFollowups: [
          `What is the available inventory for ${name}?`,
          `Which warehouse can supply ${name}?`,
          `Why was ${name} allocated to this retailer?`,
        ],
      };
      setMessages((prev) => [...prev, promptMsg]);
    }
  }, [context?.productSku, context?.retailerId]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || inputValue).trim();
    if (!textToSend || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      context: context || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await FlowGridAPI.chatWithProductAi(
        textToSend,
        context || undefined,
        language
      );

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: response.sources,
        suggestedFollowups: response.suggested_followups,
        isAiGenerated: response.is_ai_generated,
        missingInformation: response.missing_information,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Sorry, I encountered an issue retrieving authoritative records from the backend. Please check connection and retry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all assistant conversation history?')) {
      setMessages([
        {
          id: 'welcome-reset',
          sender: 'assistant',
          text: 'Conversation cleared. How can I help you analyze products, batches, and distribution plans today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedFollowups: [
            'Which products are currently out of stock?',
            'Which products are at risk of expiry?',
            'What is the available inventory for Aashirvaad Atta?',
          ],
        },
      ]);
    }
  };

  const toggleSourceExpand = (id: string) => {
    setExpandedSources((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] bg-[#F8F7F5]">
      {/* Header */}
      <div className="bg-white border-b border-[#E7E5E4] px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB] shadow-sm">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#1E293B] tracking-tight">
                HETVAYA Product AI Assistant
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20">
                Authoritative Grounded
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              Ask questions about products, inventory, batch expiry, and distribution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {context?.productSku && (
            <div className="flex items-center gap-2 bg-[#FFF8E7] border border-[#E9D8C8] px-3 py-1.5 rounded-lg text-xs text-[#8B5E3C] shadow-sm">
              <span className="font-semibold">Context:</span>
              <span>{context.productName || context.productSku}</span>
              {onClearContext && (
                <button
                  onClick={onClearContext}
                  className="hover:text-[#DC2626] transition-colors p-0.5 rounded"
                  title="Remove context filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#DC2626] hover:bg-[#DC2626]/5 border border-[#E7E5E4] transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-4xl ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                msg.sender === 'user'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'bg-white text-[#2563EB] border border-[#E7E5E4] shadow-sm'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={`space-y-2 max-w-[85%] sm:max-w-2xl`}>
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-[#2563EB] text-white rounded-tr-none'
                    : msg.isError
                    ? 'bg-white border border-[#DC2626]/30 text-[#DC2626] rounded-tl-none'
                    : 'bg-white border border-[#E7E5E4] text-[#1E293B] rounded-tl-none'
                }`}
              >
                {/* Message Text with basic markdown rendering */}
                <div className="whitespace-pre-wrap font-sans space-y-2">
                  {msg.text.split('\n\n').map((paragraph, idx) => {
                    // Check for headers
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      return (
                        <div key={idx} className="font-bold text-[#1E293B]">
                          {paragraph.replace(/\*\*/g, '')}
                        </div>
                      );
                    }
                    return (
                      <p key={idx} className="text-sm leading-relaxed">
                        {paragraph.split('**').map((part, i) =>
                          i % 2 === 1 ? (
                            <strong key={i} className={msg.sender === 'user' ? 'text-white font-semibold' : 'text-[#1E293B] font-semibold'}>
                              {part}
                            </strong>
                          ) : (
                            part
                          )
                        )}
                      </p>
                    );
                  })}
                </div>

                {/* Footer metadata */}
                <div
                  className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] ${
                    msg.sender === 'user'
                      ? 'border-blue-400/30 text-blue-100'
                      : 'border-[#E7E5E4] text-[#78716C]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {msg.sender === 'assistant' && (
                      <>
                        <ShieldCheck className="w-3 h-3 text-[#15803D]" />
                        <span>{msg.isAiGenerated ? 'Ollama LLM Reasoning' : 'Authoritative Rules Engine'}</span>
                      </>
                    )}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
              </div>

              {/* Verified Sources Accordion */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="bg-white border border-[#E7E5E4] rounded-xl p-3 shadow-xs space-y-2">
                  <div
                    onClick={() => toggleSourceExpand(msg.id)}
                    className="flex items-center justify-between cursor-pointer text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                  >
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{msg.sources.length} Verified Data Source{msg.sources.length > 1 ? 's' : ''}</span>
                    </div>
                    {expandedSources[msg.id] ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {expandedSources[msg.id] && (
                    <div className="space-y-2 pt-2 border-t border-[#E7E5E4]">
                      {msg.sources.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          className="bg-[#FAF3E0]/50 border border-[#E9D8C8] rounded-lg p-2.5 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-semibold text-[#1E293B]">
                            <span>{src.title}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase bg-white border border-[#E7E5E4] text-[#64748B]">
                              {src.source_type}
                            </span>
                          </div>
                          {src.verified_data && Object.keys(src.verified_data).length > 0 && (
                            <div className="text-[11px] text-[#64748B] grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1">
                              {Object.entries(src.verified_data)
                                .slice(0, 6)
                                .map(([k, v]) => (
                                  <div key={k} className="truncate">
                                    <span className="text-[#78716C] capitalize">{k.replace(/_/g, ' ')}: </span>
                                    <span className="font-mono text-[#1E293B]">
                                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Follow-up question chips */}
              {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {msg.suggestedFollowups.map((followup, fIdx) => (
                    <button
                      key={fIdx}
                      onClick={() => handleSend(followup)}
                      className="text-xs bg-white hover:bg-[#EFF6FF] border border-[#E7E5E4] hover:border-[#2563EB]/40 text-[#1E293B] hover:text-[#2563EB] px-2.5 py-1 rounded-full transition-all flex items-center gap-1 shadow-2xs text-left"
                    >
                      <span>{followup}</span>
                      <ArrowRight className="w-3 h-3 shrink-0 text-[#2563EB]" />
                    </button>
                  ))}
                </div>
              )}

              {/* Retry button for errors */}
              {msg.isError && (
                <button
                  onClick={() => handleSend(messages[messages.length - 2]?.text)}
                  className="flex items-center gap-1 text-xs text-[#DC2626] font-semibold hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry previous query</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-2xl mr-auto">
            <div className="w-8 h-8 rounded-full bg-white border border-[#E7E5E4] flex items-center justify-center text-[#2563EB] shrink-0 shadow-sm animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-[#E7E5E4] p-3.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3 text-xs text-[#64748B]">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-bounce"></span>
              </div>
              <span>HETVAYA AI is consulting inventory records & logistics data...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Shelf (Collapsible quick-access bar) */}
      <div className="bg-white border-t border-[#E7E5E4] px-4 py-2.5 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-[#2563EB]" />
            Suggestions:
          </span>
          {INITIAL_SUGGESTED_PROMPTS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(p.query)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#F8F7F5] hover:bg-[#EFF6FF] border border-[#E7E5E4] hover:border-[#2563EB]/40 rounded-lg text-xs font-medium text-[#1E293B] hover:text-[#2563EB] transition-colors shrink-0 disabled:opacity-50"
              >
                <Icon className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Form Bar */}
      <div className="bg-white border-t border-[#E7E5E4] p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about product stock, expiry risk, warehouse supply, freight cost, or allocations..."
              disabled={isLoading}
              className="w-full pl-4 pr-10 py-3 bg-[#F8F7F5] border border-[#E7E5E4] rounded-xl text-sm text-[#1E293B] placeholder-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all disabled:opacity-60"
            />
          </div>

          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-medium text-sm flex items-center gap-1.5 transition-all shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Send query (Enter)"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[11px] text-[#78716C] mt-2">
          HETVAYA uses verifiable database records and FEFO logic. Never fabricates stock or pricing.
        </p>
      </div>
    </div>
  );
};
