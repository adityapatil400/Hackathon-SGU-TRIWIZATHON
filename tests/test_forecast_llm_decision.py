import json
from typing import Dict, Any
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.ai import ForecastDecisionRequest
from app.services.ollama_service import OllamaService


def test_ollama_audit_and_decide_forecast_fallback():
    # Force fallback by mocking generator returning None
    OllamaService.set_mock_generator(lambda payload: "INVALID_JSON_TRIGGERING_FALLBACK")
    try:
        req = ForecastDecisionRequest(
            store_code="RET-GAN",
            store_name="Ganesh Kirana",
            store_city="Kolhapur",
            store_tier=1,
            sku="SKU-ATT-05",
            product_name="Aashirvaad Shudh Chakki Atta 5kg",
            category="Staples & Grains",
            unit_cost=195.0,
            unit_price=240.0,
            case_size=12,
            shelf_life_days=180,
            is_perishable=False,
            q10=18.0,
            q50=38.0,
            q80=46.0,
            q90=54.0,
            q95=62.0,
            baseline_moving_avg=35.0,
            method="HistGradientBoosting",
            stockout_corrected=True,
            wape=0.138,
            bias=0.01,
            last_week_actual=36.0,
            current_stock=10,
        )

        res = OllamaService.audit_and_decide_forecast(req)

        assert res.decision_id.startswith("DEC-")
        assert res.store_code == "RET-GAN"
        assert res.sku == "SKU-ATT-05"
        assert res.verdict in ("STOCKOUT_DEFENSE", "BUFFER_AUGMENTED", "APPROVE_REPLENISHMENT")
        assert res.recommended_units > 0
        assert res.recommended_units % 12 == 0  # Multiple of case size
        assert res.recommended_cases == res.recommended_units // 12
        assert res.stockout_risk_level in ("LOW", "MEDIUM", "HIGH")
        assert res.waste_spoilage_risk_level in ("LOW", "MEDIUM", "HIGH")
        assert res.confidence_score >= 0.70
        assert "Aashirvaad" in res.natural_language_explanation or "SKU-ATT-05" in res.natural_language_explanation
        assert len(res.key_decision_factors) >= 3
        assert res.is_fallback is True
    finally:
        OllamaService.set_mock_generator(None)


def test_ollama_audit_and_decide_forecast_mock():
    def mock_gen(payload: Dict[str, Any]) -> str:
        return json.dumps({
            "verdict": "BUFFER_AUGMENTED",
            "recommended_units": 48,
            "recommended_cases": 4,
            "recommended_safety_buffer_pct": 15.0,
            "stockout_risk_level": "LOW",
            "waste_spoilage_risk_level": "LOW",
            "confidence_score": 0.96,
            "natural_language_explanation": "Strong festival uplift in Kolhapur warrants a 15% safety buffer above median demand.",
            "quantile_spread_analysis": "Q95 surge of 62 units shows significant peak potential during weekends.",
            "stockout_correction_impact": "Stockout correction added +8 units to historical baseline.",
            "key_decision_factors": [
                "High weekend footfall at Ganesh Kirana",
                "Non-perishable 180-day shelf life allows safe buffering",
                "4 cases (48 units) optimal for delivery batch size"
            ]
        })

    OllamaService.set_mock_generator(mock_gen)
    try:
        req = ForecastDecisionRequest(
            store_code="RET-GAN",
            sku="SKU-ATT-05",
            case_size=12,
            q10=18.0,
            q50=38.0,
            q90=54.0,
        )
        res = OllamaService.audit_and_decide_forecast(req)
        assert res.is_fallback is False
        assert res.verdict == "BUFFER_AUGMENTED"
        assert res.recommended_units == 48
        assert res.recommended_cases == 4
        assert res.confidence_score == 0.96
        assert "festival uplift" in res.natural_language_explanation
    finally:
        OllamaService.set_mock_generator(None)


def test_forecast_decision_endpoints():
    def mock_gen(payload: Dict[str, Any]) -> str:
        return json.dumps({
            "verdict": "APPROVE_REPLENISHMENT",
            "recommended_units": 64,
            "recommended_cases": 4,
            "recommended_safety_buffer_pct": 5.0,
            "stockout_risk_level": "LOW",
            "waste_spoilage_risk_level": "LOW",
            "confidence_score": 0.94,
            "natural_language_explanation": "Steady replenishment demand for edible oil corridor.",
            "quantile_spread_analysis": "Narrow quantile spread reflects steady consumption.",
            "stockout_correction_impact": "No stockout distortion detected.",
            "key_decision_factors": ["Steady consumption", "4 full cases"]
        })

    OllamaService.set_mock_generator(mock_gen)
    try:
        client = TestClient(app)
        headers = {
            "X-User-Email": "rohit@flowgrid.internal",
            "X-User-Role": "PLANNER"
        }

        payload = {
            "store_code": "RET-DMA",
            "store_name": "D-Mart Kolhapur",
            "sku": "SKU-OIL-01",
            "product_name": "Fortune Sunlite Refined Sunflower Oil 1L",
            "category": "Edible Oils",
            "case_size": 16,
            "q10": 30.0,
            "q50": 65.0,
            "q90": 85.0,
            "q95": 96.0,
            "stockout_corrected": False,
            "current_stock": 20
        }

        # Test single decision endpoint
        res = client.post("/api/v1/forecasts/decision", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["store_code"] == "RET-DMA"
        assert data["sku"] == "SKU-OIL-01"
        assert data["recommended_units"] % 16 == 0
        assert data["recommended_cases"] == data["recommended_units"] // 16
        assert len(data["key_decision_factors"]) >= 2

        # Test batch decision endpoint
        batch_payload = {
            "items": [payload, {**payload, "sku": "SKU-RIC-05", "case_size": 8, "q50": 40.0, "q90": 55.0, "q10": 20.0}]
        }
        batch_res = client.post("/api/v1/forecasts/batch-decision", json=batch_payload, headers=headers)
        assert batch_res.status_code == 200
        batch_data = batch_res.json()
        assert batch_data["total_evaluated"] == 2
        assert len(batch_data["decisions"]) == 2
    finally:
        OllamaService.set_mock_generator(None)


def test_chatbot_forecast_decision_audit():
    def mock_gen(payload: Dict[str, Any]) -> str:
        return json.dumps({
            "verdict": "BUFFER_AUGMENTED",
            "recommended_units": 48,
            "recommended_cases": 4,
            "recommended_safety_buffer_pct": 15.0,
            "stockout_risk_level": "LOW",
            "waste_spoilage_risk_level": "LOW",
            "confidence_score": 0.95,
            "natural_language_explanation": "Strong weekend demand predicted for Aashirvaad Atta.",
            "quantile_spread_analysis": "Q95 peak of 62 units reflects weekend surge.",
            "stockout_correction_impact": "Stockout correction prevented under-ordering.",
            "key_decision_factors": ["High demand", "15% buffer", "4 full cases"]
        })

    OllamaService.set_mock_generator(mock_gen)
    try:
        client = TestClient(app)
        chat_req = {
            "message": "Audit demand forecast decision for Aashirvaad Atta at Ganesh Kirana",
            "resources": {
                "forecasts": [
                    {
                        "retailerId": "RET-GAN",
                        "sku": "SKU-ATT-05",
                        "q10": 18,
                        "q50": 38,
                        "q80": 46,
                        "q90": 54,
                        "q95": 62,
                        "method": "HistGradientBoosting",
                        "stockoutCorrected": True,
                        "wape": 0.138
                    }
                ]
            }
        }
        res = client.post("/api/v1/chat", json=chat_req)
        assert res.status_code == 200
        data = res.json()
        assert data["intent"] == "forecast_decision_audit"
        assert any(t["tool_name"] == "audit_demand_prediction_decision" for t in data["tools_executed"])
        assert "AI Prediction Decision & Accessibility Audit" in data["answer"]
        assert "BUFFER_AUGMENTED" in data["answer"] or "Units" in data["answer"]
    finally:
        OllamaService.set_mock_generator(None)

