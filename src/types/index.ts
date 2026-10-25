export type ServiceClass = 'A' | 'B' | 'C'; // A = Modern Trade, B = General Trade, C = Store Management / General Trade
export type RetailerType = 'kirana' | 'store_management' | 'modern_trade' | 'distributor';
export type ForecastMethod = 'HistGradientBoosting' | 'MovingAverage' | 'Bootstrap' | 'PeerTransfer';
export type PlanStatus = 'RUNNING' | 'READY' | 'PROVISIONAL' | 'APPROVED' | 'FAILED';
export type SolverStatus = 'OPTIMAL' | 'FEASIBLE' | 'TIMEOUT';
export type LineStatus = 'PROPOSED' | 'APPROVED' | 'STALE' | 'OVERRIDDEN' | 'DISPATCHED' | 'CANCELLED' | 'EXPIRED';
export type InTransitStatus = 'IN_TRANSIT' | 'RECEIVED' | 'PARTIAL' | 'REJECTED';
export type RejectionReason = 'short_shelf_life' | 'damaged' | 'no_space' | 'wrong_sku';
export type UserRole = 'rohit' | 'sunita' | 'ganesh' | 'priya';

export interface Product {
  sku: string;
  name: string;
  category: string;
  unitCost: number; // in Rupees
  unitPrice: number; // in Rupees
  caseSize: number; // units per case
  spacePerCase: number; // standard-case space units (default 1)
  shelfLifeDays: number;
  perishable: boolean;
  image?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  city: string;
  capacityCasesPerCycle: number;
  utilizationCases?: number;
  managerName: string;
}

export interface Retailer {
  id: string;
  name: string;
  type: RetailerType;
  serviceClass: ServiceClass;
  city: string;
  minShelfLifePct: number; // e.g. 0.70 (70%)
  storageCases?: number; // max storage limit in standard cases
  currentStorageUsed?: number;
  paymentScore?: number; // 0.70 to 1.0 (FR-15 credit weighting)
  lastSyncAt: string; // ISO date
  isStale?: boolean; // >24h old
  isCriticalStale?: boolean; // >72h old
}

export interface Route {
  warehouseId: string;
  retailerId: string;
  costPerCaseRupees: number;
  transitDays: number;
}

export interface InventoryBatch {
  id: string;
  warehouseId: string;
  sku: string;
  batchNo: string;
  qtyUnits: number;
  reservedUnits: number;
  expiryDate: string; // YYYY-MM-DD
  version: number;
  asOf: string;
}

export interface DemandForecast {
  retailerId: string;
  sku: string;
  q10: number;
  q50: number; // median
  q80: number;
  q90: number;
  q95: number;
  method: ForecastMethod;
  flags: string[];
  stockoutCorrected: boolean;
  historyDays: number;
  wape: number;
  bias: number;
  lastWeekActual: number;
}

export interface ValueTierDetail {
  tier: string;
  caseRange: string;
  probThisCycle: number;
  probLaterBeforeExpiry: number;
  expectedMarginRupees: number;
  freightAndHoldingRupees: number;
  netValueRupees: number;
  allocated: boolean;
}

export interface ReasonCard {
  summary: string;
  skuName: string;
  retailerName: string;
  sourceWarehouseName: string;
  demandMedian: number;
  demandP95: number;
  effectiveStockBefore: number;
  effectiveStockAfter: number;
  casesAllocated: number;
  unitsAllocated: number;
  shelfLifeOnArrivalPct: number;
  minRequiredShelfLifePct: number;
  shelfLifeDaysRemaining: number;
  latenessDays: number;
  latenessCostRupees: number;
  marginalTiers: ValueTierDetail[];
  cutoffReason: string;
  alternativeWarehouseCompared?: {
    warehouseName: string;
    freightDifferenceRupees: number;
    transitDaysDifference: number;
    latenessCostRupees: number;
    reasonNotChosen: string;
  };
}

export interface AllocationLine {
  id: string;
  planRunId: string;
  warehouseId: string;
  retailerId: string;
  sku: string;
  batchNo: string;
  cases: number;
  units: number;
  freightRupees: number;
  arrivalDate: string;
  shelfLifeOnArrivalPct: number;
  explanation: ReasonCard;
  status: LineStatus;
  override?: {
    originalCases: number;
    newCases: number;
    reason: string;
    overriddenBy: string;
    timestamp: string;
  };
  reservationExpiresAt: string;
}

export interface UnmetDemand {
  retailerId: string;
  sku: string;
  unmetCases: number;
  unmetUnits: number;
  reason: 'no_stock' | 'warehouse_capacity' | 'store_storage_limit' | 'shelf_life' | 'not_worth_freight';
  details: string;
}

export interface ComparisonMetrics {
  currentPractice: {
    stockoutUnits: number;
    fillRatePct: number;
    expiredUnits: number;
    freightRupees: number;
    lostMarginRupees: number;
  };
  strongBaseline: {
    stockoutUnits: number;
    fillRatePct: number;
    expiredUnits: number;
    freightRupees: number;
    lostMarginRupees: number;
  };
  hetvaya: {
    stockoutUnits: number;
    fillRatePct: number;
    expiredUnits: number;
    freightRupees: number;
    lostMarginRupees: number;
  };
}

export interface PlanRun {
  id: string;
  createdAt: string;
  createdBy: string;
  cycleStart: string;
  status: PlanStatus;
  snapshotHash: string;
  solverStatus: SolverStatus;
  solveSeconds?: number;
  totalCases: number;
  totalFreightRupees: number;
  expectedMarginRupees?: number;
  lines: AllocationLine[];
  unmet: UnmetDemand[];
  baselineScores?: ComparisonMetrics;
  staleLocations: string[];
  executiveDispatchBriefing?: string;
  keyFeatureInsights?: Array<Record<string, any>>;
}



export interface SyncEvent {
  eventId: string; // UUID v4
  deviceId: string;
  deviceSeq: number;
  type: 'STOCK_COUNT' | 'SALE' | 'RECEIPT' | 'DISPATCH';
  occurredAt: string;
  payload: any;
  status: 'QUEUED' | 'APPLIED' | 'DUPLICATE' | 'SUPERSEDED' | 'REJECTED';
  reason?: string;
}

export interface InTransitShipment {
  id: string;
  planLineId: string;
  warehouseId: string;
  retailerId: string;
  sku: string;
  batchNo: string;
  cases: number;
  units: number;
  dispatchedAt: string;
  eta: string;
  status: InTransitStatus;
  acceptedCases?: number;
  rejectedCases?: number;
  rejectionReason?: RejectionReason;
}

export interface SystemAlert {
  id: string;
  rule: string;
  openedAt: string;
  type: 'EVENT' | 'TIME_BASED';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details: string;
  active: boolean;
}

export interface ScheduledJob {
  job: string;
  frequency: string;
  lastStartedAt: string;
  lastFinishedAt: string;
  status: 'SUCCESS' | 'RUNNING' | 'FAILED' | 'OVERDUE';
  description: string;
}

export type ThemeMode = 'night' | 'day';

export type AddressClassification =
  | 'NARROW_LANE'       // Dense Old Peths / Narrow Wadas (<2.5m)
  | 'GHAT_TERRAIN'      // Mountain Incline & Hairpin curves
  | 'HIGHWAY_CORRIDOR'  // Industrial Corridor & Dock Unloading
  | 'APMC_MARKET'       // Wholesale Mandi Yard (Early morning window)
  | 'PERI_URBAN'        // Semi-Rural / Landmark navigation
  | 'COMMERCIAL_AVENUE'; // Main market street

export type DeliveryOrderStatus = 'PENDING' | 'ASSIGNED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'FLAGGED';

export interface DeliveryIssue {
  id: string;
  type: 'WIDTH_LIMIT' | 'WINDOW_CONFLICT' | 'DIALECT_GAP' | 'SHELF_LIFE' | 'TERRAIN_RISK';
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY';
  title: string;
  description: string;
  recommendedAction: string;
}

export interface ClientDeliveryOrder {
  id: string;
  retailerId: string;
  clientName: string;
  city: string;
  zone: string;
  detailedAddress: string;
  addressClassification: AddressClassification;
  laneWidthMeters: number;
  unloadingWindow: string;
  localLandmark: string;
  localDialect: string;
  skuSummary: string;
  totalCases: number;
  totalWeightKg: number;
  perishable: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'STANDARD';
  assignedDriverId: string | null;
  nativeMatchScore: number;
  status: DeliveryOrderStatus;
  issues: DeliveryIssue[];
  estimatedDeliveryMinutes: number;
}

export interface NativeDriver {
  id: string;
  name: string;
  phone: string;
  nativeCity: string;
  homeTerritory: string;
  localityFluencyScore: number; // 0-100
  dialect: string;
  vehicleName: string;
  vehicleType: '3_WHEELER' | 'TATA_ACE' | 'BOLERO_PICKUP' | 'EICHER_14FT' | 'EV_CARGO';
  vehicleWidthMeters: number;
  maxPayloadCases: number;
  currentPayloadCases: number;
  currentLocation: string;
  status: 'AVAILABLE' | 'ON_ROUTE' | 'LOADING' | 'RETURNING';
  rating: number;
  completedTrips: number;
  specialties: string[];
  reverseRouteOpportunity?: {
    returnFrom: string;
    returnTo: string;
    availableCapacityCases: number;
    potentialSavingsRupees: number;
  };
}

export type MessagePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM';
export type MessageStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
export type RelatedModule =
  | 'Inventory'
  | 'Forecasting'
  | 'Delivery'
  | 'Warehouse'
  | 'POS Sync'
  | 'Store Management'
  | 'Kirana'
  | 'System Health';

export interface CriticalMessage {
  id: string;
  title: string;
  description: string;
  priority: MessagePriority;
  module: RelatedModule;
  affected_nodes: string[];
  target_roles: string[];
  action_required?: string | null;
  admin_only: boolean;
  timestamp: string;
  status: MessageStatus;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface CriticalMessagesSummary {
  total: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  new_count: number;
  acknowledged_count: number;
  resolved_count: number;
}



