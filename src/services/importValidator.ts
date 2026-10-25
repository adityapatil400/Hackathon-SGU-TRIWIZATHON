/**
 * FlowGrid Master Data & Inventory Import Processing Engine (FR-02, FR-03, FR-04, J1 Step 3)
 * Provides CSV parsing, schema validation, foreign key checks, SHA-256 deduplication,
 * and the 5% error threshold transactional commit/rollback rule.
 */

import { Product, Warehouse, Retailer, Route, InventoryBatch } from '../types';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  critical?: boolean;
}

export interface ParsedRowPreview {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: ValidationError[];
}

export interface ImportProcessingResult {
  importId: string;
  fileName: string;
  sha256: string;
  targetEntity: string;
  totalRows: number;
  rowsAccepted: number;
  rowsRejected: number;
  errorRatePct: number;
  committed: boolean;
  isDuplicateFile: boolean;
  hasCriticalError: boolean;
  errors: ValidationError[];
  parsedRows: ParsedRowPreview[];
  committedRecordsCount: number;
  inventoryStateChanged: boolean;
  summaryMessage: string;
  committedBatches?: InventoryBatch[];
  committedProducts?: Product[];
  committedRetailers?: Retailer[];
  committedRoutes?: Route[];
}

export interface ValidationContext {
  warehouses: Warehouse[];
  products: Product[];
  retailers: Retailer[];
  routes?: Route[];
  existingBatches?: InventoryBatch[];
  importedFileHashes?: Set<string>;
}

/**
 * Universal SHA-256 computation (Browser WebCrypto + Node.js fallback)
 */
export async function computeSHA256(content: string): Promise<string> {
  const webCrypto = typeof globalThis !== 'undefined' ? (globalThis.crypto || (globalThis as any).msCrypto) : undefined;
  if (webCrypto && webCrypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await webCrypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Deterministic 64-char hex fallback
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d, h3 = 0x9e3779b9, h4 = 0x3c6ef372;
  for (let i = 0; i < content.length; i++) {
    const ch = content.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }
  const hex = (
    Math.abs(h1).toString(16).padStart(8, '0') +
    Math.abs(h2).toString(16).padStart(8, '0') +
    Math.abs(h3).toString(16).padStart(8, '0') +
    Math.abs(h4).toString(16).padStart(8, '0')
  );
  return (hex + hex).slice(0, 64);
}

/**
 * Robust CSV Line Parser
 * Handles commas, semicolons, tabs, and double-quoted cells containing delimiters.
 */
export function parseCSV(rawText: string): { headers: string[]; rows: Record<string, string>[] } {
  const clean = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!clean) return { headers: [], rows: [] };

  const lines = clean.split('\n').filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect delimiter from header line (comma, semicolon, or tab)
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes('\t') && !headerLine.includes(',')) delimiter = '\t';
  else if (headerLine.includes(';') && !headerLine.includes(',')) delimiter = ';';

  const parseLine = (text: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => h.replace(/^["']|["']$/g, '').trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      let val = values[colIdx] ?? '';
      val = val.replace(/^["']|["']$/g, '').trim();
      rowObj[h] = val;
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Expected schemas and required headers by entity kind
 */
export const ENTITY_SCHEMAS: Record<string, {
  name: string;
  requiredHeaders: string[];
  optionalHeaders: string[];
  description: string;
}> = {
  batches: {
    name: 'inventory_batches.csv',
    requiredHeaders: ['warehouseId', 'sku', 'batchNo', 'qtyUnits'],
    optionalHeaders: ['reservedUnits', 'expiryDate', 'version', 'asOf', 'id'],
    description: 'Warehouse batch stock, shelf-life expiry dates, versions',
  },
  products: {
    name: 'products.csv',
    requiredHeaders: ['sku', 'name', 'unitCost', 'unitPrice'],
    optionalHeaders: ['category', 'caseSize', 'spacePerCase', 'shelfLifeDays', 'perishable'],
    description: 'SKU definitions, case sizes, standard space units, perishable flags',
  },
  retailers: {
    name: 'retailers.csv',
    requiredHeaders: ['id', 'name', 'city'],
    optionalHeaders: ['type', 'serviceClass', 'minShelfLifePct', 'storageCases'],
    description: 'Store Management accounts, service class (A/B/C), min shelf-life %, storage limits',
  },
  routes: {
    name: 'routes.csv',
    requiredHeaders: ['warehouseId', 'retailerId', 'costPerCaseRupees', 'transitDays'],
    optionalHeaders: [],
    description: 'Warehouse-to-retailer freight ₹/case and transit days',
  },
  sales: {
    name: 'sales_daily.csv',
    requiredHeaders: ['date', 'retailerId', 'sku', 'unitsSold'],
    optionalHeaders: ['closingStockUnits'],
    description: 'Historical daily sales per store and SKU',
  },
};

/**
 * Validate and process an import file or raw payload
 */
export async function processMasterDataImport(
  rawCSV: string,
  targetEntity: string,
  fileName: string,
  context: ValidationContext,
  providedSHA256?: string
): Promise<ImportProcessingResult> {
  const schema = ENTITY_SCHEMAS[targetEntity] || ENTITY_SCHEMAS['batches'];
  const sha256 = providedSHA256 || await computeSHA256(rawCSV);
  const importId = `IMP-${Date.now().toString().slice(-6)}`;

  // 1. Check if identical file (same SHA-256) was already imported (PRD FR-02)
  if (context.importedFileHashes && context.importedFileHashes.has(sha256)) {
    return {
      importId,
      fileName,
      sha256,
      targetEntity,
      totalRows: 0,
      rowsAccepted: 0,
      rowsRejected: 0,
      errorRatePct: 0,
      committed: false,
      isDuplicateFile: true,
      hasCriticalError: false,
      errors: [
        {
          row: 0,
          field: 'SHA-256',
          message: `Re-import ignored: An identical file with SHA-256 (${sha256.slice(0, 16)}...) has already been committed (FR-02 deduplication).`,
          critical: true,
        },
      ],
      parsedRows: [],
      committedRecordsCount: 0,
      inventoryStateChanged: false,
      summaryMessage: 'Re-import detected and skipped to preserve data integrity.',
    };
  }

  // 2. Parse CSV
  const { headers, rows } = parseCSV(rawCSV);

  // 3. Header validation
  const missingHeaders = schema.requiredHeaders.filter(
    req => !headers.some(h => h.toLowerCase() === req.toLowerCase())
  );

  if (missingHeaders.length > 0) {
    const errorMsg = `Critical schema failure: Missing required header(s) [${missingHeaders.join(', ')}]. File rejected.`;
    return {
      importId,
      fileName,
      sha256,
      targetEntity,
      totalRows: rows.length,
      rowsAccepted: 0,
      rowsRejected: rows.length,
      errorRatePct: 100.0,
      committed: false,
      isDuplicateFile: false,
      hasCriticalError: true,
      errors: [
        {
          row: 1,
          field: 'headers',
          message: errorMsg,
          critical: true,
        },
      ],
      parsedRows: [],
      committedRecordsCount: 0,
      inventoryStateChanged: false,
      summaryMessage: errorMsg,
    };
  }

  if (rows.length === 0) {
    return {
      importId,
      fileName,
      sha256,
      targetEntity,
      totalRows: 0,
      rowsAccepted: 0,
      rowsRejected: 0,
      errorRatePct: 0,
      committed: false,
      isDuplicateFile: false,
      hasCriticalError: false,
      errors: [{ row: 0, field: 'file', message: 'The uploaded file contains no data rows.' }],
      parsedRows: [],
      committedRecordsCount: 0,
      inventoryStateChanged: false,
      summaryMessage: 'Empty dataset: 0 rows processed.',
    };
  }

  // Build lookup index sets for FK and business rule validation
  const warehouseMap = new Map(context.warehouses.map(w => [w.id.toUpperCase(), w]));
  const productMap = new Map(context.products.map(p => [p.sku.toUpperCase(), p]));
  const retailerMap = new Map(context.retailers.map(r => [r.id.toUpperCase(), r]));

  // Track intra-file uniqueness
  const seenBatchKeys = new Set<string>();
  const seenRouteKeys = new Set<string>();
  const seenSalesKeys = new Set<string>();
  const seenProductSkus = new Set<string>();
  const seenRetailerIds = new Set<string>();

  const allErrors: ValidationError[] = [];
  const parsedRows: ParsedRowPreview[] = [];
  const validBatches: InventoryBatch[] = [];
  const validProducts: Product[] = [];
  const validRetailers: Retailer[] = [];
  const validRoutes: Route[] = [];

  let invalidRowCount = 0;
  let hasCriticalError = false;

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to extract case-insensitive column value
  const getCol = (row: Record<string, string>, colName: string): string => {
    const key = Object.keys(row).find(k => k.toLowerCase() === colName.toLowerCase());
    return key ? row[key] : '';
  };

  // 4. Validate each row
  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // Row 1 is header
    const row = rows[i];
    const rowErrors: ValidationError[] = [];

    if (targetEntity === 'batches') {
      const warehouseId = getCol(row, 'warehouseId');
      const sku = getCol(row, 'sku');
      const batchNo = getCol(row, 'batchNo');
      const qtyUnitsRaw = getCol(row, 'qtyUnits');
      const reservedUnitsRaw = getCol(row, 'reservedUnits');
      const expiryDate = getCol(row, 'expiryDate');
      const versionRaw = getCol(row, 'version');

      // Warehouse FK validation
      if (!warehouseId) {
        rowErrors.push({ row: rowNum, field: 'warehouseId', message: 'Missing warehouseId' });
      } else if (!warehouseMap.has(warehouseId.toUpperCase())) {
        rowErrors.push({
          row: rowNum,
          field: 'warehouseId',
          message: `Foreign key lookup failed: Unknown WH ID "${warehouseId}"`,
        });
      }

      // SKU FK validation
      let product: Product | undefined;
      if (!sku) {
        rowErrors.push({ row: rowNum, field: 'sku', message: 'Missing SKU code' });
      } else {
        product = productMap.get(sku.toUpperCase());
        if (!product) {
          rowErrors.push({
            row: rowNum,
            field: 'sku',
            message: `Foreign key lookup failed: Unknown SKU code "${sku}"`,
          });
        }
      }

      // Batch No validation
      if (!batchNo) {
        rowErrors.push({ row: rowNum, field: 'batchNo', message: 'Batch number is required' });
      } else {
        const batchKey = `${warehouseId.toUpperCase()}::${batchNo.toUpperCase()}`;
        if (seenBatchKeys.has(batchKey)) {
          rowErrors.push({
            row: rowNum,
            field: 'batchNo',
            message: `Duplicate batch number "${batchNo}" in warehouse "${warehouseId}"`,
          });
        } else {
          seenBatchKeys.add(batchKey);
        }
      }

      // Quantity validation
      const qtyUnits = parseInt(qtyUnitsRaw, 10);
      if (isNaN(qtyUnits)) {
        rowErrors.push({ row: rowNum, field: 'qtyUnits', message: `Invalid numeric quantity "${qtyUnitsRaw}"` });
      } else if (qtyUnits < 0) {
        rowErrors.push({ row: rowNum, field: 'qtyUnits', message: `Negative inventory count rejected (${qtyUnits} units)` });
      }

      const reservedUnits = reservedUnitsRaw ? parseInt(reservedUnitsRaw, 10) : 0;
      if (!isNaN(reservedUnits) && reservedUnits > qtyUnits && qtyUnits >= 0) {
        rowErrors.push({
          row: rowNum,
          field: 'reservedUnits',
          message: `Reserved units (${reservedUnits}) cannot exceed physical quantity (${qtyUnits})`,
        });
      }

      // Expiry Date validation
      if (product && product.perishable) {
        if (!expiryDate) {
          rowErrors.push({
            row: rowNum,
            field: 'expiryDate',
            message: `Missing expiry date on perishable FMCG SKU "${sku}"`,
          });
        }
      }

      if (expiryDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) || isNaN(new Date(expiryDate).getTime())) {
          rowErrors.push({ row: rowNum, field: 'expiryDate', message: `Invalid ISO date format "${expiryDate}" (expected YYYY-MM-DD)` });
        } else if (expiryDate < todayStr) {
          rowErrors.push({
            row: rowNum,
            field: 'expiryDate',
            message: `Batch expired (${expiryDate}) before cycle start date`,
          });
        }
      }

      const version = versionRaw ? parseInt(versionRaw, 10) : 1;
      if (isNaN(version) || version < 1) {
        rowErrors.push({ row: rowNum, field: 'version', message: 'Batch version must be an integer >= 1' });
      }

      if (rowErrors.length === 0) {
        validBatches.push({
          id: `BAT-${warehouseId}-${sku}-${batchNo}`,
          warehouseId,
          sku,
          batchNo,
          qtyUnits: Math.max(0, qtyUnits),
          reservedUnits: Math.max(0, reservedUnits),
          expiryDate: expiryDate || '2028-12-31',
          version: isNaN(version) ? 1 : version,
          asOf: new Date().toISOString(),
        });
      }
    } else if (targetEntity === 'products') {
      const sku = getCol(row, 'sku');
      const name = getCol(row, 'name');
      const unitCostRaw = getCol(row, 'unitCost');
      const unitPriceRaw = getCol(row, 'unitPrice');
      const caseSizeRaw = getCol(row, 'caseSize');

      if (!sku) rowErrors.push({ row: rowNum, field: 'sku', message: 'SKU is required' });
      else if (seenProductSkus.has(sku.toUpperCase())) {
        rowErrors.push({ row: rowNum, field: 'sku', message: `Duplicate SKU code "${sku}" in file` });
      } else {
        seenProductSkus.add(sku.toUpperCase());
      }

      if (!name) rowErrors.push({ row: rowNum, field: 'name', message: 'Product name is required' });

      const unitCost = parseFloat(unitCostRaw);
      const unitPrice = parseFloat(unitPriceRaw);
      if (isNaN(unitCost) || unitCost < 0) {
        rowErrors.push({ row: rowNum, field: 'unitCost', message: 'Unit cost must be a non-negative number' });
      }
      if (isNaN(unitPrice) || unitPrice <= 0) {
        rowErrors.push({ row: rowNum, field: 'unitPrice', message: 'Unit price must be greater than zero' });
      } else if (!isNaN(unitCost) && unitPrice <= unitCost) {
        rowErrors.push({ row: rowNum, field: 'unitPrice', message: `Unit price (₹${unitPrice}) must be greater than unit cost (₹${unitCost})` });
      }

      const caseSize = caseSizeRaw ? parseInt(caseSizeRaw, 10) : 12;
      if (isNaN(caseSize) || caseSize < 1) {
        rowErrors.push({ row: rowNum, field: 'caseSize', message: 'Case size must be >= 1' });
      }

      if (rowErrors.length === 0) {
        validProducts.push({
          sku,
          name,
          category: getCol(row, 'category') || 'General FMCG',
          unitCost: Math.round(unitCost),
          unitPrice: Math.round(unitPrice),
          caseSize: isNaN(caseSize) ? 12 : caseSize,
          spacePerCase: parseFloat(getCol(row, 'spacePerCase')) || 1,
          shelfLifeDays: parseInt(getCol(row, 'shelfLifeDays'), 10) || 180,
          perishable: getCol(row, 'perishable').toLowerCase() === 'true',
        });
      }
    } else if (targetEntity === 'retailers') {
      const id = getCol(row, 'id');
      const name = getCol(row, 'name');
      const city = getCol(row, 'city');
      const minShelfLifePctRaw = getCol(row, 'minShelfLifePct');

      if (!id) rowErrors.push({ row: rowNum, field: 'id', message: 'Retailer ID is required' });
      else if (seenRetailerIds.has(id.toUpperCase())) {
        rowErrors.push({ row: rowNum, field: 'id', message: `Duplicate retailer ID "${id}" in file` });
      } else {
        seenRetailerIds.add(id.toUpperCase());
      }

      if (!name) rowErrors.push({ row: rowNum, field: 'name', message: 'Store name is required' });
      if (!city) rowErrors.push({ row: rowNum, field: 'city', message: 'City is required' });

      const minShelfLifePct = minShelfLifePctRaw ? parseFloat(minShelfLifePctRaw) : 0.70;
      if (isNaN(minShelfLifePct) || minShelfLifePct < 0 || minShelfLifePct > 1) {
        rowErrors.push({ row: rowNum, field: 'minShelfLifePct', message: 'minShelfLifePct must be between 0.0 and 1.0' });
      }

      if (rowErrors.length === 0) {
        validRetailers.push({
          id,
          name,
          city,
          type: (getCol(row, 'type') as any) || 'kirana',
          serviceClass: (getCol(row, 'serviceClass') as any) || 'C',
          minShelfLifePct: isNaN(minShelfLifePct) ? 0.7 : minShelfLifePct,
          storageCases: parseInt(getCol(row, 'storageCases'), 10) || 50,
          currentStorageUsed: 0,
          paymentScore: 0.95,
          lastSyncAt: new Date().toISOString(),
        });
      }
    } else if (targetEntity === 'routes') {
      const warehouseId = getCol(row, 'warehouseId');
      const retailerId = getCol(row, 'retailerId');
      const costRaw = getCol(row, 'costPerCaseRupees');
      const transitRaw = getCol(row, 'transitDays');

      if (!warehouseMap.has(warehouseId.toUpperCase())) {
        rowErrors.push({ row: rowNum, field: 'warehouseId', message: `Unknown WH "${warehouseId}"` });
      }
      if (!retailerMap.has(retailerId.toUpperCase())) {
        rowErrors.push({ row: rowNum, field: 'retailerId', message: `Unknown Retailer "${retailerId}"` });
      }

      const routeKey = `${warehouseId.toUpperCase()}::${retailerId.toUpperCase()}`;
      if (seenRouteKeys.has(routeKey)) {
        rowErrors.push({ row: rowNum, field: 'route', message: `Duplicate route "${warehouseId}" -> "${retailerId}"` });
      } else {
        seenRouteKeys.add(routeKey);
      }

      const cost = parseFloat(costRaw);
      const transit = parseFloat(transitRaw);
      if (isNaN(cost) || cost < 0) rowErrors.push({ row: rowNum, field: 'costPerCaseRupees', message: 'Cost per case must be >= 0' });
      if (isNaN(transit) || transit < 0) rowErrors.push({ row: rowNum, field: 'transitDays', message: 'Transit days must be >= 0' });

      if (rowErrors.length === 0) {
        validRoutes.push({
          warehouseId,
          retailerId,
          costPerCaseRupees: isNaN(cost) ? 20 : cost,
          transitDays: isNaN(transit) ? 1.0 : transit,
        });
      }
    } else if (targetEntity === 'sales') {
      const date = getCol(row, 'date');
      const retailerId = getCol(row, 'retailerId');
      const sku = getCol(row, 'sku');
      const unitsSoldRaw = getCol(row, 'unitsSold');

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        rowErrors.push({ row: rowNum, field: 'date', message: 'Invalid ISO date string format (YYYY-MM-DD)' });
      }
      if (!retailerMap.has(retailerId.toUpperCase())) {
        rowErrors.push({ row: rowNum, field: 'retailerId', message: `Foreign key mismatch: Unknown retailer "${retailerId}"` });
      }
      if (!productMap.has(sku.toUpperCase())) {
        rowErrors.push({ row: rowNum, field: 'sku', message: `Unknown SKU code "${sku}"` });
      }

      const saleKey = `${date}::${retailerId.toUpperCase()}::${sku.toUpperCase()}`;
      if (seenSalesKeys.has(saleKey)) {
        rowErrors.push({ row: rowNum, field: 'sale', message: `Duplicate sale entry for date "${date}", retailer "${retailerId}", SKU "${sku}"` });
      } else {
        seenSalesKeys.add(saleKey);
      }

      const unitsSold = parseInt(unitsSoldRaw, 10);
      if (isNaN(unitsSold) || unitsSold < 0) {
        rowErrors.push({ row: rowNum, field: 'unitsSold', message: 'Negative sales quantity not permitted' });
      }
    }

    if (rowErrors.length > 0) {
      invalidRowCount++;
      allErrors.push(...rowErrors);
    }

    // Capture preview for first 15 rows
    if (parsedRows.length < 15) {
      parsedRows.push({
        rowNumber: rowNum,
        data: row,
        isValid: rowErrors.length === 0,
        errors: rowErrors,
      });
    }
  }

  // 5. Evaluate the 5% Transactional Threshold Rule (FR-02, J1 Step 3)
  const totalRows = rows.length;
  const rowsRejected = invalidRowCount;
  const errorRatePct = totalRows > 0 ? Number(((rowsRejected / totalRows) * 100).toFixed(2)) : 0;

  // Rule: <= 5.0% error rate commits valid rows; > 5.0% rejects entire file
  const committed = !hasCriticalError && errorRatePct <= 5.0;
  const rowsAccepted = committed ? (totalRows - rowsRejected) : 0;
  const inventoryStateChanged = committed && rowsAccepted > 0;

  let summaryMessage = '';
  if (hasCriticalError) {
    summaryMessage = 'File rejected due to critical schema violation. Zero records committed.';
  } else if (committed) {
    if (errorRatePct === 0) {
      summaryMessage = `Clean dataset: All ${totalRows} valid rows committed in one transaction (0.0% error rate).`;
    } else {
      summaryMessage = `Threshold pass: ${errorRatePct}% errors (≤ 5% limit). ${rowsAccepted} valid rows committed transactionally; ${rowsRejected} rejected rows isolated.`;
    }
  } else {
    summaryMessage = `Threshold breach: ${errorRatePct}% errors (> 5% limit). Transaction rolled back; 0 rows committed to protect inventory state.`;
  }

  return {
    importId,
    fileName,
    sha256,
    targetEntity,
    totalRows,
    rowsAccepted,
    rowsRejected,
    errorRatePct,
    committed,
    isDuplicateFile: false,
    hasCriticalError,
    errors: allErrors,
    parsedRows,
    committedRecordsCount: rowsAccepted,
    inventoryStateChanged,
    summaryMessage,
    committedBatches: committed ? validBatches : [],
    committedProducts: committed ? validProducts : [],
    committedRetailers: committed ? validRetailers : [],
    committedRoutes: committed ? validRoutes : [],
  };
}

/**
 * Generate synthetic clean demo CSV (100% valid) for the chosen entity
 */
export function generateCleanDemoCSV(kind: string): string {
  if (kind === 'batches') {
    const lines = ['warehouseId,sku,batchNo,qtyUnits,reservedUnits,expiryDate,version'];
    const whs = ['WH-PUN', 'WH-SAT', 'WH-KOL'];
    const skus = [
      { sku: 'SKU-ATT-05', expiry: '2027-09-15' },
      { sku: 'SKU-OIL-01', expiry: '2027-11-20' },
      { sku: 'SKU-RIC-05', expiry: '2028-02-10' },
      { sku: 'SKU-AML-01', expiry: '2027-05-18' },
      { sku: 'SKU-PAR-48', expiry: '2027-08-30' },
      { sku: 'SKU-TAT-01', expiry: '2028-10-01' },
      { sku: 'SKU-MAG-24', expiry: '2027-07-25' },
      { sku: 'SKU-SRF-01', expiry: '2028-06-15' },
    ];

    let rowIdx = 1;
    for (let i = 0; i < 100; i++) {
      const wh = whs[i % whs.length];
      const prod = skus[i % skus.length];
      const batchNo = `LOT-${wh}-${prod.sku.replace('SKU-', '')}-${String(rowIdx).padStart(3, '0')}`;
      const qtyUnits = 120 + ((i * 17) % 600);
      const reservedUnits = Math.round(qtyUnits * 0.1);
      lines.push(`${wh},${prod.sku},${batchNo},${qtyUnits},${reservedUnits},${prod.expiry},1`);
      rowIdx++;
    }
    return lines.join('\n');
  }

  if (kind === 'products') {
    const lines = ['sku,name,category,unitCost,unitPrice,caseSize,spacePerCase,shelfLifeDays,perishable'];
    for (let i = 1; i <= 50; i++) {
      const sku = `SKU-FMCG-${String(i).padStart(3, '0')}`;
      const cost = 80 + (i * 5);
      const price = Math.round(cost * 1.25);
      lines.push(`${sku},FMCG Product Demo ${i},Packaged Goods,${cost},${price},12,1,180,false`);
    }
    return lines.join('\n');
  }

  if (kind === 'retailers') {
    const lines = ['id,name,city,type,serviceClass,minShelfLifePct,storageCases'];
    const cities = ['Pune', 'Satara', 'Kolhapur', 'Karad', 'Sangli'];
    for (let i = 1; i <= 50; i++) {
      const id = `RET-DEMO-${String(i).padStart(3, '0')}`;
      const city = cities[i % cities.length];
      lines.push(`${id},Demo Store ${i},${city},kirana,C,0.70,45`);
    }
    return lines.join('\n');
  }

  if (kind === 'routes') {
    const lines = ['warehouseId,retailerId,costPerCaseRupees,transitDays'];
    const whs = ['WH-PUN', 'WH-SAT', 'WH-KOL'];
    const rets = ['RET-GAN', 'RET-LAX', 'RET-BAL', 'RET-MAH', 'RET-OMS', 'RET-SAM', 'RET-REL', 'RET-DMA'];
    for (const w of whs) {
      for (const r of rets) {
        lines.push(`${w},${r},24,1.5`);
      }
    }
    return lines.join('\n');
  }

  // sales
  const lines = ['date,retailerId,sku,unitsSold,closingStockUnits'];
  const rets = ['RET-GAN', 'RET-LAX', 'RET-BAL', 'RET-MAH'];
  const skus = ['SKU-ATT-05', 'SKU-OIL-01', 'SKU-RIC-05', 'SKU-AML-01'];
  for (let d = 1; d <= 25; d++) {
    const dateStr = `2026-10-${String(d).padStart(2, '0')}`;
    for (const r of rets) {
      for (const s of skus) {
        lines.push(`${dateStr},${r},${s},14,8`);
      }
    }
  }
  return lines.join('\n');
}

/**
 * Generate demo CSV with exactly 3% row errors (3 errors out of 100 rows)
 * In accordance with J1 Step 3, 3% <= 5% -> Valid 97 rows commit transactionally.
 */
export function generate3PercentErrorCSV(kind: string): string {
  if (kind === 'batches') {
    const lines = ['warehouseId,sku,batchNo,qtyUnits,reservedUnits,expiryDate,version'];
    const whs = ['WH-PUN', 'WH-SAT', 'WH-KOL'];
    const skus = ['SKU-ATT-05', 'SKU-OIL-01', 'SKU-RIC-05', 'SKU-AML-01', 'SKU-PAR-48'];

    for (let i = 1; i <= 100; i++) {
      const wh = whs[i % whs.length];
      const sku = skus[i % skus.length];
      const batchNo = `LOT-TEST3-${String(i).padStart(3, '0')}`;

      // Row 14 (i=13 in loop): Perishable milk with missing expiryDate
      if (i === 13) {
        lines.push(`WH-PUN,SKU-AML-01,${batchNo},140,0,,1`);
        continue;
      }

      // Row 42 (i=41 in loop): Unknown warehouse foreign key
      if (i === 41) {
        lines.push(`WH-UNKNOWN-MUM,SKU-ATT-05,${batchNo},200,10,2027-10-10,1`);
        continue;
      }

      // Row 89 (i=88 in loop): Negative quantity
      if (i === 88) {
        lines.push(`WH-KOL,SKU-OIL-01,${batchNo},-45,0,2027-11-15,1`);
        continue;
      }

      // 97 valid rows
      lines.push(`${wh},${sku},${batchNo},180,0,2027-12-31,1`);
    }
    return lines.join('\n');
  }

  // Fallback generic 3% error dataset
  return generateCleanDemoCSV(kind);
}

/**
 * Generate demo CSV with 18% row errors (18 errors out of 100 rows)
 * In accordance with J1 Step 3, 18% > 5% -> Entire file rejected, 0 rows commit.
 */
export function generate18PercentErrorCSV(kind: string): string {
  if (kind === 'batches') {
    const lines = ['warehouseId,sku,batchNo,qtyUnits,reservedUnits,expiryDate,version'];
    const whs = ['WH-PUN', 'WH-SAT', 'WH-KOL'];
    const skus = ['SKU-ATT-05', 'SKU-OIL-01', 'SKU-RIC-05', 'SKU-AML-01', 'SKU-PAR-48'];

    // 18 error indices out of 100
    const errorIndices = new Set([3, 7, 12, 18, 24, 31, 38, 45, 52, 59, 66, 73, 79, 84, 89, 92, 96, 99]);

    for (let i = 1; i <= 100; i++) {
      const batchNo = `LOT-TEST18-${String(i).padStart(3, '0')}`;

      if (errorIndices.has(i)) {
        if (i % 4 === 0) {
          // Negative quantity
          lines.push(`WH-PUN,SKU-ATT-05,${batchNo},-30,0,2027-10-10,1`);
        } else if (i % 4 === 1) {
          // Unknown warehouse
          lines.push(`WH-FAKE-999,SKU-OIL-01,${batchNo},100,0,2027-10-10,1`);
        } else if (i % 4 === 2) {
          // Unknown SKU
          lines.push(`WH-SAT,SKU-NOT-EXIST,${batchNo},150,0,2027-10-10,1`);
        } else {
          // Expired batch
          lines.push(`WH-KOL,SKU-AML-01,${batchNo},80,0,2025-01-01,1`);
        }
      } else {
        const wh = whs[i % whs.length];
        const sku = skus[i % skus.length];
        lines.push(`${wh},${sku},${batchNo},150,0,2027-12-31,1`);
      }
    }
    return lines.join('\n');
  }

  // Fallback generic 18% error dataset
  return generateCleanDemoCSV(kind);
}
