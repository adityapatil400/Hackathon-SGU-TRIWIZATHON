"""
Standalone Unit and Integration Tests for HETVAYA Product AI Assistant.
Verifies all 8 query intents, schema validity, and API endpoints.

Run:
    pytest backend/test_standalone_chat.py -v
"""

import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient

from schemas import ChatQueryRequest, ChatQueryContext, ChatQueryResponse
from chat_service import ProductChatIntelligenceService
from standalone_server import app


@pytest.fixture
def client():
    return TestClient(app)


def test_service_out_of_stock_query():
    req = ChatQueryRequest(message="Which products are currently out of stock?")
    res = ProductChatIntelligenceService.process_chat_query(req)
    assert isinstance(res, ChatQueryResponse)
    assert res.intent == "out_of_stock"
    assert len(res.suggested_followups) > 0
    assert "stock" in res.answer.lower() or "inventory" in res.answer.lower()


def test_service_expiry_risk_query():
    req = ChatQueryRequest(message="Which products are at risk of expiry?")
    res = ProductChatIntelligenceService.process_chat_query(req)
    assert res.intent == "expiry_risk"
    assert len(res.sources) > 0
    assert any("expiry" in s.source_type.lower() for s in res.sources)
    assert "amul" in res.answer.lower() or "batch" in res.answer.lower() or "risk" in res.answer.lower()


def test_service_stock_availability_for_sku():
    req = ChatQueryRequest(message="What is the available inventory for Aashirvaad Atta?")
    res = ProductChatIntelligenceService.process_chat_query(req)
    assert res.intent == "stock_availability"
    assert len(res.sources) > 0
    assert "SKU-ATT-05" in str(res.sources[0].product_sku)
    assert "units" in res.answer.lower() or "3360" in res.answer


def test_service_warehouse_sourcing_query():
    req = ChatQueryRequest(
        message="Which warehouse can supply this product?",
        context=ChatQueryContext(product_sku="SKU-OIL-01"),
    )
    res = ProductChatIntelligenceService.process_chat_query(req)
    assert res.intent == "warehouse_sourcing"
    assert len(res.sources) > 0
    assert "warehouse" in res.answer.lower()


def test_service_allocation_explanation():
    req = ChatQueryRequest(
        message="Why was this product allocated to this retailer?",
        context=ChatQueryContext(
            product_sku="SKU-ATT-05",
            retailer_id="RET-GAN",
        ),
    )
    res = ProductChatIntelligenceService.process_chat_query(req)
    assert res.intent == "allocation_explanation"
    assert len(res.sources) > 0


def test_service_freight_cost_query():
    req = ChatQueryRequest(message="What is the estimated freight cost from Pune to D-Mart?")
    res = ProductChatIntelligenceService.process_chat_query(req)
    assert res.intent == "freight_cost"
    assert len(res.sources) > 0
    assert "cost" in res.answer.lower() or "₹" in res.answer or "rs" in res.answer.lower()


def test_service_honest_missing_information():
    req = ChatQueryRequest(message="What is the stock quantity for SKU-NON-EXISTENT-9999?")
    res = ProductChatIntelligenceService.process_chat_query(req)
    assert res.missing_information is not None or "not found" in res.answer.lower() or "missing" in res.answer.lower()


def test_service_multilingual_hindi():
    req = ChatQueryRequest(
        message="Which products are out of stock?",
        language="hi",
    )
    res = ProductChatIntelligenceService.process_chat_query(req)
    assert res.intent == "out_of_stock"
    assert len(res.answer) > 0


def test_api_chat_endpoint(client):
    payload = {"message": "Which products are at risk of expiry?"}
    resp = client.post("/chat", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "expiry_risk"
    assert len(data["sources"]) > 0


def test_api_health_endpoint(client):
    resp = client.get("/api/ai/chat/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "HEALTHY"
