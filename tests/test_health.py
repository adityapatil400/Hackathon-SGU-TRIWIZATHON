from unittest.mock import patch
from fastapi.testclient import TestClient
from app.core.config import Settings


def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "HETVAYA" in data["message"] or "FlowGrid" in data["message"]
    assert data["authoritative_rule"] == "Backend is the single authority for plan commitment"


def test_health_check_endpoint(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] in ("HETVAYA", "FlowGrid")
    assert data["authoritative_backend_authority"] == "ENFORCED"
    assert data["direct_decision_commit_allowed"] is False
    assert "timestamp" in data
    # Security check: ensure no database connection secrets are leaked in health output
    assert "password" not in response.text.lower()
    assert "postgresql://" not in response.text.lower()


def test_readiness_check_endpoint_success(client: TestClient):
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"
    assert "password" not in response.text.lower()


def test_readiness_check_root_alias(client: TestClient):
    response = client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"


def test_readiness_check_database_failure(client: TestClient):
    with patch("sqlalchemy.orm.Session.execute", side_effect=Exception("Database link lost")):
        response = client.get("/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["database"] == "disconnected"
        assert "password" not in response.text.lower()


def test_sanitized_database_url_masks_password():
    custom_settings = Settings(
        DATABASE_URL="postgresql+psycopg2://admin_user:super_secret_password@db.internal:5432/flowgrid"
    )
    sanitized = custom_settings.sanitized_database_url
    assert "super_secret_password" not in sanitized
    assert "admin_user:***@db.internal:5432/flowgrid" in sanitized
