"""
Tests for HETVAYA Fuel Price Service & Agentic Chatbot Endpoints.
Verifies:
1. Strict Rule-Based Fuel Surcharge Calculation (PRD baseline: ₹90/L, sensitivity: 0.45).
2. Corridor freight adjustments across Maharashtra corridors.
3. Live Google RSS News API & OMC Benchmark fallback.
4. FastAPI endpoints: /api/v1/chat, /api/v1/chat/fuel-prices, /api/v1/chat/fuel-impact, /api/v1/chat/model-info.
5. Presence and execution of agentic tool execution logs and structured cards.
"""

import pytest
from fastapi.testclient import TestClient
from app.services.fuel_service import FuelPriceService, REGIONAL_FUEL_INDEX
from hetvaya_chatbot_package.backend.chat_service import ProductChatIntelligenceService
from hetvaya_chatbot_package.backend.schemas import ChatQueryRequest, ChatQueryContext


def test_strict_rule_based_surcharge_formula():
    """Validates the strict rule-based formula: max(0, ((Diesel - 90)/90) * 0.45 * 100)."""
    # 1. At baseline rate (₹90.00)
    base_res = FuelPriceService.calculate_strict_rule_surcharge(current_diesel=90.00)
    assert base_res["surcharge_percentage"] == 0.0
    assert base_res["freight_cost_multiplier"] == 1.0
    assert base_res["status"] == "BASELINE_RATE"

    # 2. Below baseline rate (₹88.50) -> Surcharge is clamped to 0
    below_res = FuelPriceService.calculate_strict_rule_surcharge(current_diesel=88.50)
    assert below_res["surcharge_percentage"] == 0.0
    assert below_res["freight_cost_multiplier"] == 1.0

    # 3. Standard Maharashtra corridor diesel (₹92.85)
    # Delta = 2.85; (2.85 / 90.0) * 0.45 * 100 = 1.425 -> 1.43%
    maha_res = FuelPriceService.calculate_strict_rule_surcharge(current_diesel=92.85)
    assert maha_res["surcharge_percentage"] == 1.43
    assert maha_res["freight_cost_multiplier"] == 1.0143
    assert maha_res["status"] == "SURCHARGE_APPLIED"

    # 4. Elevated rate (₹94.00)
    # Delta = 4.0; (4.0 / 90.0) * 0.45 * 100 = 2.0%
    high_res = FuelPriceService.calculate_strict_rule_surcharge(current_diesel=94.00)
    assert high_res["surcharge_percentage"] == 2.0
    assert high_res["freight_cost_multiplier"] == 1.02


def test_corridor_freight_impact_calculation():
    """Validates freight rate adjustments per case across verified corridors."""
    # Pune to Ganesh Kirana Kolhapur (COR-PUN-GAN): Base ₹52.00/case
    impact = FuelPriceService.calculate_route_freight_impact(
        corridor_id="COR-PUN-GAN",
        current_diesel=92.85,
        cases=100,
    )
    assert impact["corridor"]["corridor_id"] == "COR-PUN-GAN"
    assert impact["base_freight_per_case_inr"] == 52.0
    assert impact["adjusted_freight_per_case_inr"] == 52.74
    assert impact["incremental_cost_per_case_inr"] == 0.74
    assert impact["total_base_freight_inr"] == 5200.0
    assert impact["total_adjusted_freight_inr"] == 5274.0
    assert impact["total_fuel_surcharge_inr"] == 74.0


def test_regional_fuel_index_integrity():
    """Validates daily OMC benchmark index coverage across Indian key logistics states."""
    states = ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat", "Uttar Pradesh", "West Bengal"]
    for st in states:
        assert st in REGIONAL_FUEL_INDEX
        data = REGIONAL_FUEL_INDEX[st]
        assert data["diesel_inr"] >= 80.0
        assert data["petrol_inr"] >= 90.0


def test_chat_endpoints_rest(client: TestClient):
    """Validates REST endpoints for fuel prices, corridors, model info, and chat query."""
    # 1. GET /api/v1/chat/fuel-prices
    resp = client.get("/api/v1/chat/fuel-prices?state=Maharashtra&use_live_api=false")
    assert resp.status_code == 200
    fuel_data = resp.json()
    assert fuel_data["selected_state"] == "Maharashtra"
    assert fuel_data["base_benchmark_inr"] == 90.0
    assert fuel_data["surcharge_analysis"]["surcharge_percentage"] > 0

    # 2. POST /api/v1/chat/fuel-impact
    impact_resp = client.post(
        "/api/v1/chat/fuel-impact",
        json={"corridor_id": "COR-PUN-DMA", "current_diesel": 92.85, "cases": 50},
    )
    assert impact_resp.status_code == 200
    impact_data = impact_resp.json()
    assert impact_data["base_freight_per_case_inr"] == 18.0
    assert impact_data["cases_dispatched"] == 50

    # 3. GET /api/v1/chat/model-info
    info_resp = client.get("/api/v1/chat/model-info")
    assert info_resp.status_code == 200
    info_data = info_resp.json()
    assert info_data["active_model"] == "nemotron-3-ultra:cloud"
    assert len(info_data["registered_tools"]) >= 4

    # 4. POST /api/v1/chat (Fuel Query)
    chat_resp = client.post(
        "/api/v1/chat",
        json={"message": "What is the current diesel price and fuel surcharge in Maharashtra?", "language": "en"},
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert chat_data["intent"] == "fuel_prices"
    assert chat_data["active_model"] == "nemotron-3-ultra:cloud"
    assert len(chat_data["tools_executed"]) >= 1
    assert any("fuel" in t["tool_name"] for t in chat_data["tools_executed"])
    assert "90.00" in chat_data["answer"]

    # 5. POST /api/v1/chat (Expiry / FEFO Query)
    chat_fefo = client.post(
        "/api/v1/chat",
        json={"message": "Which products are at risk of expiry?", "language": "en"},
    )
    assert chat_fefo.status_code == 200
    fefo_data = chat_fefo.json()
    assert fefo_data["intent"] == "expiry_risk"
    assert len(fefo_data["tools_executed"]) >= 1
