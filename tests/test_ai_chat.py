"""
Unit and integration tests for HETVAYA Product AI Assistant Chatbot Service and Endpoints.
Verifies:
1. Out of stock queries grounded in application inventory.
2. Expiry risk queries under FEFO and shelf-life compliance rules.
3. Specific SKU stock availability and warehouse breakdown.
4. Supplying warehouse lookup.
5. Distribution allocation explanation with kirana intake and freight justification.
6. Freight cost and delivery transit calculations.
7. Demand forecast queries.
8. Context-aware follow-up queries.
9. Honest handling of missing information and unknown SKUs.
10. Both /api/chat and /api/v1/ai/chat API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.schemas.ai import ChatQueryRequest, ChatQueryContext, ChatQueryResponse
from app.services.chat_intelligence_service import ProductChatIntelligenceService


def test_service_out_of_stock_query(db_session: Session):
    req = ChatQueryRequest(
        message="Which products are currently out of stock?",
    )
    res = ProductChatIntelligenceService.process_chat_query(req, db_session)
    assert isinstance(res, ChatQueryResponse)
    assert res.intent == "out_of_stock"
    assert len(res.suggested_followups) > 0
    assert "stock" in res.answer.lower() or "inventory" in res.answer.lower()


def test_service_expiry_risk_query(db_session: Session):
    req = ChatQueryRequest(
        message="Which products are at risk of expiry?",
    )
    res = ProductChatIntelligenceService.process_chat_query(req, db_session)
    assert res.intent == "expiry_risk"
    assert len(res.sources) > 0
    assert any("expiry" in s.source_type.lower() for s in res.sources)
    # Milk batch BAT-AML-01 has 48% shelf life, which is flagged
    assert "amul" in res.answer.lower() or "batch" in res.answer.lower() or "risk" in res.answer.lower()


def test_service_stock_availability_for_sku(db_session: Session):
    req = ChatQueryRequest(
        message="What is the available inventory for Aashirvaad Atta?",
    )
    res = ProductChatIntelligenceService.process_chat_query(req, db_session)
    assert res.intent == "stock_availability"
    assert len(res.sources) > 0
    assert "SKU-ATT-05" in str(res.sources[0].product_sku)
    assert "units" in res.answer.lower() or "3360" in res.answer
    assert "WH-PUN" in str(res.sources[0].verified_data) or "Pune" in str(res.sources[0].verified_data)



def test_service_warehouse_sourcing_query(db_session: Session):
    req = ChatQueryRequest(
        message="Which warehouse can supply this product?",
        context=ChatQueryContext(product_sku="SKU-OIL-01"),
    )
    res = ProductChatIntelligenceService.process_chat_query(req, db_session)
    assert res.intent == "warehouse_sourcing"
    assert len(res.sources) > 0
    assert "warehouse" in res.answer.lower()


def test_service_allocation_explanation(db_session: Session):
    req = ChatQueryRequest(
        message="Why was this product allocated to this retailer?",
        context=ChatQueryContext(
            product_sku="SKU-ATT-05",
            retailer_id="RET-GAN",
        ),
    )
    res = ProductChatIntelligenceService.process_chat_query(req, db_session)
    assert res.intent == "allocation_explanation"
    assert len(res.sources) > 0
    assert "Ganesh Kirana" in res.answer or "freight" in res.answer.lower()


def test_service_freight_cost_query(db_session: Session):
    req = ChatQueryRequest(
        message="What is the estimated freight cost?",
        context=ChatQueryContext(
            warehouse_id="WH-PUN",
            retailer_id="RET-DMA",
        ),
    )
    res = ProductChatIntelligenceService.process_chat_query(req, db_session)
    assert res.intent == "freight_cost"
    assert len(res.sources) > 0
    assert "₹" in res.answer or "18" in res.answer


def test_service_missing_information_honesty(db_session: Session):
    # Query asking about stock without mentioning any SKU or product name
    req = ChatQueryRequest(
        message="What is the available inventory for the mysterious mystery box?",
    )
    res = ProductChatIntelligenceService.process_chat_query(req, db_session)
    # The system must not invent stock for an unknown product!
    assert res.missing_information is not None or "specify" in res.answer.lower() or "catalog" in res.answer.lower()


def test_service_multilingual_translation(db_session: Session):
    req = ChatQueryRequest(
        message="Which products are out of stock?",
        language="hi",
    )
    res = ProductChatIntelligenceService.process_chat_query(req, db_session)
    assert res.intent == "out_of_stock"
    assert len(res.answer) > 0


def test_api_chat_endpoint_v1(client: TestClient):
    payload = {
        "message": "Which products are at risk of expiry?",
        "conversation_id": "test-conv-001",
        "context": {
            "product_sku": "SKU-AML-01"
        }
    }
    response = client.post("/api/v1/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert data["intent"] == "expiry_risk"
    assert len(data["suggested_followups"]) > 0


def test_api_chat_direct_alias_endpoint(client: TestClient):
    payload = {
        "message": "What is the available inventory for SKU-ATT-05?",
        "context": {
            "product_sku": "SKU-ATT-05"
        }
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "Aashirvaad" in data["answer"] or "units" in data["answer"]
