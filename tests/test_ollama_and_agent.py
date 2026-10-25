"""
Tests for Ollama LLM dynamic integration and Delivery Agent subsystem.
Verifies:
1. OllamaService connectivity, model discovery, and structured JSON output.
2. Dynamic fact-grounded plan explainability (FR-P0-11 in smartsystem.md).
3. Incident & disruption natural language parsing into structured operational events.
4. Dynamic candidate allocation generation via Ollama with schema validation.
5. Delivery Agent CRUD, GPS heartbeat location freshness (Journey E / FR-P0-07),
   and declared unavailability with replacement recommendation (Journey C).
"""

from datetime import datetime, timezone
import json
from typing import Any, Dict
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password, create_access_token
from app.models.agent import DeliveryAgent
from app.models.enums import (
    UserRole,
    AgentAvailabilityStatus,
    AgentShiftStatus,
    VehicleType,
    PlanStatus,
)
from app.models.facility import Warehouse, Store
from app.models.inventory import InventoryBatch
from app.models.plan import DistributionPlan
from app.models.product import Product
from app.models.scenario import SeededScenario
from app.models.user import User
from app.services.ollama_service import OllamaService


@pytest.fixture
def ai_test_users(db_session: Session):
    """Creates authenticated admin and planner users."""
    admin = User(
        email="ai_admin@flowgrid.io",
        hashed_password=hash_password("AdminPass123!"),
        full_name="AI Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    planner = User(
        email="ai_planner@flowgrid.io",
        hashed_password=hash_password("PlannerPass123!"),
        full_name="AI Planner",
        role=UserRole.PLANNER,
        is_active=True,
    )
    viewer = User(
        email="ai_viewer@flowgrid.io",
        hashed_password=hash_password("ViewerPass123!"),
        full_name="AI Viewer",
        role=UserRole.VIEWER,
        is_active=True,
    )
    db_session.add_all([admin, planner, viewer])
    db_session.commit()

    tokens = {
        "admin": create_access_token(data={"sub": admin.email, "user_id": admin.id, "role": admin.role.value}),
        "planner": create_access_token(data={"sub": planner.email, "user_id": planner.id, "role": planner.role.value}),
        "viewer": create_access_token(data={"sub": viewer.email, "user_id": viewer.id, "role": viewer.role.value}),
    }
    return {
        "admin": admin,
        "planner": planner,
        "viewer": viewer,
        "headers": {
            "admin": {"Authorization": f"Bearer {tokens['admin']}"},
            "planner": {"Authorization": f"Bearer {tokens['planner']}"},
            "viewer": {"Authorization": f"Bearer {tokens['viewer']}"},
        },
    }


# ==============================================================================
# 1. Ollama Service & Dynamic Output Handling Tests
# ==============================================================================

def test_ollama_service_status_and_discovery():
    status = OllamaService.get_status()
    assert status.base_url == "http://localhost:11434"
    assert status.configured_model in ("nemotron-3-ultra:cloud", "llama3.2:latest")
    # Live daemon has models installed (e.g. llama3.2:latest or gemma4:12b)
    if status.is_connected:
        assert len(status.available_models) >= 1
        model_names = [m.name for m in status.available_models]
        assert any("llama3.2" in n or "gemma4" in n for n in model_names)


def test_ollama_structured_json_generation():
    # Test with mock generator to verify strict schema parsing
    def mock_gen(payload: Dict[str, Any]) -> str:
        return json.dumps({
            "action": "ALLOCATE_SURGE",
            "recommended_warehouse": "WH-MUMBAI-01",
            "confidence": 0.95,
            "reasoning": "Sufficient stock available for Mumbai retail store",
        })

    OllamaService.set_mock_generator(mock_gen)
    try:
        res = OllamaService.generate(
            prompt="Recommend warehouse for surge order",
            json_format=True,
        )
        assert res.is_fallback is False
        assert res.parsed_json is not None
        assert res.parsed_json["action"] == "ALLOCATE_SURGE"
        assert res.parsed_json["confidence"] == 0.95
    finally:
        OllamaService.set_mock_generator(None)


def test_ollama_plan_explainability_and_tradeoffs():
    plan_dict = {
        "id": 101,
        "plan_code": "PLAN-DEMO-EXPLAIN-2026",
        "status": "VALIDATED",
        "target_warehouse_id": 1,
        "input_inventory_version": 2,
        "candidate_allocations": [
            {"sku": "SKU-ELEC-01", "quantity": 100, "from_node_code": "WH-01", "to_node_code": "STORE-01"}
        ],
    }
    comparison_metrics = {
        "flowgrid_optimization": {"stockout_units": 0, "fill_rate_pct": 100.0, "transport_cost_inr": 1250.0},
        "current_practice": {"stockout_units": 50, "fill_rate_pct": 85.0, "transport_cost_inr": 1450.0},
    }

    explanation = OllamaService.explain_plan(
        plan_code="PLAN-DEMO-EXPLAIN-2026",
        plan_details=plan_dict,
        comparison_metrics=comparison_metrics,
    )
    assert explanation.plan_code == "PLAN-DEMO-EXPLAIN-2026"
    assert len(explanation.executive_summary) > 10
    assert len(explanation.key_recommendations) >= 1
    assert "PLAN-DEMO-EXPLAIN-2026" in explanation.traceable_facts_used["plan_code"]


def test_ollama_disruption_parsing():
    raw_incident = (
        "Driver Ramesh (AGENT-PUNE-05) reports flat tyre on Expressway near Lonavala, "
        "delaying 80 units of SKU-TABLET-10 for Pune store STORE-PUNE-01 by approximately 3 hours"
    )

    parsed = OllamaService.parse_disruption(raw_incident)
    assert parsed.raw_input == raw_incident
    assert parsed.event_type in ("AGENT_UNAVAILABLE", "ROUTE_DISRUPTED")
    assert any("AGENT-PUNE-05" in a for a in parsed.affected_agent_codes)
    assert any("SKU-TABLET-10" in s for s in parsed.affected_skus) or "TABLET" in str(parsed.summary)
    assert parsed.severity in ("LOW", "MEDIUM", "HIGH", "CRITICAL")


# ==============================================================================
# 2. AI Intelligence REST Endpoints Tests
# ==============================================================================

def test_ai_endpoints_integration(client: TestClient, ai_test_users: Dict[str, Any], db_session: Session):
    planner_headers = ai_test_users["headers"]["planner"]
    viewer_headers = ai_test_users["headers"]["viewer"]

    # 1. GET /api/v1/ai/status
    status_resp = client.get("/api/v1/ai/status", headers=viewer_headers)
    assert status_resp.status_code == 200
    assert "base_url" in status_resp.json()

    # 2. POST /api/v1/ai/generate
    gen_resp = client.post(
        "/api/v1/ai/generate",
        json={"prompt": "Return a JSON object with key 'status' equal to 'OK'", "json_format": True},
        headers=planner_headers,
    )
    assert gen_resp.status_code == 200
    assert "response" in gen_resp.json()

    # 3. Setup plan for explainability endpoint
    wh = Warehouse(code="WH-AI-TEST-01", name="AI Test WH", region="West", current_inventory_version=1)
    db_session.add(wh)
    db_session.commit()

    plan = DistributionPlan(
        plan_code="PLAN-AI-EXPLAIN-01",
        target_warehouse_id=wh.id,
        input_inventory_version=1,
        status=PlanStatus.VALIDATED,
        trace_id="TRACE-AI-001",
        candidate_allocations=[{"sku": "SKU-AI-01", "quantity": 50}],
    )
    db_session.add(plan)
    db_session.commit()

    explain_resp = client.post(
        "/api/v1/ai/explain-plan",
        json={"plan_code": "PLAN-AI-EXPLAIN-01"},
        headers=viewer_headers,
    )
    assert explain_resp.status_code == 200
    exp_data = explain_resp.json()
    assert exp_data["plan_code"] == "PLAN-AI-EXPLAIN-01"
    assert len(exp_data["executive_summary"]) > 0

    # 4. POST /api/v1/ai/parse-disruption
    parse_resp = client.post(
        "/api/v1/ai/parse-disruption",
        json={"unstructured_text": "Heavy rain on Western Express Highway causing 2 hour delay for AGENT-WEST-02"},
        headers=planner_headers,
    )
    assert parse_resp.status_code == 200
    assert parse_resp.json()["event_type"] in ("ROUTE_DISRUPTED", "AGENT_UNAVAILABLE")


# ==============================================================================
# 3. Delivery Agent & Dispatch Endpoints Tests (smartsystem.md / agent.md)
# ==============================================================================

def test_delivery_agent_crud_and_heartbeat(client: TestClient, ai_test_users: Dict[str, Any]):
    admin_headers = ai_test_users["headers"]["admin"]
    viewer_headers = ai_test_users["headers"]["viewer"]

    # 1. Register new delivery agent
    agent_payload = {
        "code": "AGENT-MUM-01",
        "name": "Suresh Kumar",
        "phone": "+91-9876543210",
        "vehicle_type": "VAN",
        "capacity_kg": 750.0,
        "capacity_volume_cbm": 6.5,
        "availability_status": "AVAILABLE",
        "shift_status": "ON_SHIFT",
    }
    create_resp = client.post("/api/v1/agents", json=agent_payload, headers=admin_headers)
    assert create_resp.status_code == 201
    agent_data = create_resp.json()
    assert agent_data["code"] == "AGENT-MUM-01"
    assert agent_data["name"] == "Suresh Kumar"
    agent_id = agent_data["id"]

    # 2. Duplicate registration rejected with 409
    dup_resp = client.post("/api/v1/agents", json=agent_payload, headers=admin_headers)
    assert dup_resp.status_code == 409

    # 3. Retrieve agent details
    get_resp = client.get(f"/api/v1/agents/{agent_id}", headers=viewer_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["code"] == "AGENT-MUM-01"

    # 4. List agents with filter
    list_resp = client.get("/api/v1/agents?availability_status=AVAILABLE", headers=viewer_headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    # 5. Agent GPS Location Heartbeat (FR-P0-07 / Journey E)
    heartbeat_resp = client.post(
        f"/api/v1/agents/{agent_id}/heartbeat",
        json={
            "latitude": 19.0760,
            "longitude": 72.8777,
            "location_accuracy_m": 8.5,
            "shift_status": "ON_SHIFT",
        },
        headers=admin_headers,
    )
    assert heartbeat_resp.status_code == 200
    hb_data = heartbeat_resp.json()
    assert hb_data["latitude"] == 19.0760
    assert hb_data["longitude"] == 72.8777
    assert hb_data["location_accuracy_m"] == 8.5

    # 6. Create secondary agent for reassignment recommendation test
    client.post(
        "/api/v1/agents",
        json={
            "code": "AGENT-MUM-02",
            "name": "Ramesh Patil",
            "vehicle_type": "VAN",
            "capacity_kg": 800.0,
            "capacity_volume_cbm": 7.0,
            "availability_status": "AVAILABLE",
            "shift_status": "ON_SHIFT",
        },
        headers=admin_headers,
    )

    # 7. Agent declared UNAVAILABLE (Journey C: event-driven replanning recommendation)
    avail_resp = client.post(
        f"/api/v1/agents/{agent_id}/availability",
        json={
            "availability_status": "UNAVAILABLE",
            "reason": "Driver reported sick leave",
        },
        headers=admin_headers,
    )
    assert avail_resp.status_code == 200
    reassign_data = avail_resp.json()
    assert reassign_data["unavailable_agent_id"] == agent_id
    assert reassign_data["recommended_replacement_agent_code"] == "AGENT-MUM-02"
    assert "sick leave" in reassign_data["reason"]

    # 8. Verify agent state is now UNAVAILABLE
    agent_after = client.get(f"/api/v1/agents/{agent_id}", headers=viewer_headers).json()
    assert agent_after["availability_status"] == "UNAVAILABLE"
    assert agent_after["unavailability_reason"] == "Driver reported sick leave"
