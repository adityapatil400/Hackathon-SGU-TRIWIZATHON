import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  Database,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { Product, Warehouse, Retailer, Route, InventoryBatch } from '../types';
import {
  INITIAL_WAREHOUSES,
  INITIAL_PRODUCTS,
  INITIAL_RETAILERS,
  INITIAL_BATCHES,
  INITIAL_ROUTES
} from '../data/mockData';
import {
  processMasterDataImport,
  generateCleanDemoCSV,
  generate3PercentErrorCSV,
  generate18PercentErrorCSV,
  ImportProcessingResult,
  ENTITY_SCHEMAS
} from '../services/importValidator';

export interface ImportStudioViewProps {
  batches?: InventoryBatch[];
  products?: Product[];
  retailers?: Retailer[];
  warehouses?: Warehouse[];
  routes?: Route[];
  onCommitBatches?: (newBatches: InventoryBatch[]) => void;
  onCommitProducts?: (newProducts: Product[]) => void;
  onCommitRetailers?: (newRetailers: Retailer[]) => void;
  onCommitRoutes?: (newRoutes: Route[]) => void;
}

export const ImportStudioView: React.FC<ImportStudioViewProps> = ({
  batches = INITIAL_BATCHES,
  products = INITIAL_PRODUCTS,
  retailers = INITIAL_RETAILERS,
  warehouses = INITIAL_WAREHOUSES,
  routes = INITIAL_ROUTES,
  onCommitBatches,
  onCommitProducts,
  onCommitRetailers,
  onCommitRoutes,
}) => {
  const { t, formatNumber } = useTranslation();
  const [selectedKind, setSelectedKind] = useState<string>('batches');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportProcessingResult | null>(null);
  const [importedHashes, setImportedHashes] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleDatasets = [
    { kind: 'batches', name: 'inventory_batches.csv', desc: 'Warehouse batch stock, shelf-life expiry dates, versions' },
    { kind: 'sales', name: 'sales_daily.csv', desc: '84 days historical daily sales per store and SKU' },
    { kind: 'products', name: 'products.csv', desc: 'SKU definitions, case sizes, standard space units, perishable flags' },
    { kind: 'retailers', name: 'retailers.csv', desc: 'Store Management accounts, service class (A/B/C), min shelf-life %, storage limits' },
    { kind: 'routes', name: 'routes.csv', desc: 'Warehouse-to-retailer freight ₹/case and transit days' },
  ];

  // Prepare active validation context from live state
  const validationContext = {
    warehouses,
    products,
    retailers,
    routes,
    existingBatches: batches,
    importedFileHashes: importedHashes,
  };

  /**
   * Execute real import workflow with the 5% transactional rule
   */
  const handleExecuteImport = async (csvContent: string, fileName: string) => {
    setIsProcessing(true);
    setImportResult(null);

    try {
      const result = await processMasterDataImport(
        csvContent,
        selectedKind,
        fileName,
        validationContext
      );

      // Enforce Transactional State Commit
      if (result.committed) {
        // Track SHA-256 for duplicate re-import protection (FR-02)
        setImportedHashes(prev => new Set([...prev, result.sha256]));

        // Commit valid records to application state
        if (selectedKind === 'batches' && result.committedBatches && onCommitBatches) {
          onCommitBatches(result.committedBatches);
        } else if (selectedKind === 'products' && result.committedProducts && onCommitProducts) {
          onCommitProducts(result.committedProducts);
        } else if (selectedKind === 'retailers' && result.committedRetailers && onCommitRetailers) {
          onCommitRetailers(result.committedRetailers);
        } else if (selectedKind === 'routes' && result.committedRoutes && onCommitRoutes) {
          onCommitRoutes(result.committedRoutes);
        }
      }

      setImportResult(result);
    } catch (err: any) {
      setImportResult({
        importId: `IMP-ERR-${Date.now().toString().slice(-4)}`,
        fileName,
        sha256: '0000000000000000000000000000000000000000000000000000000000000000',
        targetEntity: selectedKind,
        totalRows: 0,
        rowsAccepted: 0,
        rowsRejected: 0,
        errorRatePct: 100,
        committed: false,
        isDuplicateFile: false,
        hasCriticalError: true,
        errors: [{ row: 0, field: 'execution', message: err?.message || 'Unexpected import processing error' }],
        parsedRows: [],
        committedRecordsCount: 0,
        inventoryStateChanged: false,
        summaryMessage: 'Internal processing failure. Transaction aborted.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Action 1: Load Clean Demo Dataset (100% Valid -> 0% Errors)
   */
  const handleLoadCleanDemo = () => {
    setSelectedFile(null);
    const csv = generateCleanDemoCSV(selectedKind);
    const fileName = `${selectedKind}_demo_clean_v1.5.csv`;
    handleExecuteImport(csv, fileName);
  };

  /**
   * Action 2: Test 3% Row Errors (Valid Rows Commit, <= 5% Threshold)
   */
  const handleTest3PercentErrors = () => {
    setSelectedFile(null);
    const csv = generate3PercentErrorCSV(selectedKind);
    const fileName = `${selectedKind}_test_3pct_errors.csv`;
    handleExecuteImport(csv, fileName);
  };

  /**
   * Action 3: Test 18% Errors (Entire File Rejected, > 5% Threshold)
   */
  const handleTest18PercentErrors = () => {
    setSelectedFile(null);
    const csv = generate18PercentErrorCSV(selectedKind);
    const fileName = `${selectedKind}_corrupted_18pct_errors.csv`;
    handleExecuteImport(csv, fileName);
  };

  /**
   * File Upload / Drag-and-Drop Handler
   */
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        handleExecuteImport(text, file.name);
      }
    };
    reader.onerror = () => {
      alert('Unable to read selected file. Please select a valid CSV or plain text file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1E293B] tracking-tight">
              Master Data &amp; Batch Inventory Import Studio
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              J1 Priya &amp; Rohit
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            CSV/XLSX schema verification • Single Sales Path deduplication • 5% Error Threshold Transactional Rule (FR-02)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-semibold">Target Entity:</span>
          <select
            value={selectedKind}
            onChange={e => {
              setSelectedKind(e.target.value);
              setImportResult(null);
              setSelectedFile(null);
            }}
            className="bg-[#FFF8E7] border border-[#E7E5E4] text-[#1E293B] font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#2563EB] cursor-pointer"
          >
            {sampleDatasets.map(d => (
              <option key={d.kind} value={d.kind}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 5% Threshold Rule Explanation Box */}
      <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E293B] flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-[#2563EB]">
            Transactional Data Integrity Guarantee (J1 Step 3 &amp; FR-02)
          </h4>
          <p className="text-[#64748B] mt-0.5 leading-relaxed">
            If <strong>&le; 5%</strong> of rows fail validation, the valid rows are committed in one transaction and rejected rows are flagged with file:row diagnostics. If <strong>&gt; 5%</strong> fail, nothing is committed—preventing half-updated stock states from corrupting planning runs.
          </p>
          <p className="text-[11px] text-[#2563EB] mt-1.5 font-medium">
            Runtime Scope: Valid transactions update the active application catalog state immediately. File SHA-256 hashes are tracked to prevent duplicate re-imports.
          </p>
        </div>
      </div>

      {/* Drop Zone & Test Scenarios */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`bg-white p-8 rounded-2xl border-2 border-dashed transition-colors text-center space-y-4 shadow-xs ${
          isDragOver ? 'border-[#2563EB] bg-[#EFF6FF]/40' : 'border-[#E7E5E4]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,.txt,.xlsx"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelected(e.target.files[0]);
            }
          }}
        />

        <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-base font-bold text-[#1E293B]">
            Upload Master Data or Inventory Batches
          </h3>
          <p className="text-xs text-[#64748B] mt-1">
            Drag and drop CSV or XLSX files (max 10MB) or run a demo scenario below
          </p>
          {selectedFile && (
            <p className="text-xs font-semibold text-[#2563EB] mt-1 font-mono">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {/* File Picker trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#1E293B] bg-white border border-[#E7E5E4] hover:bg-[#FAF3E0] shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
            <span>Browse CSV File</span>
          </button>

          {/* Action 1: Load Clean Demo Dataset */}
          <button
            type="button"
            onClick={handleLoadCleanDemo}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Load Clean Demo Dataset (100% Valid)</span>
          </button>

          {/* Action 2: Test 3% Row Errors */}
          <button
            type="button"
            onClick={handleTest3PercentErrors}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#1E293B] bg-white border border-[#2563EB] hover:bg-[#EFF6FF] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Demonstrate <= 5% error rule where valid rows commit and 3 errors are reported"
          >
            <AlertTriangle className="w-4 h-4 text-[#EA580C]" />
            <span>Test 3% Row Errors (Valid Rows Commit)</span>
          </button>

          {/* Action 3: Test 18% Errors */}
          <button
            type="button"
            onClick={handleTest18PercentErrors}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#DC2626] bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Demonstrate > 5% error rule where entire file is rolled back"
          >
            <XCircle className="w-4 h-4 text-[#DC2626]" />
            <span>Test 18% Errors (Entire File Rejected)</span>
          </button>
        </div>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="bg-white p-8 rounded-2xl border border-[#E7E5E4] text-center space-y-3 shadow-xs">
          <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#1E293B]">Parsing file, checking schema, and verifying foreign keys...</p>
        </div>
      )}

      {/* Validation Result Inspection */}
      {importResult && !isProcessing && (
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] space-y-4 shadow-xs animate-in fade-in">
          {/* Result Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E5E4] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1E293B] text-base">{importResult.fileName}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  importResult.committed
                    ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                    : 'bg-red-50 text-[#DC2626] border border-red-200'
                }`}>
                  {importResult.committed ? 'TRANSACTION COMMITTED' : 'IMPORT ROLLED BACK'}
                </span>
                {importResult.isDuplicateFile && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF3E0] text-[#EA580C] border border-[#E7E5E4]">
                    DUPLICATE IGNORED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                SHA-256: {importResult.sha256}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-[#64748B]">Import Batch ID:</span>
              <span className="block font-mono text-xs font-bold text-[#2563EB]">{importResult.importId}</span>
            </div>
          </div>

          {/* Summary Banner */}
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            importResult.committed
              ? 'bg-emerald-50 border-emerald-200 text-[#15803D]'
              : 'bg-red-50 border-red-200 text-[#DC2626]'
          }`}>
            <div className="flex items-center gap-2">
              {importResult.committed ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span className="font-semibold">{importResult.summaryMessage}</span>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider block">
                {importResult.inventoryStateChanged ? 'State Changed: YES' : 'State Changed: NO'}
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#FFF8E7] border border-[#E7E5E4]">
              <span className="text-[#64748B] font-medium">Total Rows Processed</span>
              <p className="text-lg font-black text-[#1E293B] mt-0.5 font-mono">{formatNumber(importResult.totalRows)}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF3E0] border border-[#E7E5E4]">
              <span className="text-[#64748B] font-medium">Valid Rows Committed</span>
              <p className="text-lg font-black text-[#15803D] mt-0.5 font-mono">{formatNumber(importResult.rowsAccepted)}</p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E7E5E4]">
              <span className="text-[#64748B] font-medium">Rejected Rows</span>
              <p className="text-lg font-black text-[#DC2626] mt-0.5 font-mono">{formatNumber(importResult.rowsRejected)}</p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E7E5E4]">
              <span className="text-[#64748B] font-medium">Error Rate</span>
              <p className={`text-lg font-black mt-0.5 font-mono ${importResult.errorRatePct <= 5 ? 'text-[#EA580C]' : 'text-[#DC2626]'}`}>
                {importResult.errorRatePct.toFixed(1)}% {importResult.errorRatePct <= 5 ? '(≤ 5% Limit)' : '(> 5% Limit)'}
              </p>
            </div>
          </div>

          {/* Parsed Rows Preview */}
          {importResult.parsedRows.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-[#2563EB]" />
                  <span>Parsed Rows Preview (First {importResult.parsedRows.length} Rows)</span>
                </h4>
                <span className="text-[11px] text-[#64748B]">
                  Schema Target: <strong className="text-[#1E293B]">{importResult.targetEntity}</strong>
                </span>
              </div>

              <div className="rounded-xl border border-[#E7E5E4] overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E7E5E4] bg-[#FAF3E0] text-[#64748B] font-semibold">
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">Validation Status</th>
                        {Object.keys(importResult.parsedRows[0].data).map((key) => (
                          <th key={key} className="py-2 px-3">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E5E4] font-mono text-[11px]">
                      {importResult.parsedRows.map((row) => (
                        <tr key={row.rowNumber} className={`hover:bg-[#FFF8E7]/50 ${!row.isValid ? 'bg-red-50/50' : ''}`}>
                          <td className="py-2 px-3 font-bold text-[#64748B]">{row.rowNumber}</td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              row.isValid
                                ? 'bg-emerald-100 text-[#15803D]'
                                : 'bg-red-100 text-[#DC2626]'
                            }`}>
                              {row.isValid ? 'VALID' : 'INVALID'}
                            </span>
                          </td>
                          {Object.keys(row.data).map((key) => (
                            <td key={key} className="py-2 px-3 truncate max-w-[150px]">
                              {row.data[key] || <span className="text-[#94A3B8] italic">empty</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Error Diagnostics Table */}
          {importResult.errors.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-[#DC2626] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                <span>Row-Level Diagnostics (file:row) • {importResult.errors.length} Issue(s) Reported</span>
              </h4>

              <div className="rounded-xl border border-[#E7E5E4] overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E7E5E4] bg-[#FAF3E0] text-[#64748B] font-semibold">
                        <th className="py-2 px-3">Location</th>
                        <th className="py-2 px-3">Target Field</th>
                        <th className="py-2 px-3">Validation Rule Broken</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E5E4] font-mono text-[11px]">
                      {importResult.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-[#FFF8E7]/50 text-[#1E293B]">
                          <td className="py-2 px-3 text-[#EA580C] font-semibold whitespace-nowrap">
                            {importResult.fileName}:{err.row}
                          </td>
                          <td className="py-2 px-3 text-[#2563EB] font-semibold whitespace-nowrap">
                            {err.field}
                          </td>
                          <td className="py-2 px-3 text-[#DC2626] font-sans">
                            {err.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
