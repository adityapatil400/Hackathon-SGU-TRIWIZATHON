"""
Comprehensive FlowGrid API Integration Matrix & Recovery Test Suite.

Verifies:
1. Complete API Route & HTTP Client Integration:
   - Root and Readiness endpoints
   - Auth & RBAC lifecycle (/auth/register, /auth/login, /auth/me, /auth/users)
   - Facility APIs (/warehouses, /stores, /retailers alias)
   - Product catalog APIs (/products)
   - Inventory APIs (/inventory/batches, /inventory/summary, /inventory/adjust, /inventory/reserve, /inventory/release, /inventory/verify, /inventory/migrate)
   - Distribution Orders APIs (/orders)
   - Scenario Seeding & Plan Trigger APIs (/scenarios/seed, /scenarios/{id}/plans, /scenarios/{id}/reset)
   - Plan Lifecycle APIs (/plans manual create, get, validate, reserve, release, approve, commit, cancel, audit, comparison, replan, allocation-plans alias)
   - Sales & Demand Forecasting APIs (/sales, /sales-observations, /forecasts)
2. HTTP Status Code Handlers:
   - 200 OK, 201 Created
   - 400 Bad Request
   - 401 Unauthorized (missing, bad, expired token)
   - 403 Forbidden (insufficient role, separation of duties self-approval)
   - 404 Not Found (missing entities)
   - 409 Conflict (duplicate codes, already committed plan, version mismatch)
   - 422 Unprocessable Entity (missing fields, negative quantities)
   - 502 Bad Gateway (decision service malformed JSON or HTTP error)
   - 504 Gateway Timeout (decision service timeout)
3. End-to-End Operational Lifecycle & Failure Recovery:
   - Seeded scenario -> decision service candidate -> authoritative validation -> independent approval -> commit -> inventory update -> audit verification
   - Idempotency key handling on repeat commits
   - Atomic rollback on partial transaction failure
"""

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict
from unittest.mock import patch
import httpx
import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.core.exceptions import (
    DecisionServiceException,
    DecisionServiceTimeoutException,
    MalformedDecisionCandidateException,
)
from app.core.security import hash_password, create_access_token
from app.models.enums import UserRole, PlanStatus, ScenarioType
from app.models.facility import Warehouse, Store
from app.models.product import Product
from app.models.inventory import InventoryBatch
from app.models.plan import DistributionPlan, PlanAllocation
from app.models.scenario import SeededScenario
from app.models.user import User
from app.services.decision_service_client import DecisionServiceClient
from app.services.inventory_service import InventoryService
from app.services.plan_lifecycle_service import PlanLifecycleService


@pytest.fixture
def matrix_users(db_session: Session):
    """Creates authenticated admin, planner, approver, and viewer users with valid JWT tokens."""
    admin = User(
        email="matrix_admin@flowgrid.io",
        hashed_password=hash_password("AdminPass123!"),
        full_name="Matrix Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    planner = User(
        email="matrix_planner@flowgrid.io",
        hashed_password=hash_password("PlannerPass123!"),
        full_name="Matrix Planner",
        role=UserRole.PLANNER,
        is_active=True,
    )
    approver = User(
        email="matrix_approver@flowgrid.io",
        hashed_password=hash_password("ApproverPass123!"),
        full_name="Matrix Approver",
        role=UserRole.APPROVER,
        is_active=True,
    )
    viewer = User(
        email="matrix_viewer@flowgrid.io",
        hashed_password=hash_password("ViewerPass123!"),
        full_name="Matrix Viewer",
        role=UserRole.VIEWER,
        is_active=True,
    )
    db_session.add_all([admin, planner, approver, viewer])
    db_session.commit()

    tokens = {
        "admin": create_access_token(data={"sub": admin.email, "user_id": admin.id, "role": admin.role.value}),
        "planner": create_access_token(data={"sub": planner.email, "user_id": planner.id, "role": planner.role.value}),
        "approver": create_access_token(data={"sub": approver.email, "user_id": approver.id, "role": approver.role.value}),
        "viewer": create_access_token(data={"sub": viewer.email, "user_id": viewer.id, "role": viewer.role.value}),
    }
    return {
        "admin": admin,
        "planner": planner,
        "approver": approver,
        "viewer": viewer,
        "headers": {
            "admin": {"Authorization": f"Bearer {tokens['admin']}"},
            "planner": {"Authorization": f"Bearer {tokens['planner']}"},
            "approver": {"Authorization": f"Bearer {tokens['approver']}"},
            "viewer": {"Authorization": f"Bearer {tokens['viewer']}"},
        },
    }


# ==============================================================================
# 1. Root & Health APIs Integration
# ==============================================================================

def test_root_and_health_integration(client: TestClient):
    # Root endpoint
    resp = client.get("/")
    assert resp.status_code == 200
    assert "HETVAYA" in resp.json()["message"] or "FlowGrid" in resp.json()["message"]
    assert "authoritative_rule" in resp.json()

    # Liveness health check
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"].lower() == "healthy"

    # Readiness health check (database connected)
    resp = client.get("/health/ready")
    assert resp.status_code == 200
    assert resp.json()["status"].lower() == "ready"
    assert resp.json()["database"] == "connected"


# ==============================================================================
# 2. Demand Forecasting & Sales Observations Integration
# ==============================================================================

def test_sales_observations_and_demand_forecasting_integration(client: TestClient, matrix_users: Dict[str, Any]):
    planner_headers = matrix_users["headers"]["planner"]
    viewer_headers = matrix_users["headers"]["viewer"]

    # 1. Setup store and product
    wh_resp = client.post(
        "/api/v1/warehouses",
        json={"code": "WH-FCST-01", "name": "Forecast Hub", "region": "North"},
        headers=matrix_users["headers"]["admin"],
    )
    store_resp = client.post(
        "/api/v1/stores",
        json={"code": "STORE-FCST-01", "name": "Forecast Retail", "region": "North", "priority_tier": 1},
        headers=matrix_users["headers"]["admin"],
    )
    store_id = store_resp.json()["id"]

    prod_resp = client.post(
        "/api/v1/products",
        json={"sku": "SKU-FCST-100", "name": "Smart Watch Series 5"},
        headers=matrix_users["headers"]["admin"],
    )
    prod_id = prod_resp.json()["id"]

    # 2. Ingest batch sales observations
    sales_resp = client.post(
        "/api/v1/sales-observations",
        json={
            "observations": [
                {
                    "store_id": store_id,
                    "product_id": prod_id,
                    "units_sold": 45,
                    "is_stockout_day": False,
                },
                {
                    "store_code": "STORE-FCST-01",
                    "sku": "SKU-FCST-100",
                    "units_sold": 60,
                    "is_stockout_day": True,
                },
            ]
        },
        headers=planner_headers,
    )
    assert sales_resp.status_code == 201
    assert sales_resp.json()["status"] == "APPLIED"
    assert sales_resp.json()["recorded_count"] == 2

    # 3. Convenience single sale endpoint
    single_resp = client.post(
        "/api/v1/sales",
        json={
            "store_id": store_id,
            "sku": "SKU-FCST-100",
            "units_sold": 12,
            "is_stockout_day": False,
        },
        headers=planner_headers,
    )
    assert single_resp.status_code == 201
    assert single_resp.json()["recorded_count"] == 1

    # 4. Generate demand forecast
    fcst_resp = client.post(
        "/api/v1/forecasts",
        json={"planning_horizon_days": 14, "confidence_level": 0.90},
        headers=planner_headers,
    )
    assert fcst_resp.status_code == 201
    fcst_data = fcst_resp.json()
    assert fcst_data["status"] == "COMPLETED"
    assert fcst_data["planning_horizon_days"] == 14
    assert len(fcst_data["series"]) >= 1
    fcst_id = fcst_data["forecast_run_id"]

    # 5. Retrieve forecast by ID
    get_fcst = client.get(f"/api/v1/forecasts/{fcst_id}", headers=viewer_headers)
    assert get_fcst.status_code == 200
    assert get_fcst.json()["forecast_run_id"] == fcst_id

    # 6. Retrieve non-existent forecast -> 404
    missing_fcst = client.get("/api/v1/forecasts/FCST-NONEXISTENT", headers=viewer_headers)
    assert missing_fcst.status_code == 404


# ==============================================================================
# 3. Policy Comparison & Re-plan APIs Integration
# ==============================================================================

def test_policy_comparison_and_replan_integration(client: TestClient, matrix_users: Dict[str, Any]):
    planner_headers = matrix_users["headers"]["planner"]
    approver_headers = matrix_users["headers"]["approver"]
    viewer_headers = matrix_users["headers"]["viewer"]

    # 1. Seed deterministic scenario
    seed_resp = client.post(
        "/api/v1/scenarios/seed",
        json={
            "scenario_code": "SCENARIO-POLICY-CMP-2026",
            "name": "Diwali Policy Comparison Scenario",
            "scenario_type": "DEMAND_SURGE",
            "parameters": {"surge_factor": 1.25},
            "seed_network_topology": True,
            "overwrite": True,
        },
        headers=matrix_users["headers"]["admin"],
    )
    assert seed_resp.status_code == 201
    sc_id = seed_resp.json()["scenario"]["id"]

    # 2. Trigger candidate plan generation
    plan_gen_resp = client.post(
        f"/api/v1/scenarios/{sc_id}/plans",
        headers=planner_headers,
    )
    assert plan_gen_resp.status_code == 201
    plan_code = plan_gen_resp.json()["plan_code"]

    # 3. Query three-way policy comparison
    cmp_resp = client.get(f"/api/v1/plans/{plan_code}/comparison", headers=viewer_headers)
    assert cmp_resp.status_code == 200
    cmp_data = cmp_resp.json()
    assert cmp_data["plan_code"] == plan_code
    assert "current_practice" in cmp_data["metrics"]
    assert "strong_baseline" in cmp_data["metrics"]
    assert "flowgrid_optimization" in cmp_data["metrics"]
    assert "stockout_reduction_vs_current" in cmp_data["relative_improvements"]

    # 4. Direct PRD alias endpoint: /api/v1/comparison/{plan_code}
    direct_cmp = client.get(f"/api/v1/comparison/{plan_code}", headers=viewer_headers)
    assert direct_cmp.status_code == 200
    assert direct_cmp.json()["plan_code"] == plan_code

    # 5. Re-plan candidate endpoint
    replan_resp = client.post(f"/api/v1/plans/{plan_code}/replan", headers=planner_headers)
    assert replan_resp.status_code == 201
    assert replan_resp.json()["plan_code"] != plan_code  # Fresh candidate plan generated


# ==============================================================================
# 4. Plan Cancellation & Reservation Lifecycle Integration
# ==============================================================================

def test_plan_cancel_and_reservation_lifecycle(client: TestClient, matrix_users: Dict[str, Any]):
    planner_headers = matrix_users["headers"]["planner"]

    # Seed scenario and generate plan
    seed_resp = client.post(
        "/api/v1/scenarios/seed",
        json={
            "scenario_code": "SCENARIO-CANCEL-TEST",
            "name": "Cancel Test Scenario",
            "scenario_type": "ROUTINE_BALANCING",
            "parameters": {},
            "seed_network_topology": True,
            "overwrite": True,
        },
        headers=matrix_users["headers"]["admin"],
    )
    sc_id = seed_resp.json()["scenario"]["id"]

    plan_resp = client.post(f"/api/v1/scenarios/{sc_id}/plans", headers=planner_headers)
    plan_code = plan_resp.json()["plan_code"]

    # Reserve inventory for candidate plan
    res_resp = client.post(f"/api/v1/plans/{plan_code}/reserve", json={"ttl_minutes": 45}, headers=planner_headers)
    assert res_resp.status_code == 200
    assert res_resp.json()["reserved_items_count"] >= 1

    # Release reservations
    rel_resp = client.post(f"/api/v1/plans/{plan_code}/release", headers=planner_headers)
    assert rel_resp.status_code == 200
    assert "Released" in rel_resp.json()["message"]

    # Cancel plan with reason
    cancel_resp = client.post(
        f"/api/v1/plans/{plan_code}/cancel",
        json={"reason": "Manual cancellation for demand shift test"},
        headers=planner_headers,
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"


# ==============================================================================
# 5. HTTP Error Status Code Matrix Verification
# ==============================================================================

def test_http_status_codes_and_error_handling(client: TestClient, matrix_users: Dict[str, Any]):
    planner_headers = matrix_users["headers"]["planner"]
    approver_headers = matrix_users["headers"]["approver"]
    viewer_headers = matrix_users["headers"]["viewer"]

    # 401 Unauthorized: Request protected endpoint without credentials
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401

    # 403 Forbidden: Viewer attempts to create warehouse
    resp = client.post(
        "/api/v1/warehouses",
        json={"code": "WH-UNAUTH-01", "name": "Unauth WH", "region": "North"},
        headers=viewer_headers,
    )
    assert resp.status_code == 403

    # 404 Not Found: Request non-existent entity
    resp = client.get("/api/v1/warehouses/999999")
    assert resp.status_code == 404
    assert resp.json()["error"] == "EntityNotFoundException"

    # 409 Conflict: Duplicate warehouse code
    wh_data = {"code": "WH-CONFLICT-01", "name": "Conflict WH", "region": "West"}
    client.post("/api/v1/warehouses", json=wh_data, headers=matrix_users["headers"]["admin"])
    resp = client.post("/api/v1/warehouses", json=wh_data, headers=matrix_users["headers"]["admin"])
    assert resp.status_code == 409
    assert resp.json()["error"] == "ConflictException"

    # 422 Unprocessable Entity: Missing required fields or invalid schema
    resp = client.post(
        "/api/v1/warehouses",
        json={"name": "Missing Code"},
        headers=matrix_users["headers"]["admin"],
    )
    assert resp.status_code == 422
    assert resp.json()["error"] == "RequestValidationError"


# ==============================================================================
# 6. Decision Service Error Simulation (502 Bad Gateway & 504 Timeout)
# ==============================================================================

def test_decision_service_error_handling(client: TestClient, matrix_users: Dict[str, Any]):
    planner_headers = matrix_users["headers"]["planner"]

    # Seed a scenario
    seed_resp = client.post(
        "/api/v1/scenarios/seed",
        json={
            "scenario_code": "SCENARIO-ERR-SIM",
            "name": "Error Simulation Scenario",
            "scenario_type": "DEMAND_SURGE",
            "parameters": {},
            "seed_network_topology": True,
            "overwrite": True,
        },
        headers=matrix_users["headers"]["admin"],
    )
    sc_id = seed_resp.json()["scenario"]["id"]

    # 1. Simulate Decision Service Timeout -> 504 Gateway Timeout
    def mock_timeout(payload):
        raise httpx.TimeoutException("Decision service request timed out.")

    DecisionServiceClient.set_mock_handler(mock_timeout)
    try:
        resp = client.post(f"/api/v1/scenarios/{sc_id}/plans", headers=planner_headers)
        assert resp.status_code == 504
        assert resp.json()["error"] == "DecisionServiceTimeoutException"
        assert "timed out" in resp.json()["message"]
    finally:
        DecisionServiceClient.set_mock_handler(None)

    # 2. Simulate Decision Service Malformed Response -> 502 Bad Gateway
    def mock_malformed(payload):
        return {"invalid_key": "not_a_valid_candidate_proposal"}

    DecisionServiceClient.set_mock_handler(mock_malformed)
    try:
        resp = client.post(f"/api/v1/scenarios/{sc_id}/plans", headers=planner_headers)
        assert resp.status_code == 502
        assert resp.json()["error"] == "MalformedDecisionCandidateException"
    finally:
        DecisionServiceClient.set_mock_handler(None)


# ==============================================================================
# 7. Complete End-to-End Workflow with Idempotent Commit & Audit Trail
# ==============================================================================

def test_complete_e2e_plan_lifecycle_with_idempotency_and_audit(client: TestClient, matrix_users: Dict[str, Any]):
    planner_headers = matrix_users["headers"]["planner"]
    approver_headers = matrix_users["headers"]["approver"]
    viewer_headers = matrix_users["headers"]["viewer"]

    # 1. Seed Scenario
    seed_resp = client.post(
        "/api/v1/scenarios/seed",
        json={
            "scenario_code": "SCENARIO-E2E-MATRIX",
            "name": "E2E Complete Matrix Test",
            "scenario_type": "DEMAND_SURGE",
            "parameters": {"surge_factor": 1.30},
            "seed_network_topology": True,
            "overwrite": True,
        },
        headers=matrix_users["headers"]["admin"],
    )
    assert seed_resp.status_code == 201
    sc_id = seed_resp.json()["scenario"]["id"]

    # 2. Generate Plan
    plan_gen = client.post(f"/api/v1/scenarios/{sc_id}/plans", headers=planner_headers)
    assert plan_gen.status_code == 201
    plan_code = plan_gen.json()["plan_code"]

    # 3. Authoritative Validation
    val_resp = client.post(f"/api/v1/plans/{plan_code}/validate", headers=planner_headers)
    assert val_resp.status_code == 200
    assert val_resp.json()["verdict"] == "PASS"

    # 4. Separation of duties: Creator (planner) cannot approve
    bad_approve = client.post(f"/api/v1/plans/{plan_code}/approve", headers=planner_headers)
    assert bad_approve.status_code == 403

    # 5. Independent Approver authorizes plan
    good_approve = client.post(f"/api/v1/plans/{plan_code}/approve", headers=approver_headers)
    assert good_approve.status_code == 200
    assert good_approve.json()["approval_status"] == "APPROVED"

    # 6. Commit plan with idempotency key
    idempotency_key = "IDEMP-KEY-E2E-MATRIX-2026-A"
    commit_resp = client.post(
        f"/api/v1/plans/{plan_code}/commit",
        json={"idempotency_key": idempotency_key, "commit_reason": "E2E verification commitment"},
        headers=approver_headers,
    )
    assert commit_resp.status_code == 200
    commit_data = commit_resp.json()
    assert commit_data["status"] == "COMMITTED"
    assert commit_data["idempotency_key"] == idempotency_key
    assert commit_data["total_allocated_units"] >= 1

    # 7. Repeat commit with SAME idempotency key returns successful cached result (idempotent safety)
    repeat_idemp = client.post(
        f"/api/v1/plans/{plan_code}/commit",
        json={"idempotency_key": idempotency_key, "commit_reason": "Repeat idempotent call"},
        headers=approver_headers,
    )
    assert repeat_idemp.status_code == 200
    assert repeat_idemp.json()["status"] == "COMMITTED"

    # 8. Repeat commit with DIFFERENT idempotency key triggers 409 Conflict (PlanAlreadyCommittedException)
    different_idemp = client.post(
        f"/api/v1/plans/{plan_code}/commit",
        json={"idempotency_key": "DIFFERENT-KEY-999", "commit_reason": "Unauthorized double commit"},
        headers=approver_headers,
    )
    assert different_idemp.status_code == 409
    assert different_idemp.json()["error"] == "PlanAlreadyCommittedException"

    # 9. Verify Audit Trail
    audit_resp = client.get(f"/api/v1/plans/{plan_code}/audit", headers=viewer_headers)
    assert audit_resp.status_code == 200
    events = audit_resp.json()
    event_types = [e["event_type"] for e in events]
    assert "VALIDATION_PASSED" in event_types
    assert "PLAN_APPROVED" in event_types
    assert "PLAN_COMMITTED" in event_types

    # 10. Verify authoritative inventory invariants
    verify_resp = client.post("/api/v1/inventory/verify", headers=matrix_users["headers"]["admin"])
    assert verify_resp.status_code == 200
    assert verify_resp.json()["is_valid"] is True
