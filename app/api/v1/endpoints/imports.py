"""
FlowGrid Master Data & Batch Inventory Import Studio API (FR-02, J1 Step 3).
Integrates with Ollama (nemotron-3-ultra:cloud) for intelligent document parsing,
schema auditing, 5% transactional rule enforcement, and anomaly root cause analysis.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, status
from app.core.security import require_roles, AuthenticatedUser, PLANNER_ROLES, VIEWER_ROLES
from app.schemas.ai import DocumentAuditRequest, DocumentAuditResponse
from app.services.ollama_service import OllamaService

router = APIRouter(prefix="/imports", tags=["Master Data & Inventory Imports"])


@router.post(
    "/audit",
    response_model=DocumentAuditResponse,
    status_code=status.HTTP_200_OK,
    summary="Audit uploaded document via LLM (nemotron-3-ultra:cloud)",
    description=(
        "Synthesizes uploaded master data or inventory batch files (CSV/XLSX), evaluates "
        "compliance with the strict 5% error threshold transactional rule (FR-02), detects "
        "root causes for rejected rows, assesses downstream planning risks, and provides "
        "an accessible executive audit for Priya & Rohit."
    ),
)
def audit_import_document(
    payload: DocumentAuditRequest,
    current_user: AuthenticatedUser = Depends(require_roles(VIEWER_ROLES)),
) -> DocumentAuditResponse:
    return OllamaService.audit_document_import(payload)


@router.get(
    "/schemas",
    status_code=status.HTTP_200_OK,
    summary="Get supported master data entity schemas",
)
def get_entity_schemas(
    current_user: AuthenticatedUser = Depends(require_roles(VIEWER_ROLES)),
) -> Dict[str, Any]:
    return {
        "rule": "5% Error Threshold Transactional Rule (FR-02 / J1 Step 3)",
        "threshold_pct": 5.0,
        "supported_entities": [
            {
                "kind": "batches",
                "file_name": "inventory_batches.csv",
                "required_headers": ["warehouseId", "sku", "batchNo", "qtyUnits"],
                "optional_headers": ["reservedUnits", "expiryDate", "version", "asOf", "id"],
                "description": "Warehouse batch stock, shelf-life expiry dates, versions",
            },
            {
                "kind": "products",
                "file_name": "products.csv",
                "required_headers": ["sku", "name", "unitCost", "unitPrice"],
                "optional_headers": ["category", "caseSize", "spacePerCase", "shelfLifeDays", "perishable"],
                "description": "SKU definitions, case sizes, standard space units, perishable flags",
            },
            {
                "kind": "retailers",
                "file_name": "retailers.csv",
                "required_headers": ["id", "name", "city"],
                "optional_headers": ["type", "serviceClass", "minShelfLifePct", "storageCases"],
                "description": "Store Management accounts, service class (A/B/C), min shelf-life %, storage limits",
            },
            {
                "kind": "routes",
                "file_name": "routes.csv",
                "required_headers": ["warehouseId", "retailerId", "costPerCaseRupees", "transitDays"],
                "optional_headers": [],
                "description": "Warehouse-to-retailer freight ₹/case and transit days",
            },
            {
                "kind": "sales",
                "file_name": "sales_daily.csv",
                "required_headers": ["date", "retailerId", "sku", "unitsSold"],
                "optional_headers": ["closingStockUnits"],
                "description": "Historical daily sales per store and SKU",
            },
        ],
    }
