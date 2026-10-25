import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export type Language = 'en' | 'hi' | 'mr';
export type SupportedLanguage = Language;

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🚩' },
];

export interface TranslationDictionary {
  // Navigation
  'nav.plans': string;
  'nav.forecast': string;
  'nav.map': string;
  'nav.benchmark': string;
  'nav.dispatch': string;
  'nav.warehouse': string;
  'nav.retailer': string;
  'nav.import': string;
  'nav.health': string;
  'nav.decisionSuite': string;
  'nav.operations': string;
  'nav.system': string;

  // Header Sub-bar & Context
  'header.horizon': string;
  'header.network': string;
  'header.margin': string;
  'header.solveTime': string;
  'header.online': string;
  'header.offline': string;
  'header.synced': string;
  'header.queued': string;
  'header.processQueue': string;
  'header.dayMode': string;
  'header.nightMode': string;
  'header.demoScript': string;
  'header.whatIf': string;

  // Hero Banner & KPIs
  'hero.tradeBadge': string;
  'hero.weeklyCycle': string;
  'hero.horizonBadge': string;
  'hero.title': string;
  'hero.subtitle': string;
  'hero.quickRun': string;
  'hero.gisMap': string;
  'hero.shelfLifeBadge': string;
  'hero.solveTimeBadge': string;
  'hero.reasonCardsBadge': string;
  'hero.kpiStockouts': string;
  'hero.kpiStockoutsSub': string;
  'hero.kpiWaste': string;
  'hero.kpiWasteSub': string;
  'hero.kpiTextbook': string;
  'hero.kpiTextbookSub': string;
  'hero.earthView': string;
  'hero.cursorSun': string;
  'hero.fixedSun': string;
  'hero.puneHub': string;

  // Actions & Buttons
  'action.approveAll': string;
  'action.replan': string;
  'action.quickRun': string;
  'action.explain': string;
  'action.edit': string;
  'action.approve': string;
  'action.save': string;
  'action.cancel': string;
  'action.export': string;
  'action.filter': string;
  'action.reset': string;
  'action.search': string;
  'action.sync': string;
  'action.dismiss': string;
  'action.close': string;
  'action.viewChalan': string;
  'action.recordSale': string;
  'action.recordCount': string;
  'action.inspectDelivery': string;
  'action.acceptAll': string;
  'action.rejectCases': string;
  'action.simulateTimeout': string;

  // Table Columns & Identifiers
  'table.sku': string;
  'table.product': string;
  'table.warehouse': string;
  'table.destination': string;
  'table.batch': string;
  'table.expiry': string;
  'table.shelfLife': string;
  'table.demand': string;
  'table.allocated': string;
  'table.cases': string;
  'table.units': string;
  'table.reason': string;
  'table.status': string;
  'table.action': string;
  'table.margin': string;
  'table.priority': string;

  // Statuses
  'status.approved': string;
  'status.pending': string;
  'status.overridden': string;
  'status.critical': string;
  'status.warning': string;
  'status.normal': string;
  'status.shortShelfLife': string;
  'status.staleConflict': string;
  'status.active': string;
  'status.fallback': string;
  'status.connected': string;
  'status.online': string;
  'status.offline': string;

  // Plan Generator & Filters
  'plan.filterAllWarehouses': string;
  'plan.filterAllRetailers': string;
  'plan.filterAllProducts': string;
  'plan.filterStatus': string;
  'plan.filterShelfLife': string;
  'plan.showingLines': string;
  'plan.emptyState': string;
  'plan.emptyFilterHint': string;
  'plan.staleBannerTitle': string;
  'plan.staleBannerDesc': string;
  'plan.replanStaleBtn': string;
  'plan.summaryCards': string;
  'plan.totalCases': string;
  'plan.totalMarginProtected': string;
  'plan.avgShelfLife': string;

  // Kirana View
  'kirana.title': string;
  'kirana.subtitle': string;
  'kirana.incomingDeliveries': string;
  'kirana.recordSaleTitle': string;
  'kirana.recordCountTitle': string;
  'kirana.confirmReceiptTitle': string;
  'kirana.queueStatus': string;
  'kirana.noDeliveries': string;
  'kirana.salesCounter': string;
  'kirana.closingStock': string;
  'kirana.spaceCap': string;
  'kirana.minShelfLife': string;

  // Warehouse Ops
  'warehouse.title': string;
  'warehouse.subtitle': string;
  'warehouse.fefoBadge': string;
  'warehouse.pickingList': string;
  'warehouse.dispatchStage': string;
  'warehouse.batchInventory': string;
  'warehouse.stagingBays': string;

  // Forecast View
  'forecast.title': string;
  'forecast.subtitle': string;
  'forecast.p10': string;
  'forecast.p50': string;
  'forecast.p90': string;
  'forecast.quantileConfidence': string;
  'forecast.historicalDemand': string;

  // Benchmark View
  'benchmark.title': string;
  'benchmark.subtitle': string;
  'benchmark.seedSelector': string;
  'benchmark.currentPractice': string;
  'benchmark.strongBaseline': string;
  'benchmark.flowgridEngine': string;
  'benchmark.honestClaim': string;

  // Admin & Health
  'health.title': string;
  'health.subtitle': string;
  'health.fastapi': string;
  'health.ollama': string;
  'health.database': string;
  'health.alerts': string;
  'health.latency': string;
  'health.sla': string;

  // Modals
  'modal.reasonCardTitle': string;
  'modal.reasonCardSubtitle': string;
  'modal.whatIfTitle': string;
  'modal.whatIfSubtitle': string;
  'modal.demoTitle': string;
  'modal.demoSubtitle': string;
  'modal.approveAllTitle': string;
  'modal.approveAllDesc': string;
  'modal.confirmApprove': string;
}

const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  en: {
    // Navigation
    'nav.plans': 'Allocation Plan & AI Engine',
    'nav.forecast': 'Demand Forecasting',
    'nav.map': 'Demand Map Intelligence',
    'nav.benchmark': 'Baseline Impact Benchmark',
    'nav.dispatch': 'Smart Delivery Dispatch',
    'nav.warehouse': 'Warehouse Picking & Ops',
    'nav.retailer': 'Kirana POS & Offline Capture',
    'nav.import': 'Master Data Import Studio',
    'nav.health': 'System Health & Observability',
    'nav.decisionSuite': 'Decision Suite',
    'nav.operations': 'Field Operations',
    'nav.system': 'System & Data',

    // Header Sub-bar & Context
    'header.horizon': '7-day planning horizon • W43',
    'header.network': 'Maharashtra Logistics Grid (Pune Hub, Satara, Kolhapur)',
    'header.margin': 'Avg Kirana Margin: 3–5%',
    'header.solveTime': 'Solve Time',
    'header.online': 'Online Mode',
    'header.offline': 'Offline Mode',
    'header.synced': 'Synced',
    'header.queued': 'queued',
    'header.processQueue': 'Process',
    'header.dayMode': 'Day Mode',
    'header.nightMode': 'Night Mode',
    'header.demoScript': '3-Min Demo Script',
    'header.whatIf': 'What-If Simulator',

    // Hero Banner & KPIs
    'hero.tradeBadge': 'Indian FMCG & Kirana Traditional Trade',
    'hero.weeklyCycle': 'Weekly Cycle W43',
    'hero.horizonBadge': '7-Day Horizon',
    'hero.title': 'AI Marginal-Value Allocation & Demand Intelligence',
    'hero.subtitle': 'Eliminating the kirana replenishment trap for 13M+ stores where 3–5% distributor margins mean one expired case wipes out the profit of 20+ sales. Optimized via greedy marginal-value knapsack allocation with arrival shelf-life gating.',
    'hero.quickRun': 'Quick Run Optimization',
    'hero.gisMap': 'Maharashtra GIS Map',
    'hero.shelfLifeBadge': 'Arrival Shelf-Life Verified (≥70% Min)',
    'hero.solveTimeBadge': 'Solve Time: <1ms p95',
    'hero.reasonCardsBadge': 'Explainable Marginal Reason Cards',
    'hero.kpiStockouts': 'Stockouts Reduced',
    'hero.kpiStockoutsSub': 'vs Current Practice (simulated)',
    'hero.kpiWaste': 'Expiry & Waste Cut',
    'hero.kpiWasteSub': 'Total inventory waste reduction',
    'hero.kpiTextbook': 'vs Textbook Model',
    'hero.kpiTextbookSub': 'Stockout reduction vs textbook baseline',
    'hero.earthView': 'Earth View',
    'hero.cursorSun': 'Cursor Sun',
    'hero.fixedSun': 'Fixed Sun',
    'hero.puneHub': 'Pune Hub',

    // Actions & Buttons
    'action.approveAll': 'Approve All Lines',
    'action.replan': 'Replan Allocation',
    'action.quickRun': 'Quick Run Optimization',
    'action.explain': 'Explain Rationale',
    'action.edit': 'Override Cases',
    'action.approve': 'Approve Line',
    'action.save': 'Save Changes',
    'action.cancel': 'Cancel',
    'action.export': 'Export Manifest (CSV)',
    'action.filter': 'Filter Results',
    'action.reset': 'Reset Filters',
    'action.search': 'Search SKU, Product or Store...',
    'action.sync': 'Sync Queued Events',
    'action.dismiss': 'Dismiss',
    'action.close': 'Close',
    'action.viewChalan': 'Chalan (पावती)',
    'action.recordSale': 'Record Sale',
    'action.recordCount': 'Record Stock Count',
    'action.inspectDelivery': 'Inspect & Receive Delivery',
    'action.acceptAll': 'Accept All Cases',
    'action.rejectCases': 'Log Rejected Cases',
    'action.simulateTimeout': 'Simulate SLA Timeout',

    // Table Columns & Identifiers
    'table.sku': 'SKU Code',
    'table.product': 'Product Name',
    'table.warehouse': 'Source Warehouse',
    'table.destination': 'Destination Kirana',
    'table.batch': 'Batch Number',
    'table.expiry': 'Expiry Date',
    'table.shelfLife': 'Arrival Shelf-Life',
    'table.demand': 'Store Demand',
    'table.allocated': 'Allocated Cases',
    'table.cases': 'Cases',
    'table.units': 'Units',
    'table.reason': 'Decision Logic',
    'table.status': 'Approval Status',
    'table.action': 'Actions',
    'table.margin': 'Unit Margin',
    'table.priority': 'Priority Tier',

    // Statuses
    'status.approved': 'APPROVED',
    'status.pending': 'PENDING REVIEW',
    'status.overridden': 'MANUALLY OVERRIDDEN',
    'status.critical': 'CRITICAL SHORTAGE',
    'status.warning': 'EXPIRY WARNING',
    'status.normal': 'HEALTHY INVENTORY',
    'status.shortShelfLife': 'Short Shelf Life (<70%)',
    'status.staleConflict': 'Stale Batch Conflict',
    'status.active': 'ACTIVE',
    'status.fallback': 'FALLBACK RULE',
    'status.connected': 'CONNECTED',
    'status.online': 'ONLINE',
    'status.offline': 'OFFLINE',

    // Plan Generator & Filters
    'plan.filterAllWarehouses': 'All Warehouses',
    'plan.filterAllRetailers': 'All Retailers',
    'plan.filterAllProducts': 'All Products',
    'plan.filterStatus': 'Filter Status',
    'plan.filterShelfLife': 'Shelf Life Gate',
    'plan.showingLines': 'Showing allocation recommendations',
    'plan.emptyState': 'No allocation lines match your current filter selection.',
    'plan.emptyFilterHint': 'Try clearing active filters or searching for another SKU.',
    'plan.staleBannerTitle': 'Stale Inventory Batch Detected in Queue',
    'plan.staleBannerDesc': 'Another warehouse process consumed physical units from allocated batches. Click below to run instantaneous replan.',
    'plan.replanStaleBtn': 'Instant Replan Stale Lines (<1ms)',
    'plan.summaryCards': 'Allocation Run Summary',
    'plan.totalCases': 'Total Cases Allocated',
    'plan.totalMarginProtected': 'Protected Margin',
    'plan.avgShelfLife': 'Avg Arrival Shelf Life',

    // Kirana View
    'kirana.title': 'Kirana Store Manager POS & Offline Field Capture',
    'kirana.subtitle': 'Capturing sales, physical counts, and delivery receipts with zero data loss over weak network',
    'kirana.incomingDeliveries': 'Incoming Distributor Deliveries (In-Transit)',
    'kirana.recordSaleTitle': 'Record Daily Counter Sale (Delta)',
    'kirana.recordCountTitle': 'Record Closing Stock Count (Absolute)',
    'kirana.confirmReceiptTitle': 'Inspect & Receive Delivery',
    'kirana.queueStatus': 'Offline Event Queue (Local Cache)',
    'kirana.noDeliveries': 'No in-transit shipments currently on route to your store.',
    'kirana.salesCounter': 'Sales Counter',
    'kirana.closingStock': 'Closing Physical Stock',
    'kirana.spaceCap': 'Storage Capacity',
    'kirana.minShelfLife': 'Min Acceptable Shelf Life',

    // Warehouse Ops
    'warehouse.title': 'Warehouse Picking, FEFO Staging & Verification',
    'warehouse.subtitle': 'First-Expiry First-Out (FEFO) picking lists with batch QR code verification and loading bay allocation',
    'warehouse.fefoBadge': 'FEFO Enforced Protocol',
    'warehouse.pickingList': 'Generated Picking Slips',
    'warehouse.dispatchStage': 'Dispatch Staging Bay',
    'warehouse.batchInventory': 'Warehouse Batch Inventory',
    'warehouse.stagingBays': 'Staging Bay Allocation',

    // Forecast View
    'forecast.title': 'Multi-Horizon Quantile Demand Predictions',
    'forecast.subtitle': 'Probabilistic demand forecasting with P10, P50 (median), and P90 confidence bounds across 100 SKUs',
    'forecast.p10': 'P10 Lower Bound (Pessimistic)',
    'forecast.p50': 'P50 Median Forecast (Expected)',
    'forecast.p90': 'P90 Upper Bound (Surge)',
    'forecast.quantileConfidence': 'Quantile Confidence Bounds',
    'forecast.historicalDemand': 'Historical vs Projected Demand',

    // Benchmark View
    'benchmark.title': 'Baseline Impact Benchmark (PRD Section 17)',
    'benchmark.subtitle': 'Scored on identical hidden true demand over 9 weekly cycles across 20 simulated networks (Seeds 0–19). 180 of 180 decision runs successfully completed (p95: <1ms).',
    'benchmark.seedSelector': 'Simulation Seed',
    'benchmark.currentPractice': 'Current Practice (Spreadsheet Rule)',
    'benchmark.strongBaseline': 'Strong Baseline (Safety Stock + FEFO)',
    'benchmark.flowgridEngine': 'FlowGrid Greedy Marginal Knapsack',
    'benchmark.honestClaim': 'Factual Verification & Innovation Grounding',

    // Admin & Health
    'health.title': 'Observability & System Health Telemetry',
    'health.subtitle': 'Real-time decision service latency, SQLite database head, Ollama GenAI connection and alert center',
    'health.fastapi': 'FastAPI Optimization Engine',
    'health.ollama': 'Ollama GenAI Engine',
    'health.database': 'SQLite & Vector Store',
    'health.alerts': 'Active System Alerts',
    'health.latency': 'Engine Latency',
    'health.sla': 'SLA Target (<5000ms)',

    // Modals
    'modal.reasonCardTitle': 'Explainable AI Allocation Rationale',
    'modal.reasonCardSubtitle': 'Causal breakdown of why this specific batch was allocated to this kirana store',
    'modal.whatIfTitle': 'What-If Disruption Scenario Simulator',
    'modal.whatIfSubtitle': 'Simulate sudden demand spikes, highway delivery delays, or expired warehouse stock',
    'modal.demoTitle': '3-Minute Interactive Demo Walkthrough',
    'modal.demoSubtitle': 'Step-by-step executive tour of FlowGrid Indian FMCG distribution intelligence',
    'modal.approveAllTitle': 'Confirm Bulk Plan Approval',
    'modal.approveAllDesc': 'Are you sure you want to approve all allocation lines for this weekly dispatch cycle?',
    'modal.confirmApprove': 'Confirm & Lock Approval',
  },
  hi: {
    // Navigation
    'nav.plans': 'आवंटन योजना एवं एआई इंजन',
    'nav.forecast': 'मांग पूर्वानुमान इंटेलिजेंस',
    'nav.map': 'मांग मानचित्र इंटेलिजेंस',
    'nav.benchmark': 'बेसलाइन प्रभाव बेंचमार्क',
    'nav.dispatch': 'स्मार्ट डिलीवरी एजेंट डिस्पैच',
    'nav.warehouse': 'गोदाम पिकिंग एवं संचालन',
    'nav.retailer': 'किराना पीओएस और ऑफलाइन कैप्चर',
    'nav.import': 'मास्टर डेटा आयात स्टूडियो',
    'nav.health': 'सिस्टम स्वास्थ्य एवं निगरानी',
    'nav.decisionSuite': 'निर्णय सुइट',
    'nav.operations': 'फील्ड संचालन',
    'nav.system': 'सिस्टम एवं डेटा',

    // Header Sub-bar & Context
    'header.horizon': '7-दिवसीय योजना क्षितिज • सप्ताह 43',
    'header.network': 'महाराष्ट्र लॉजिस्टिक्स ग्रिड (पुणे हब, सातारा, कोल्हापुर)',
    'header.margin': 'औसत किराना मार्जिन: 3–5%',
    'header.solveTime': 'हल करने का समय',
    'header.online': 'ऑनलाइन मोड',
    'header.offline': 'ऑफलाइन मोड',
    'header.synced': 'सिंक हुआ',
    'header.queued': 'कतार में',
    'header.processQueue': 'प्रोसेस करें',
    'header.dayMode': 'डे मोड',
    'header.nightMode': 'नाईट मोड',
    'header.demoScript': '3-मिनट डेमो स्क्रिप्ट',
    'header.whatIf': 'व्हाट-इफ सिम्युलेटर',

    // Hero Banner & KPIs
    'hero.tradeBadge': 'भारतीय एफएमसीजी एवं किराना पारंपरिक व्यापार',
    'hero.weeklyCycle': 'साप्ताहिक चक्र W43',
    'hero.horizonBadge': '7-दिवसीय क्षितिज',
    'hero.title': 'एआई सीमांत-मूल्य आवंटन एवं मांग बुद्धिमत्ता',
    'hero.subtitle': '1.3 करोड़ से अधिक किराना दुकानों के लिए पुनःपूर्ति जाल को समाप्त करना, जहां 3-5% वितरक मार्जिन में एक समाप्त केस 20+ बिक्री के लाभ को समाप्त कर देता है। शेल्फ-लाइफ गेटिंग के साथ सीमांत-मूल्य नैपसैक आवंटन द्वारा अनुकूलित।',
    'hero.quickRun': 'तुरंत आवंटन चलाएं',
    'hero.gisMap': 'महाराष्ट्र जीआईएस मैप',
    'hero.shelfLifeBadge': 'पहुंचने पर शेल्फ-लाइफ सत्यापित (≥70% न्यूनतम)',
    'hero.solveTimeBadge': 'हल करने का समय: <1ms p95',
    'hero.reasonCardsBadge': 'व्याख्यात्मक सीमांत कारण कार्ड',
    'hero.kpiStockouts': 'स्टॉक समाप्ति में कमी',
    'hero.kpiStockoutsSub': 'वर्तमान कार्यप्रणाली की तुलना में',
    'hero.kpiWaste': 'कालबाह्य व कचरा बचत',
    'hero.kpiWasteSub': 'कुल इन्वेंटरी कचरे में भारी कटौती',
    'hero.kpiTextbook': 'टेक्स्टबुक मॉडल की तुलना में',
    'hero.kpiTextbookSub': 'स्टॉकआउट समाप्ति दर',
    'hero.earthView': 'पृथ्वी दृश्य',
    'hero.cursorSun': 'कर्सर सूर्य',
    'hero.fixedSun': 'स्थिर सूर्य',
    'hero.puneHub': 'पुणे हब',

    // Actions & Buttons
    'action.approveAll': 'सभी लाइनें स्वीकृत करें',
    'action.replan': 'पुनः योजना बनाएं',
    'action.quickRun': 'तुरंत आवंटन अनुकूलन',
    'action.explain': 'कारण देखें',
    'action.edit': 'केस बदलें',
    'action.approve': 'स्वीकृत करें',
    'action.save': 'सहेजें',
    'action.cancel': 'रद्द करें',
    'action.export': 'मैनिफ़ेस्ट निर्यात करें (CSV)',
    'action.filter': 'फ़िल्टर लागू करें',
    'action.reset': 'फ़िल्टर हटाएं',
    'action.search': 'एसकेयू, उत्पाद या दुकान खोजें...',
    'action.sync': 'कतार सिंक करें',
    'action.dismiss': 'खारिज करें',
    'action.close': 'बंद करें',
    'action.viewChalan': 'चालान (पावती)',
    'action.recordSale': 'बिक्री दर्ज करें',
    'action.recordCount': 'स्टॉक दर्ज करें',
    'action.inspectDelivery': 'डिलीवरी जांचें और स्वीकारें',
    'action.acceptAll': 'सभी केस स्वीकार करें',
    'action.rejectCases': 'अस्वीकृत केस दर्ज करें',
    'action.simulateTimeout': 'एसएलए टाइमआउट सिमुलेट करें',

    // Table Columns & Identifiers
    'table.sku': 'एसकेयू कोड',
    'table.product': 'उत्पाद का नाम',
    'table.warehouse': 'स्रोत गोदाम',
    'table.destination': 'गंतव्य किराना',
    'table.batch': 'बैच संख्या',
    'table.expiry': 'समाप्ति तिथि',
    'table.shelfLife': 'शेल्फ-लाइफ शेष',
    'table.demand': 'स्टोर मांग',
    'table.allocated': 'आवंटित केस',
    'table.cases': 'केस',
    'table.units': 'इकाइयां',
    'table.reason': 'निर्णय तर्क',
    'table.status': 'स्वीकृति स्थिति',
    'table.action': 'कार्रवाई',
    'table.margin': 'इकाई मार्जिन',
    'table.priority': 'प्राथमिकता स्तर',

    // Statuses
    'status.approved': 'स्वीकृत',
    'status.pending': 'समीक्षा लंबित',
    'status.overridden': 'मैन्युअल रूप से बदला गया',
    'status.critical': 'गंभीर कमी',
    'status.warning': 'समाप्ति चेतावनी',
    'status.normal': 'स्वस्थ इन्वेंट्री',
    'status.shortShelfLife': 'कम शेल्फ-लाइफ (<70%)',
    'status.staleConflict': 'अमान्य बैच टकराव',
    'status.active': 'सक्रिय',
    'status.fallback': 'फॉलबैक नियम',
    'status.connected': 'कनेक्टेड',
    'status.online': 'ऑनलाइन',
    'status.offline': 'ऑफलाइन',

    // Plan Generator & Filters
    'plan.filterAllWarehouses': 'सभी गोदाम',
    'plan.filterAllRetailers': 'सभी किराना स्टोर',
    'plan.filterAllProducts': 'सभी उत्पाद',
    'plan.filterStatus': 'स्थिति फ़िल्टर',
    'plan.filterShelfLife': 'शेल्फ लाइफ द्वार',
    'plan.showingLines': 'आवंटन सिफारिशें दिखाई जा रही हैं',
    'plan.emptyState': 'आपके वर्तमान फ़िल्टर से कोई आवंटन लाइन मेल नहीं खाती।',
    'plan.emptyFilterHint': 'फ़िल्टर हटाकर पुनः प्रयास करें या अन्य एसकेयू खोजें।',
    'plan.staleBannerTitle': 'कतार में अमान्य इन्वेंट्री बैच का पता चला',
    'plan.staleBannerDesc': 'अन्य गोदाम संचालन द्वारा आवंटित बैच से इकाइयां उपयोग कर ली गई हैं। तत्काल पुनः योजना के लिए नीचे क्लिक करें।',
    'plan.replanStaleBtn': 'तुरंत पुनः योजना बनाएं (<1ms)',
    'plan.summaryCards': 'आवंटन परिणाम सारांश',
    'plan.totalCases': 'कुल आवंटित केस',
    'plan.totalMarginProtected': 'संरक्षित कुल मार्जिन',
    'plan.avgShelfLife': 'औसत आगमन शेल्फ लाइफ',

    // Kirana View
    'kirana.title': 'किराना स्टोर फील्ड पीओएस और ऑफलाइन कैप्चर',
    'kirana.subtitle': 'कमजोर नेटवर्क में बिना किसी डेटा नुकसान के बिक्री, स्टॉक और रसीद दर्ज करें',
    'kirana.incomingDeliveries': 'आने वाली डिलीवरी (रास्ते में)',
    'kirana.recordSaleTitle': 'दैनिक बिक्री दर्ज करें',
    'kirana.recordCountTitle': 'दुकान का अंतिम स्टॉक दर्ज करें',
    'kirana.confirmReceiptTitle': 'डिलीवरी की जांच और रसीद',
    'kirana.queueStatus': 'ऑफलाइन इवेंट कतार (सुरक्षित)',
    'kirana.noDeliveries': 'वर्तमान में आपके स्टोर के लिए कोई डिलीवरी रास्ते में नहीं है।',
    'kirana.salesCounter': 'बिक्री काउंटर',
    'kirana.closingStock': 'अंतिम भौतिक स्टॉक',
    'kirana.spaceCap': 'भंडारण क्षमता',
    'kirana.minShelfLife': 'न्यूनतम स्वीकार्य शेल्फ लाइफ',

    // Warehouse Ops
    'warehouse.title': 'गोदाम पिकिंग, फेफो स्टेजिंग एवं सत्यापन',
    'warehouse.subtitle': 'बैच क्यूआर कोड सत्यापन और लोडिंग बे आवंटन के साथ फर्स्ट-एक्सपायरी फर्स्ट-आउट (FEFO) पिकिंग सूची',
    'warehouse.fefoBadge': 'फेफो नियम लागू',
    'warehouse.pickingList': 'उत्पन्न पिकिंग पर्ची',
    'warehouse.dispatchStage': 'डिस्पैच स्टेजिंग बे',
    'warehouse.batchInventory': 'गोदाम बैच इन्वेंट्री',
    'warehouse.stagingBays': 'स्टेजिंग बे आवंटन',

    // Forecast View
    'forecast.title': 'मल्टी-हॉरिजॉन क्वांटाइल मांग पूर्वानुमान',
    'forecast.subtitle': '100 एसकेयू में P10, P50 (मध्यिका), और P90 विश्वास सीमाओं के साथ मांग पूर्वानुमान',
    'forecast.p10': 'P10 निचली सीमा (निराशावादी)',
    'forecast.p50': 'P50 मध्यिका पूर्वानुमान (अपेक्षित)',
    'forecast.p90': 'P90 ऊपरी सीमा (उच्च मांग)',
    'forecast.quantileConfidence': 'क्वांटाइल विश्वास सीमाएं',
    'forecast.historicalDemand': 'ऐतिहासिक बनाम अनुमानित मांग',

    // Benchmark View
    'benchmark.title': 'बेसलाइन प्रभाव बेंचमार्क (पीआरडी धारा 17)',
    'benchmark.subtitle': '20 सिमुलेटेड नेटवर्क में 9 चक्रों में समान छिपी हुई मांग पर परीक्षण। 180 में से 180 निर्णय पूर्ण (p95: <1ms)।',
    'benchmark.seedSelector': 'सिमुलेशन बीज',
    'benchmark.currentPractice': 'वर्तमान कार्यप्रणाली (स्प्रेडशीट नियम)',
    'benchmark.strongBaseline': 'मजबूत बेसलाइन (सेफ्टी स्टॉक + फेफो)',
    'benchmark.flowgridEngine': 'फ्लोग्रिड ग्रीडी मार्जिनल नैपसैक',
    'benchmark.honestClaim': 'तथ्यात्मक सत्यापन एवं नवाचार प्रमाण',

    // Admin & Health
    'health.title': 'अवलोकन एवं सिस्टम स्वास्थ्य टेलीमेट्री',
    'health.subtitle': 'वास्तविक समय निर्णय विलंबता, एसक्यूलाइट डेटाबेस, ओलामा जेन-एआई और अलर्ट केंद्र',
    'health.fastapi': 'फास्टएपीआई अनुकूलन इंजन',
    'health.ollama': 'ओलामा जेन-एआई इंजन',
    'health.database': 'एसक्यूलाइट एवं वेक्टर स्टोर',
    'health.alerts': 'सक्रिय सिस्टम अलर्ट',
    'health.latency': 'इंजन विलंबता',
    'health.sla': 'एसएलए लक्ष्य (<5000ms)',

    // Modals
    'modal.reasonCardTitle': 'व्याख्यात्मक एआई आवंटन तर्क',
    'modal.reasonCardSubtitle': 'इस विशिष्ट बैच को इस किराना स्टोर में क्यों आवंटित किया गया इसका कारण',
    'modal.whatIfTitle': 'व्हाट-इफ व्यवधान परिदृश्य सिम्युलेटर',
    'modal.whatIfSubtitle': 'अचानक मांग में उछाल, राजमार्ग डिलीवरी में देरी, या समाप्त स्टॉक का अनुकरण करें',
    'modal.demoTitle': '3-मिनट इंटरएक्टिव डेमो वॉकथ्रू',
    'modal.demoSubtitle': 'फ्लोग्रिड भारतीय एफएमसीजी वितरण बुद्धिमत्ता का संपूर्ण दौरा',
    'modal.approveAllTitle': 'थोक योजना स्वीकृति की पुष्टि करें',
    'modal.approveAllDesc': 'क्या आप इस साप्ताहिक चक्र के लिए सभी आवंटन लाइनों को स्वीकृत करना चाहते हैं?',
    'modal.confirmApprove': 'स्वीकृति की पुष्टि करें और लॉक करें',
  },
  mr: {
    // Navigation
    'nav.plans': 'वाटप योजना आणि एआय इंजिन',
    'nav.forecast': 'मागणी अंदाज बुद्धिमत्ता',
    'nav.map': 'मागणी नकाशा बुद्धिमत्ता',
    'nav.benchmark': 'बेसलाइन प्रभाव बेंचमार्क',
    'nav.dispatch': 'स्मार्ट डिलिव्हरी एजंट डिस्पॅच',
    'nav.warehouse': 'गोदाम पिकिंग आणि ऑपरेशन्स',
    'nav.retailer': 'किराणा पीओएस आणि ऑफलाइन नोंदणी',
    'nav.import': 'मास्टर डेटा आयात स्टुडिओ',
    'nav.health': 'सिस्टम आरोग्य आणि निरीक्षण',
    'nav.decisionSuite': 'निर्णय संच',
    'nav.operations': 'फील्ड ऑपरेशन्स',
    'nav.system': 'सिस्टम आणि डेटा',

    // Header Sub-bar & Context
    'header.horizon': '७-दिवसीय नियोजन क्षितिज • आठवडा ४३',
    'header.network': 'महाराष्ट्र लॉजिस्टिक्स ग्रिड (पुणे हब, सातारा, कोल्हापूर)',
    'header.margin': 'सरासरी किराणा नफा: ३–५%',
    'header.solveTime': 'निर्णय वेळ',
    'header.online': 'ऑनलाइन मोड',
    'header.offline': 'ऑफलाइन मोड',
    'header.synced': 'सिंक झाले',
    'header.queued': 'रांगेत',
    'header.processQueue': 'प्रक्रिया करा',
    'header.dayMode': 'दिवस मोड',
    'header.nightMode': 'रात्र मोड',
    'header.demoScript': '३-मिनिट डेमो स्क्रिप्ट',
    'header.whatIf': 'व्हॉट-इफ सिम्युलेटर',

    // Hero Banner & KPIs
    'hero.tradeBadge': 'भारतीय एफएमसीजी आणि किराणा पारंपरिक व्यापार',
    'hero.weeklyCycle': 'साप्ताहिक चक्र W43',
    'hero.horizonBadge': '७-दिवसीय क्षितिज',
    'hero.title': 'एआय सीमांत-मूल्य वाटप आणि मागणी बुद्धिमत्ता',
    'hero.subtitle': '१.३ कोटींहून अधिक किराणा दुकानांसाठी पुनर्भरण सापळा संपवणे, जेथे ३-५% वितरक नफ्यात एक मुदत संपलेला बॉक्स २०+ विक्रीचा नफा पुसून टाकतो. आगमन शेल्फ-लाइफ गेटिंगसह सीमांत-मूल्य नॅपसॅक वाटपाद्वारे अनुकूलित.',
    'hero.quickRun': 'त्वरित वाटप चालवा',
    'hero.gisMap': 'महाराष्ट्र जीआयएस नकाशा',
    'hero.shelfLifeBadge': 'आगमनावर शेल्फ-लाइफ प्रमाणित (≥७०% किमान)',
    'hero.solveTimeBadge': 'निर्णय वेळ: <१ms p95',
    'hero.reasonCardsBadge': 'स्पष्टीकरणात्मक सीमांत कारण कार्डे',
    'hero.kpiStockouts': 'स्टॉक संपण्यात घट',
    'hero.kpiStockoutsSub': 'सध्याच्या पद्धतीशी तुलना',
    'hero.kpiWaste': 'मुदत संपणे व कचरा कपात',
    'hero.kpiWasteSub': 'एकूण इन्व्हेंटरी कचरा कपात',
    'hero.kpiTextbook': 'पाठ्यपुस्तक मॉडेलशी तुलना',
    'hero.kpiTextbookSub': 'स्टॉक संपणे निर्मूलन',
    'hero.earthView': 'पृथ्वी दृश्य',
    'hero.cursorSun': 'कर्सर सूर्य',
    'hero.fixedSun': 'स्थिर सूर्य',
    'hero.puneHub': 'पुणे हब',

    // Actions & Buttons
    'action.approveAll': 'सर्व ओळी मंजूर करा',
    'action.replan': 'पुन्हा नियोजन करा',
    'action.quickRun': 'त्वरित अनुकूलन चालवा',
    'action.explain': 'कारण तपासा',
    'action.edit': 'खोके बदला',
    'action.approve': 'मंजूर करा',
    'action.save': 'जतन करा',
    'action.cancel': 'रद्द करा',
    'action.export': 'मॅनिफेस्ट निर्यात करा (CSV)',
    'action.filter': 'फिल्टर लावा',
    'action.reset': 'फिल्टर काढा',
    'action.search': 'एसकेयू, उत्पादन किंवा दुकान शोधा...',
    'action.sync': 'रांग सिंक करा',
    'action.dismiss': 'काढून टाका',
    'action.close': 'बंद करा',
    'action.viewChalan': 'चलन (पावती)',
    'action.recordSale': 'विक्री नोंदवा',
    'action.recordCount': 'स्टॉक नोंदवा',
    'action.inspectDelivery': 'डिलिव्हरी तपासा आणि स्वीकारा',
    'action.acceptAll': 'सर्व खोके स्वीकारा',
    'action.rejectCases': 'नाकारलेले खोके नोंदवा',
    'action.simulateTimeout': 'एसएलए टाइमआउट सिमुलेट करा',

    // Table Columns & Identifiers
    'table.sku': 'एसकेयू कोड',
    'table.product': 'उत्पादनाचे नाव',
    'table.warehouse': 'मूळ गोदाम',
    'table.destination': 'किराणा दुकान',
    'table.batch': 'बॅच क्रमांक',
    'table.expiry': 'मुदत संपण्याची तारीख',
    'table.shelfLife': 'शेल्फ-लाइफ शिल्लक',
    'table.demand': 'दुकान मागणी',
    'table.allocated': 'वाटप केलेले खोके',
    'table.cases': 'खोके',
    'table.units': 'नग',
    'table.reason': 'निर्णय तर्क',
    'table.status': 'मंजुरी स्थिती',
    'table.action': 'कृती',
    'table.margin': 'नफा दर',
    'table.priority': 'प्राधान्य स्तर',

    // Statuses
    'status.approved': 'मंजूर',
    'status.pending': 'तपासणी प्रलंबित',
    'status.overridden': 'मॅन्युअली बदललेले',
    'status.critical': 'गंभीर तुटवडा',
    'status.warning': 'मुदत संपण्याची सूचना',
    'status.normal': 'संतुलित साठा',
    'status.shortShelfLife': 'कमी शेल्फ-लाइफ (<७०%)',
    'status.staleConflict': 'जुनी बॅच विसंगती',
    'status.active': 'सक्रिय',
    'status.fallback': 'फॉलबॅक नियम',
    'status.connected': 'जोडलेले',
    'status.online': 'ऑनलाइन',
    'status.offline': 'ऑफलाइन',

    // Plan Generator & Filters
    'plan.filterAllWarehouses': 'सर्व गोदामे',
    'plan.filterAllRetailers': 'सर्व किराणा दुकाने',
    'plan.filterAllProducts': 'सर्व उत्पादने',
    'plan.filterStatus': 'स्थितीनुसार फिल्टर',
    'plan.filterShelfLife': 'शेल्फ लाइफ द्वार',
    'plan.showingLines': 'वाटप शिफारसी दर्शवत आहे',
    'plan.emptyState': 'आपल्या निवडलेल्या फिल्टरशी कोणतीही ओळ जुळत नाही.',
    'plan.emptyFilterHint': 'फिल्टर काढून पुन्हा प्रयत्न करा किंवा अन्य एसकेयू शोधा.',
    'plan.staleBannerTitle': 'रांगेत जुनी इन्व्हेंटरी बॅच आढळली',
    'plan.staleBannerDesc': 'दुसऱ्या प्रक्रियेने या बॅचमधील प्रत्यक्ष नग वापरले आहेत. त्वरित पुनर्वाटपासाठी खाली क्लिक करा.',
    'plan.replanStaleBtn': 'त्वरित पुनर्वाटप करा (<१ms)',
    'plan.summaryCards': 'वाटप निष्कर्ष सारांश',
    'plan.totalCases': 'एकूण वाटप केलेले खोके',
    'plan.totalMarginProtected': 'संरक्षित नफा',
    'plan.avgShelfLife': 'सरासरी शेल्फ लाइफ',

    // Kirana View
    'kirana.title': 'किराणा दुकान व्यवस्थापक पीओएस आणि ऑफलाइन नोंद',
    'kirana.subtitle': 'कमकुवत नेटवर्कवर डेटा न गमावता विक्री, शिल्लक स्टॉक आणि डिलिव्हरी नोंदवा',
    'kirana.incomingDeliveries': 'येणारी डिलिव्हरी (मार्गावर)',
    'kirana.recordSaleTitle': 'दैनिक विक्री नोंदवा',
    'kirana.recordCountTitle': 'दुकान शिल्लक स्टॉक नोंदवा',
    'kirana.confirmReceiptTitle': 'डिलिव्हरी तपासा आणि पावती द्या',
    'kirana.queueStatus': 'ऑफलाइन रांग (स्थानिक साठवणूक)',
    'kirana.noDeliveries': 'सध्या तुमच्या दुकानासाठी कोणतीही डिलिव्हरी मार्गावर नाही.',
    'kirana.salesCounter': 'विक्री काउंटर',
    'kirana.closingStock': 'शिल्लक प्रत्यक्ष साठा',
    'kirana.spaceCap': 'साठवण क्षमता',
    'kirana.minShelfLife': 'किमान स्वीकार्य शेल्फ लाइफ',

    // Warehouse Ops
    'warehouse.title': 'गोदाम पिकिंग, फेफो स्टेजिंग आणि पडताळणी',
    'warehouse.subtitle': 'बॅच क्यूआर कोड पडताळणी आणि लोडिंग बे वाटपासह फर्स्ट-एक्सपायरी फर्स्ट-आउट (FEFO) पिकिंग यादी',
    'warehouse.fefoBadge': 'फेफो नियम लागू',
    'warehouse.pickingList': 'तयार केलेल्या पिकिंग पावत्या',
    'warehouse.dispatchStage': 'डिस्पॅच स्टेजिंग बे',
    'warehouse.batchInventory': 'गोदाम बॅच साठा',
    'warehouse.stagingBays': 'स्टेजिंग बे वाटप',

    // Forecast View
    'forecast.title': 'मल्टी-हॉरिझॉन क्वांटाइल मागणी अंदाज',
    'forecast.subtitle': '१०० एसकेयूमध्ये P10, P50 (मध्यक), आणि P90 आत्मविश्वास मर्यादांसह संभाव्यता मागणी अंदाज',
    'forecast.p10': 'P10 किमान मर्यादा (कमी मागणी)',
    'forecast.p50': 'P50 मध्यक अंदाज (अपेक्षित)',
    'forecast.p90': 'P90 कमाल मर्यादा (उच्च मागणी)',
    'forecast.quantileConfidence': 'क्वांटाइल आत्मविश्वास मर्यादा',
    'forecast.historicalDemand': 'मागील विरूद्ध अंदाजित मागणी',

    // Benchmark View
    'benchmark.title': 'बेसलाइन प्रभाव बेंचमार्क (पीआरडी कलम १७)',
    'benchmark.subtitle': '२० नेटवर्कमध्ये ९ साप्ताहिक चक्रांवर लपलेल्या प्रत्यक्ष मागणीवर मोजणी. १८० पैकी १८० निर्णय यशस्वी (p95: <१ms).',
    'benchmark.seedSelector': 'सिम्युलेशन बीज',
    'benchmark.currentPractice': 'सध्याची पद्धत (स्प्रेडशीट नियम)',
    'benchmark.strongBaseline': 'मजबूत बेसलाइन (सेफ्टी स्टॉक + फेफो)',
    'benchmark.flowgridEngine': 'फ्लोग्रिड ग्रीडी मार्जिनल नॅपसॅक',
    'benchmark.honestClaim': 'तथ्य पडताळणी आणि नाविन्यता प्रमाण',

    // Admin & Health
    'health.title': 'निरीक्षण आणि सिस्टम आरोग्य टेलिमेट्री',
    'health.subtitle': 'रिअल-टाइम निर्णय विलंब, एसक्यूलाइट डेटाबेस, ओलामा जेन-एआय आणि सूचना केंद्र',
    'health.fastapi': 'फास्टएपीआय ऑप्टिमायझेशन इंजिन',
    'health.ollama': 'ओलामा जेन-एआय इंजिन',
    'health.database': 'एसक्यूलाइट आणि व्हेक्टर स्टोअर',
    'health.alerts': 'सक्रिय सिस्टम सूचना',
    'health.latency': 'इंजिन विलंब',
    'health.sla': 'एसएलए लक्ष्य (<५०००ms)',

    // Modals
    'modal.reasonCardTitle': 'स्पष्टीकरणात्मक एआय वाटप कारण',
    'modal.reasonCardSubtitle': 'हा विशिष्ट बॅच या किराणा दुकानाला का दिला गेला याचे कारण',
    'modal.whatIfTitle': 'व्हॉट-इफ व्यत्यय परिस्थिती सिम्युलेटर',
    'modal.whatIfSubtitle': 'अचानक मागणी वाढ, महामार्ग विलंब किंवा मुदत संपलेला माल अनुकरण करा',
    'modal.demoTitle': '३-मिनिट परस्परसंवादी डेमो वॉकथ्रू',
    'modal.demoSubtitle': 'फ्लोग्रिड भारतीय एफएमसीजी वितरण बुद्धिमत्तेची संपूर्ण सफर',
    'modal.approveAllTitle': 'एकत्रित वाटप मंजुरी पुष्टी',
    'modal.approveAllDesc': 'आपण या साप्ताहिक चक्रासाठी सर्व वाटप ओळी मंजूर करू इच्छिता?',
    'modal.confirmApprove': 'मंजुरी निश्चित करा आणि लॉक करा',
  },
};

export interface TranslationContextType {
  lang: Language;
  language: Language;
  setLang: (lang: Language) => void;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationDictionary | string, fallback?: string) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
  formatDate: (date: string | Date) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('flowgrid_language');
      if (saved === 'hi' || saved === 'mr' || saved === 'en') {
        return saved;
      }
    } catch {
      // localStorage may be disabled
    }
    return 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('flowgrid_language', newLang);
    } catch {
      // ignore
    }
  };

  const t = (key: keyof TranslationDictionary | string, fallback?: string): string => {
    const dict = TRANSLATIONS[lang] as unknown as Record<string, string>;
    if (dict && dict[key]) {
      return dict[key];
    }
    // Fallback to English
    const enDict = TRANSLATIONS.en as unknown as Record<string, string>;
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    return fallback !== undefined ? fallback : key;
  };

  // Indian Rupee formatting (e.g., ₹1,23,456)
  const formatCurrency = (amount: number): string => {
    try {
      const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
  };

  const formatNumber = (num: number): string => {
    try {
      const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
      return new Intl.NumberFormat(locale).format(num);
    } catch {
      return num.toLocaleString('en-IN');
    }
  };

  const formatDate = (date: string | Date): string => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
      return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(date);
    }
  };

  const value = useMemo(
    () => ({
      lang,
      language: lang,
      setLang,
      setLanguage: setLang,
      t,
      formatCurrency,
      formatNumber,
      formatDate,
    }),
    [lang]
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
