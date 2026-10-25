import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  ShoppingBag,
  PackageCheck,
  Clock,
  PlusCircle,
  CheckCircle2,
  RotateCcw,
  Languages
} from 'lucide-react';
import { Product, Retailer, SyncEvent, InTransitShipment, RejectionReason } from '../types';
import { useTranslation, SupportedLanguage } from '../context/TranslationContext';

interface KiranaRetailerViewProps {
  currentRetailer: Retailer;
  products: Product[];
  inTransitShipments: InTransitShipment[];
  onRecordSale: (sku: string, unitsSold: number) => void;
  onRecordReceipt: (shipmentId: string, acceptedCases: number, rejectedCases: number, reason?: RejectionReason) => void;
  onRecordStockCount: (sku: string, closingUnits: number) => void;
  queuedEvents: SyncEvent[];
  isOnline: boolean;
  onTriggerSync: () => void;
}

export const KiranaRetailerView: React.FC<KiranaRetailerViewProps> = ({
  currentRetailer,
  products,
  inTransitShipments,
  onRecordSale,
  onRecordReceipt,
  onRecordStockCount,
  queuedEvents,
  isOnline,
  onTriggerSync,
}) => {
  const { language: lang, setLanguage, t: translate, formatCurrency, formatNumber } = useTranslation();

  // Sales input state
  const [selectedSaleSku, setSelectedSaleSku] = useState<string>(products[0]?.sku || '');
  const [unitsSoldInput, setUnitsSoldInput] = useState<number>(5);
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string>('');

  // Stock count state
  const [selectedCountSku, setSelectedCountSku] = useState<string>(products[0]?.sku || '');
  const [countInput, setCountInput] = useState<number>(18);
  const [countSuccessMessage, setCountSuccessMessage] = useState<string>('');

  // Receipt inspection state
  const [receiptShipmentId, setReceiptShipmentId] = useState<string | null>(null);
  const [acceptedCasesInput, setAcceptedCasesInput] = useState<number>(0);
  const [rejectedCasesInput, setRejectedCasesInput] = useState<number>(0);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<RejectionReason>('short_shelf_life');

  const retailerShipments = inTransitShipments.filter(
    s => s.retailerId === currentRetailer.id && s.status === 'IN_TRANSIT'
  );

  const translations = {
    en: {
      title: 'Kirana Store Manager POS & Offline Field Capture',
      subtitle: 'Capturing sales, physical counts, and delivery receipts with zero data loss over weak network',
      incomingDeliveries: 'Incoming Distributor Deliveries (In-Transit)',
      recordSale: 'Record Daily Counter Sale (Delta)',
      recordCount: 'Record Closing Stock Count (Absolute)',
      confirmReceipt: 'Inspect & Receive Delivery',
      queueStatus: 'Offline Event Queue (Local Queue)',
      noDeliveries: 'No in-transit shipments currently on route to your store.',
      acceptAll: 'Accept All Cases',
      rejectCases: 'Log Rejected Cases',
    },
    hi: {
      title: 'किराना स्टोर फील्ड पीओएस और ऑफलाइन कैप्चर',
      subtitle: 'कमजोर नेटवर्क में बिना किसी डेटा नुकसान के बिक्री, स्टॉक और रसीद दर्ज करें',
      incomingDeliveries: 'आने वाली डिलीवरी (रास्ते में)',
      recordSale: 'दैनिक बिक्री दर्ज करें',
      recordCount: 'दुकान का अंतिम स्टॉक दर्ज करें',
      confirmReceipt: 'डिलीवरी की जांच और रसीद',
      queueStatus: 'ऑफलाइन इवेंट कतार (सुरक्षित)',
      noDeliveries: 'वर्तमान में आपके स्टोर के लिए कोई डिलीवरी रास्ते में नहीं है।',
      acceptAll: 'सभी केस स्वीकार करें',
      rejectCases: 'अस्वीकार किए गए केस',
    },
    mr: {
      title: 'किराणा दुकान व्यवस्थापक पीओएस आणि ऑफलाइन नोंद',
      subtitle: 'कमकुवत नेटवर्कवर डेटा न गमावता विक्री, शिल्लक स्टॉक आणि डिलिव्हरी नोंदवा',
      incomingDeliveries: 'येणारी डिलिव्हरी (मार्गावर)',
      recordSale: 'दैनिक विक्री नोंदवा',
      recordCount: 'दुकान शिल्लक स्टॉक नोंदवा',
      confirmReceipt: 'डिलिव्हरी तपासा आणि पावती द्या',
      queueStatus: 'ऑफलाइन रांग (स्थानिक साठवणूक)',
      noDeliveries: 'सध्या तुमच्या दुकानासाठी कोणतीही डिलिव्हरी मार्गावर नाही.',
      acceptAll: 'सर्व खोके स्वीकारा',
      rejectCases: 'नाकारलेले खोके नोंदवा',
    },
  };

  const safeLang: SupportedLanguage = (lang === 'hi' || lang === 'mr') ? lang : 'en';
  const t = {
    title: translate('kiranaTitle') || translations[safeLang].title,
    subtitle: translate('kiranaSubtitle') || translations[safeLang].subtitle,
    incomingDeliveries: translate('incomingDeliveries') || translations[safeLang].incomingDeliveries,
    recordSale: translate('recordSale') || translations[safeLang].recordSale,
    recordCount: translate('recordCount') || translations[safeLang].recordCount,
    confirmReceipt: translate('confirmReceipt') || translations[safeLang].confirmReceipt,
    queueStatus: translate('queueStatus') || translations[safeLang].queueStatus,
    noDeliveries: translate('noDeliveries') || translations[safeLang].noDeliveries,
    acceptAll: translate('acceptAll') || translations[safeLang].acceptAll,
    rejectCases: translate('rejectCases') || translations[safeLang].rejectCases,
  };

  const setLang = (l: SupportedLanguage) => {
    setLanguage(l);
  };


  const handleSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRecordSale(selectedSaleSku, unitsSoldInput);
    setSaleSuccessMessage(`Recorded sale of ${unitsSoldInput} units. ${isOnline ? 'Applied to the local demo log.' : 'Queued locally in offline demo mode.'}`);
    setTimeout(() => setSaleSuccessMessage(''), 3500);
  };

  const handleCountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRecordStockCount(selectedCountSku, countInput);
    setCountSuccessMessage(`Recorded physical count of ${countInput} units. ${isOnline ? 'Local demo snapshot updated.' : 'Queued locally in offline demo mode.'}`);
    setTimeout(() => setCountSuccessMessage(''), 3500);
  };

  const handleOpenReceiptModal = (shipment: InTransitShipment) => {
    setReceiptShipmentId(shipment.id);
    setAcceptedCasesInput(shipment.cases);
    setRejectedCasesInput(0);
    setRejectionReasonInput('short_shelf_life');
  };

  const handleConfirmReceipt = () => {
    if (!receiptShipmentId) return;
    onRecordReceipt(
      receiptShipmentId,
      acceptedCasesInput,
      rejectedCasesInput,
      rejectedCasesInput > 0 ? rejectionReasonInput : undefined
    );
    setReceiptShipmentId(null);
  };

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1E293B] tracking-tight">
              {t.title}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]">
              J4 &amp; J5 Ganesh (Kirana)
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Store: <strong className="text-[#1E293B]">{currentRetailer.name}</strong> ({currentRetailer.city}) • Space Cap: {formatNumber(currentRetailer.storageCases ?? 0)} cases • Min Shelf Life: {Math.round(currentRetailer.minShelfLifePct * 100)}%
          </p>
        </div>

        {/* Language Selector (FR-25) */}
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-[#64748B]" />
          <div className="flex rounded-lg bg-[#FAF3E0] border border-[#E7E5E4] p-0.5 text-xs">
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${lang === 'en' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] hover:text-[#1E293B]'}`}
            >
              English
            </button>
            <button
              onClick={() => setLang('hi')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${lang === 'hi' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] hover:text-[#1E293B]'}`}
            >
              हिंदी
            </button>
            <button
              onClick={() => setLang('mr')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${lang === 'mr' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] hover:text-[#1E293B]'}`}
            >
              मराठी
            </button>
          </div>
        </div>
      </div>

      {/* Connectivity Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
        isOnline
          ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
          : 'bg-[#FFF7ED] border-[#FED7AA] text-[#EA580C]'
      }`}>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-[#15803D] shrink-0" />
          ) : (
            <WifiOff className="w-5 h-5 text-[#EA580C] shrink-0" />
          )}
          <div className="text-xs">
            <p className="font-bold">
              {isOnline ? 'Online: Direct Live Sync to FastAPI Backend' : 'Offline Mode: Kirana Connectivity Lost'}
            </p>
            <p className="text-[#64748B] text-[11px] mt-0.5">
              {isOnline
                ? 'This toggle simulates online event handling in the local demo; it does not confirm a server sync.'
                : 'Transactions are queued in this browser demo. Reconnecting processes the local queue only.'}
            </p>
          </div>
        </div>

        {queuedEvents.length > 0 && (
          <button
            onClick={onTriggerSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sync {queuedEvents.length} Queued</span>
          </button>
        )}
      </div>

      {/* Incoming Distributor Deliveries (Receive / Reject) */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-base font-bold text-[#1E293B]">
              {t.incomingDeliveries}
            </h3>
          </div>
          <span className="text-xs text-[#64748B]">
            {retailerShipments.length} deliveries arriving
          </span>
        </div>

        {retailerShipments.length === 0 ? (
          <div className="text-center py-8 text-[#64748B] text-xs bg-[#FFF8E7]/50 rounded-xl border border-[#E7E5E4]">
            {t.noDeliveries}
          </div>
        ) : (
          <div className="space-y-3">
            {retailerShipments.map(shipment => {
              const prod = products.find(p => p.sku === shipment.sku);
              return (
                <div
                  key={shipment.id}
                  className="p-4 rounded-xl bg-[#FFF8E7]/50 border border-[#E7E5E4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1E293B] text-sm">{prod?.name}</span>
                      <span className="font-mono text-xs text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">
                        {shipment.batchNo}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">
                      Shipped: <strong className="text-[#1E293B]">{formatNumber(shipment.cases)} cases</strong> ({formatNumber(shipment.units)} units) • Dispatched at {new Date(shipment.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Primary Action Button: Red */}
                  <button
                    onClick={() => handleOpenReceiptModal(shipment)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] shadow-xs transition-all cursor-pointer"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>{t.confirmReceipt}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Counter Sales & Closing Physical Count */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Delta Form */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#15803D]" />
            <h3 className="text-base font-bold text-[#1E293B]">{t.recordSale}</h3>
          </div>
          <p className="text-xs text-[#64748B]">
            Records incremental kirana counter sales. Deduplicated with idempotent eventId (FR-04).
          </p>

          <form onSubmit={handleSaleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Select Product:</label>
              <select
                value={selectedSaleSku}
                onChange={e => setSelectedSaleSku(e.target.value)}
                className="w-full bg-[#FAF3E0]/50 border border-[#E7E5E4] text-[#1E293B] rounded-lg p-2 text-xs focus:outline-none focus:border-[#2563EB] font-medium cursor-pointer"
              >
                {products.map(p => (
                  <option key={p.sku} value={p.sku}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Units Sold Today:</label>
              <input
                type="number"
                min={1}
                value={unitsSoldInput}
                onChange={e => setUnitsSoldInput(parseInt(e.target.value) || 0)}
                className="w-full bg-[#FAF3E0]/50 border border-[#E7E5E4] text-[#1E293B] font-bold rounded-lg p-2 text-sm focus:outline-none focus:border-[#2563EB] font-mono"
              />
            </div>

            {/* Primary Action Button: Red */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Daily Sale</span>
            </button>

            {saleSuccessMessage && (
              <p className="text-xs text-[#15803D] bg-[#F0FDF4] p-2 rounded border border-[#BBF7D0] animate-in fade-in font-medium">
                {saleSuccessMessage}
              </p>
            )}
          </form>
        </div>

        {/* Physical Stock Count Form */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-base font-bold text-[#1E293B]">{t.recordCount}</h3>
          </div>
          <p className="text-xs text-[#64748B]">
            Absolute physical shelf count. Older counts are automatically superseded (T8, Section 15.4).
          </p>

          <form onSubmit={handleCountSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Select Product:</label>
              <select
                value={selectedCountSku}
                onChange={e => setSelectedCountSku(e.target.value)}
                className="w-full bg-[#FAF3E0]/50 border border-[#E7E5E4] text-[#1E293B] rounded-lg p-2 text-xs focus:outline-none focus:border-[#2563EB] font-medium cursor-pointer"
              >
                {products.map(p => (
                  <option key={p.sku} value={p.sku}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Units on Shelf Right Now:</label>
              <input
                type="number"
                min={0}
                value={countInput}
                onChange={e => setCountInput(parseInt(e.target.value) || 0)}
                className="w-full bg-[#FAF3E0]/50 border border-[#E7E5E4] text-[#1E293B] font-bold rounded-lg p-2 text-sm focus:outline-none focus:border-[#2563EB] font-mono"
              />
            </div>

            {/* Primary Action Button: Red */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Update Physical Count</span>
            </button>

            {countSuccessMessage && (
              <p className="text-xs text-[#15803D] bg-[#F0FDF4] p-2 rounded border border-[#BBF7D0] animate-in fade-in font-medium">
                {countSuccessMessage}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Offline Event Queue Diagnostics */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#2563EB]" />
            <span>{t.queueStatus}</span>
          </h4>
          <span className="text-xs text-[#64748B]">
            {queuedEvents.length} events logged on this kirana device
          </span>
        </div>

        <div className="max-h-48 overflow-y-auto rounded-xl border border-[#E7E5E4] bg-[#FFF8E7]/40 divide-y divide-[#E7E5E4] text-xs font-mono">
          {queuedEvents.length === 0 ? (
            <div className="p-4 text-center text-[#64748B]">
              No offline events queued. Queue is clear and synchronized.
            </div>
          ) : (
            queuedEvents.slice().reverse().map(evt => (
              <div key={evt.eventId} className="p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[#2563EB] font-bold">{evt.type}</span>
                  <span className="text-[#64748B] ml-2">seq#{evt.deviceSeq}</span>
                  <span className="text-[#64748B] ml-2">[{new Date(evt.occurredAt).toLocaleTimeString()}]</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  evt.status === 'APPLIED'
                    ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                    : evt.status === 'QUEUED'
                    ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]'
                    : 'bg-white text-[#64748B] border border-[#E7E5E4]'
                }`}>
                  {evt.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delivery Receipt Modal */}
      {receiptShipmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl p-6 space-y-4 text-[#1E293B]">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
              <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-[#2563EB]" />
                <span>Confirm Delivery Receipt</span>
              </h3>
              <button
                onClick={() => setReceiptShipmentId(null)}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-lg hover:bg-[#FAF3E0] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                  Cases Accepted:
                </label>
                <input
                  type="number"
                  min={0}
                  value={acceptedCasesInput}
                  onChange={e => setAcceptedCasesInput(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#FFF8E7]/50 border border-[#E7E5E4] rounded-lg p-2 text-[#1E293B] font-bold text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                  Cases Rejected:
                </label>
                <input
                  type="number"
                  min={0}
                  value={rejectedCasesInput}
                  onChange={e => setRejectedCasesInput(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#FFF8E7]/50 border border-[#E7E5E4] rounded-lg p-2 text-[#1E293B] font-bold text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {rejectedCasesInput > 0 && (
                <div className="animate-in fade-in">
                  <label className="block text-xs font-semibold text-[#DC2626] mb-1">
                    Rejection Reason (FR-12):
                  </label>
                  <select
                    value={rejectionReasonInput}
                    onChange={e => setRejectionReasonInput(e.target.value as RejectionReason)}
                    className="w-full bg-[#FFF8E7]/50 border border-[#FECACA] rounded-lg p-2 text-[#DC2626] text-xs font-medium focus:outline-none focus:border-[#DC2626] cursor-pointer"
                  >
                    <option value="short_shelf_life">Short Shelf Life (&lt; 70% min)</option>
                    <option value="damaged">Goods Damaged in Transit</option>
                    <option value="no_space">No Space in Kirana Storeroom</option>
                    <option value="wrong_sku">Wrong SKU Delivered</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E5E4]">
              <button
                onClick={() => setReceiptShipmentId(null)}
                className="px-4 py-2 text-xs font-semibold text-[#1E293B] bg-white border border-[#E7E5E4] hover:bg-[#FAF3E0] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReceipt}
                className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Submit Delivery Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

