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
import { sendChatMessage } from './chatApi';
import { ChatMessage, ChatContext, ChatSourceItem } from './types';

export interface ProductAiAssistantProps {
  context?: ChatContext | null;
  onClearContext?: () => void;
  onNavigateTab?: (tab: string) => void;
  language?: 'en' | 'hi' | 'mr';
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
  language = 'en',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: language === 'hi'
        ? 'नमस्ते! मैं आपका HETVAYA प्रोडक्ट इंटेलिजेंस असिस्टेंट हूँ। आप मुझसे उत्पाद, इन्वेंटरी उपलब्धता, FEFO एक्सपायरी जोखिम, वेयरहाउस सोर्सिंग या फ्रेट लागत के बारे में पूछ सकते हैं।'
        : language === 'mr'
        ? 'नमस्कार! मी तुमचा HETVAYA प्रॉडक्ट इंटेलिजन्स असिस्टंट आहे. तुम्ही मला उत्पादने, साठा, FEFO मुदत समाप्ती, वेअरहाऊस सोर्सिंग किंवा वाहतूक खर्चाबद्दल विचारू शकता.'
        : 'Welcome to **HETVAYA Product AI Assistant**. Ask me questions about product inventory, stock availability across warehouses, FEFO batch expiry risks, freight costs, or distribution allocation rationale.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAiGenerated: false,
      suggestedFollowups: [
        'Which products are currently out of stock?',
        'Which products are at risk of expiry?',
        'What is the available inventory for Aashirvaad Atta?',
        'What is the estimated freight cost from Pune to D-Mart?',
      ],
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSourcesModal, setActiveSourcesModal] = useState<ChatSourceItem[] | null>(null);
  const [expandedSourceIndex, setExpandedSourceIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (context && (context.productSku || context.productName)) {
      const contextMessage: ChatMessage = {
        id: `ctx-${Date.now()}`,
        sender: 'assistant',
        text: `Active context attached for **${context.productName || context.productSku}** (SKU: \`${context.productSku}\`). Ask any question about this item's stock, batches, supplying warehouses, or allocation.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        context,
        suggestedFollowups: [
          `What is the available inventory for ${context.productName || context.productSku}?`,
          `Which warehouse can supply this product?`,
          `What is the batch expiry profile for this product?`,
        ],
      };
      setMessages((prev) => [...prev, contextMessage]);
    }
  }, [context]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      context: context || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        query,
        context || undefined,
        language
      );

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: response.sources,
        suggestedFollowups: response.suggested_followups,
        isAiGenerated: response.is_ai_generated,
        missingInformation: response.missing_information,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'An error occurred while querying the product intelligence backend. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: 'Conversation history cleared. How can I assist you with HETVAYA product inventory and distribution today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowups: [
          'Which products are currently out of stock?',
          'Which products are at risk of expiry?',
          'What is the available inventory for Aashirvaad Atta?',
        ],
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] bg-[#FAF3E0] rounded-2xl border border-[#E7E5E4] overflow-hidden shadow-xs">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-[#E7E5E4] flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-[#2563EB]/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#1E293B] tracking-tight">
                HETVAYA Product AI Assistant
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                Ground Truth Active
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              Ask questions about products, inventory, batch expiry, and distribution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {context && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs font-semibold text-[#2563EB]">
              <span>Context: {context.productSku || context.productName}</span>
              {onClearContext && (
                <button
                  type="button"
                  onClick={onClearContext}
                  className="p-0.5 hover:bg-[#DBEAFE] rounded text-[#2563EB] cursor-pointer"
                  title="Clear active context"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#DC2626] bg-white hover:bg-[#FEE2E2] border border-[#E7E5E4] hover:border-[#FCA5A5] rounded-xl transition-all cursor-pointer shadow-xs"
            title="Clear conversation history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                msg.sender === 'user'
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/25'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-[#2563EB] text-white rounded-tr-xs'
                  : msg.isError
                  ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] rounded-tl-xs'
                  : 'bg-white text-[#1E293B] border border-[#E7E5E4] rounded-tl-xs'
              }`}
            >
              <div className="whitespace-pre-line prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5">
                {msg.text}
              </div>

              {/* Verified Sources Attribution Accordion */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-[#E7E5E4]">
                  <button
                    type="button"
                    onClick={() => setActiveSourcesModal(msg.sources || null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] bg-[#EFF6FF] px-2.5 py-1 rounded-lg border border-[#BFDBFE] transition-colors cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{msg.sources.length} Verified Data Sources</span>
                  </button>
                </div>
              )}

              {/* Missing Information Banner */}
              {msg.missingInformation && (
                <div className="mt-2.5 flex items-start gap-1.5 p-2 bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] rounded-lg text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706] mt-0.5" />
                  <span>{msg.missingInformation}</span>
                </div>
              )}

              {/* Dynamic Suggested Follow-ups */}
              {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {msg.suggestedFollowups.map((followup, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(followup)}
                      className="text-xs text-[#2563EB] hover:text-[#1D4ED8] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] px-2 py-0.5 rounded-full transition-colors cursor-pointer text-left"
                    >
                      {followup}
                    </button>
                  ))}
                </div>
              )}

              <div
                className={`text-[10px] mt-1.5 text-right ${
                  msg.sender === 'user' ? 'text-blue-100' : 'text-[#64748B]'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white text-[#64748B] border border-[#E7E5E4] rounded-2xl rounded-tl-xs px-4 py-3 text-xs flex items-center gap-2 shadow-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
              <span>Querying inventory, batches, and distribution network...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Ribbon */}
      <div className="bg-white/90 border-t border-[#E7E5E4] px-4 py-2 shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
            Suggestions:
          </span>
          {INITIAL_SUGGESTED_PROMPTS.map((prompt, idx) => {
            const Icon = prompt.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(prompt.query)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#1E293B] hover:text-[#2563EB] bg-[#FAF3E0] hover:bg-[#EFF6FF] border border-[#E7E5E4] hover:border-[#2563EB] transition-all cursor-pointer whitespace-nowrap shadow-2xs"
              >
                <Icon className="w-3 h-3 text-[#2563EB]" />
                <span>{prompt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Input Bar */}
      <div className="bg-white p-4 border-t border-[#E7E5E4] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about products, stock levels, FEFO expiry risks, warehouse sourcing..."
            disabled={isLoading}
            className="flex-1 bg-[#FAF3E0] border border-[#E7E5E4] focus:border-[#2563EB] focus:bg-white text-sm text-[#1E293B] placeholder-[#64748B] rounded-xl px-4 py-2.5 outline-hidden transition-all shadow-inner"
          />

          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#DC2626]/20 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      {/* Sources Inspector Modal */}
      {activeSourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E7E5E4] max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-base font-extrabold text-[#1E293B]">
                  Verified Application Sources
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveSourcesModal(null);
                  setExpandedSourceIndex(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#64748B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {activeSourcesModal.map((src, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between font-bold text-[#1E293B]">
                    <span>{src.title}</span>
                    <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-white text-[#2563EB] border border-[#BFDBFE]">
                      {src.source_type}
                    </span>
                  </div>
                  {src.product_sku && (
                    <p className="text-[#64748B]">
                      SKU: <strong className="font-mono text-[#2563EB]">{src.product_sku}</strong>
                    </p>
                  )}
                  <pre className="bg-white p-3 rounded-lg border border-[#E7E5E4] text-[11px] overflow-x-auto text-[#1E293B] font-mono">
                    {JSON.stringify(src.verified_data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
