"""
Comprehensive test suite for Master Data & Batch Inventory Import Studio LLM Document Audit (FR-02 / J1 Step 3).
Verifies:
1. OllamaService.audit_document_import fallback handling (0% clean, 3% valid commit, 18% rollback).
2. Mocked nemotron-3-ultra:cloud LLM generation with schema validation.
3. REST API endpoints: POST /api/v1/imports/audit and GET /api/v1/imports/schemas.
4. Chatbot integration: ProductChatIntelligenceService handling import_document_audit intent.
"""

import json
from typing import Dict, Any
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.ai import DocumentAuditRequest
from app.services.ollama_service import OllamaService


def test_ollama_audit_document_import_clean():
    OllamaService.set_mock_generator(lambda payload: "INVALID_JSON_FOR_FALLBACK")
    try:
        req = DocumentAuditRequest(
            file_name="inventory_batches_clean_v1.5.csv",
            target_entity="batches",
            total_rows=100,
            rows_accepted=100,
            rows_rejected=0,
            error_rate_pct=0.0,
            committed=True,
            sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            is_duplicate=False,
            has_critical_error=False,
        )
        res = OllamaService.audit_document_import(req)
        assert res.audit_id.startswith("AUD-")
        assert res.file_name == "inventory_batches_clean_v1.5.csv"
        assert res.verdict == "CLEAN_COMMITTED"
        assert res.data_quality_score == 1.0
        assert "100%" in res.executive_summary
        assert "FR-02" in res.rule_compliance_narrative
        assert len(res.remediation_steps) >= 1
        assert res.is_fallback is True
    finally:
        OllamaService.set_mock_generator(None)


def test_ollama_audit_document_import_3_percent():
    OllamaService.set_mock_generator(lambda payload: "INVALID_JSON_FOR_FALLBACK")
    try:
        req = DocumentAuditRequest(
            file_name="batches_test_3pct_errors.csv",
            target_entity="batches",
            total_rows=100,
            rows_accepted=97,
            rows_rejected=3,
            error_rate_pct=3.0,
            committed=True,
            sha256="a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
            errors_sample=[
                {"row": 8, "field": "expiryDate", "message": "Perishable SKU missing expiry date"},
                {"row": 24, "field": "warehouseId", "message": "Unknown warehouse code 'WH-INVALID'"},
                {"row": 57, "field": "qtyUnits", "message": "Negative quantity (-50)"},
            ],
        )
        res = OllamaService.audit_document_import(req)
        assert res.verdict == "PARTIALLY_COMMITTED_UNDER_5PCT"
        assert res.data_quality_score == 0.97
        assert "97" in res.executive_summary
        assert "3" in res.executive_summary
        assert any("Row 8" in a for a in res.anomaly_root_causes)
        assert any("Row 24" in a for a in res.anomaly_root_causes)
        assert len(res.remediation_steps) >= 2
    finally:
        OllamaService.set_mock_generator(None)


def test_ollama_audit_document_import_18_percent_rollback():
    OllamaService.set_mock_generator(lambda payload: "INVALID_JSON_FOR_FALLBACK")
    try:
        req = DocumentAuditRequest(
            file_name="batches_corrupted_18pct_errors.csv",
            target_entity="batches",
            total_rows=100,
            rows_accepted=0,
            rows_rejected=18,
            error_rate_pct=18.0,
            committed=False,
            sha256="ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100",
            errors_sample=[
                {"row": 4, "field": "expiryDate", "message": "Perishable SKU missing required expiry date"},
                {"row": 12, "field": "warehouseId", "message": "Foreign key violation: Warehouse 'WH-99' does not exist"},
            ],
        )
        res = OllamaService.audit_document_import(req)
        assert res.verdict == "ROLLED_BACK_THRESHOLD_EXCEEDED"
        assert res.data_quality_score == 0.82
        assert "Aborted" in res.executive_summary or "rolled back" in res.executive_summary
        assert "18.0%" in res.rule_compliance_narrative
        assert any("Row 4" in a for a in res.anomaly_root_causes)
    finally:
        OllamaService.set_mock_generator(None)


def test_imports_api_endpoints():
    def mock_gen(payload: Dict[str, Any]) -> str:
        return json.dumps({
            "verdict": "PARTIALLY_COMMITTED_UNDER_5PCT",
            "data_quality_score": 0.97,
            "executive_summary": "Priya & Rohit: 97 rows committed under 5% transactional rule.",
            "rule_compliance_narrative": "3% error rate strictly adheres to FR-02 requirement.",
            "anomaly_root_causes": ["Row 14: invalid date format", "Row 42: unknown warehouse code"],
            "operational_risk_assessment": "Safe for downstream FEFO planning.",
            "remediation_steps": ["Correct the 3 flagged records and re-import."]
        })

    OllamaService.set_mock_generator(mock_gen)
    try:
        client = TestClient(app)
        headers = {
            "X-User-Email": "rohit@flowgrid.internal",
            "X-User-Role": "PLANNER"
        }

        # 1. Test POST /api/v1/imports/audit
        audit_payload = {
            "file_name": "inventory_batches.csv",
            "target_entity": "batches",
            "total_rows": 100,
            "rows_accepted": 97,
            "rows_rejected": 3,
            "error_rate_pct": 3.0,
            "committed": True,
            "sha256": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "errors_sample": [{"row": 14, "field": "expiryDate", "message": "invalid date format"}]
        }
        res = client.post("/api/v1/imports/audit", json=audit_payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["file_name"] == "inventory_batches.csv"
        assert data["verdict"] == "PARTIALLY_COMMITTED_UNDER_5PCT"
        assert data["data_quality_score"] == 0.97
        assert "Priya & Rohit" in data["executive_summary"]
        assert len(data["anomaly_root_causes"]) >= 1

        # 2. Test GET /api/v1/imports/schemas
        schemas_res = client.get("/api/v1/imports/schemas", headers=headers)
        assert schemas_res.status_code == 200
        schemas_data = schemas_res.json()
        assert schemas_data["threshold_pct"] == 5.0
        assert len(schemas_data["supported_entities"]) >= 4
    finally:
        OllamaService.set_mock_generator(None)


def test_chatbot_document_import_audit():
    def mock_gen(payload: Dict[str, Any]) -> str:
        return json.dumps({
            "verdict": "PARTIALLY_COMMITTED_UNDER_5PCT",
            "data_quality_score": 0.97,
            "executive_summary": "Priya & Rohit: 97 valid rows committed.",
            "rule_compliance_narrative": "3% error rate satisfies FR-02 threshold.",
            "anomaly_root_causes": ["Row 8: perishable missing expiry date"],
            "operational_risk_assessment": "Batch inventory safe for replenishment.",
            "remediation_steps": ["Review rejected rows."]
        })

    OllamaService.set_mock_generator(mock_gen)
    try:
        client = TestClient(app)
        chat_req = {
            "message": "Audit master data import file inventory_batches.csv under 5% rule for Priya & Rohit",
            "resources": {
                "latestImport": {
                    "fileName": "inventory_batches.csv",
                    "totalRows": 100,
                    "rowsAccepted": 97,
                    "rowsRejected": 3,
                    "errorRatePct": 3.0,
                    "committed": True,
                    "sha256": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                    "errors": [{"row": 8, "field": "expiryDate", "message": "perishable missing expiry date"}]
                }
            }
        }
        res = client.post("/api/v1/chat", json=chat_req)
        assert res.status_code == 200
        data = res.json()
        assert data["intent"] == "import_document_audit"
        assert any(t["tool_name"] == "audit_uploaded_master_data_document" for t in data["tools_executed"])
        assert "Priya & Rohit" in data["answer"] or "FR-02" in data["answer"]
    finally:
        OllamaService.set_mock_generator(None)
