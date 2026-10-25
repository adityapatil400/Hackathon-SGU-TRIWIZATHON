import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.message import MessagePriority, MessageStatus, RelatedModule


@pytest.fixture
def client():
    # Reset messages store before each test
    c = TestClient(app)
    c.post("/api/v1/messages/reset")
    return c


def test_list_messages_admin_sees_all(client: TestClient):
    resp = client.get("/api/v1/messages?user_role=priya")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 9
    # Admin can see all messages
    titles = [m["title"] for m in data]
    assert any("Amul Milk" in t for t in titles)
    assert any("Khandala Ghat" in t for t in titles)
    assert any("Solver p95" in t for t in titles)


def test_list_messages_role_filtering(client: TestClient):
    # Rohit (Planner) should see forecasting, inventory, allocations (not warehouse dock conveyor or ganesh pos queue only)
    resp_rohit = client.get("/api/v1/messages?user_role=rohit")
    assert resp_rohit.status_code == 200
    data_rohit = resp_rohit.json()
    assert len(data_rohit) < 9
    titles_rohit = [m["title"] for m in data_rohit]
    assert any("Aashirvaad Atta" in t for t in titles_rohit)
    assert not any("Solver p95" in t for t in titles_rohit)  # Admin only

    # Ganesh (Store Management) should see POS and store messages
    resp_ganesh = client.get("/api/v1/messages?user_role=ganesh")
    assert resp_ganesh.status_code == 200
    data_ganesh = resp_ganesh.json()
    assert len(data_ganesh) == 2
    titles_ganesh = [m["title"] for m in data_ganesh]
    assert any("Mahadev Store" in t for t in titles_ganesh)
    assert any("Offline IndexedDB" in t for t in titles_ganesh)

    # Sunita (Warehouse Manager) should see warehouse, FEFO, delivery messages
    resp_sunita = client.get("/api/v1/messages?user_role=sunita")
    assert resp_sunita.status_code == 200
    data_sunita = resp_sunita.json()
    titles_sunita = [m["title"] for m in data_sunita]
    assert any("Amul Milk" in t for t in titles_sunita)
    assert any("Pune Hub" in t for t in titles_sunita)


def test_filter_messages_by_priority_and_module(client: TestClient):
    resp = client.get("/api/v1/messages?priority=CRITICAL&user_role=priya")
    assert resp.status_code == 200
    data = resp.json()
    assert all(m["priority"] == "CRITICAL" for m in data)

    resp_mod = client.get("/api/v1/messages?module=Inventory&user_role=priya")
    assert resp_mod.status_code == 200
    data_mod = resp_mod.json()
    assert all(m["module"] == "Inventory" for m in data_mod)

    resp_store = client.get("/api/v1/messages?module=Store Management&user_role=priya")
    assert resp_store.status_code == 200
    data_store = resp_store.json()
    assert len(data_store) >= 2


def test_acknowledge_critical_message(client: TestClient):
    msg_id = "MSG-2026-001"
    resp = client.post(f"/api/v1/messages/{msg_id}/acknowledge?user_role=sunita")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ACKNOWLEDGED"
    assert data["acknowledged_by"] == "Sunita"
    assert data["acknowledged_at"] is not None


def test_resolve_critical_message_permissions(client: TestClient):
    # Regular user attempting to resolve admin-only issue MSG-2026-007 should get 403
    admin_only_id = "MSG-2026-007"
    resp_fail = client.post(f"/api/v1/messages/{admin_only_id}/resolve?user_role=ganesh")
    assert resp_fail.status_code == 403

    # Admin resolving MSG-2026-007 should succeed
    resp_ok = client.post(f"/api/v1/messages/{admin_only_id}/resolve?user_role=priya")
    assert resp_ok.status_code == 200
    data = resp_ok.json()
    assert data["status"] == "RESOLVED"
    assert data["resolved_by"] == "Priya"


def test_messages_summary_endpoint(client: TestClient):
    resp = client.get("/api/v1/messages/summary?user_role=priya")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 9
    assert data["critical_count"] == 3
    assert data["high_count"] == 3
    assert data["medium_count"] == 3
