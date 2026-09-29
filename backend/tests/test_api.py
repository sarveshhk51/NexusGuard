"""
Integration Tests for FastAPI REST Endpoints & WebSocket Broadcasting.
NexusGuard Person 3 — Validates routes, schemas, lifecycle status, and live WebSocket streaming.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.compat.database import get_db


@pytest.fixture
def client(db_session):
    """
    TestClient with database dependency overridden to use the test SQLite session.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_health_check(client):
    """Verifies that the /health endpoint reports service health."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "NexusGuard" in data["service"]


def test_create_and_get_security_event(client):
    """Verifies event creation and retrieval by ID."""
    payload = {
        "target_id": 101,
        "engine": "postgresql",
        "database_name": "prod_db",
        "username": "intruder",
        "source_ip": "192.168.1.50",
        "query": "SELECT * FROM honey_users;",
        "schema_name": "public",
        "table_name": "honey_users",
        "event_type": "DECOY_ACCESS",
        "severity": "CRITICAL",
        "detection_reason": "Direct query to honey decoy table.",
    }
    create_res = client.post("/api/events", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    event_id = created["id"]
    assert event_id is not None
    assert created["username"] == "intruder"
    assert created["severity"] == "CRITICAL"

    # Fetch by ID
    get_res = client.get(f"/api/events/{event_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == event_id


def test_list_events_with_filters_and_pagination(client):
    """Verifies event list filtering by target_id, severity, and pagination."""
    res1 = client.post("/api/events", json={
        "target_id": 200,
        "engine": "mysql",
        "database_name": "db1",
        "username": "user1",
        "source_ip": "10.0.0.1",
        "query": "SHOW TABLES;",
        "event_type": "SCHEMA_ENUMERATION",
        "severity": "HIGH",
        "detection_reason": "High frequency metadata enumeration",
    })
    assert res1.status_code == 201

    res2 = client.post("/api/events", json={
        "target_id": 201,
        "engine": "mysql",
        "database_name": "db2",
        "username": "user2",
        "source_ip": "10.0.0.2",
        "query": "SELECT 1;",
        "event_type": "SUSPICIOUS_QUERY",
        "severity": "LOW",
        "detection_reason": "Slight query variance",
    })
    assert res2.status_code == 201

    # Filter by target_id=200
    res = client.get("/api/events?target_id=200")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["target_id"] == 200

    # Filter by severity=LOW
    res_low = client.get("/api/events?severity=LOW")
    assert res_low.status_code == 200
    assert res_low.json()["total"] == 1
    assert res_low.json()["items"][0]["severity"] == "LOW"


def test_get_metrics(client):
    """Verifies SOC summary metric calculations."""
    client.post("/api/events", json={
        "target_id": 300,
        "engine": "postgresql",
        "database_name": "sec_db",
        "username": "attacker",
        "source_ip": "10.0.0.99",
        "query": "SELECT * FROM decoy_passwords;",
        "schema_name": "decoy",
        "table_name": "decoy_passwords",
        "event_type": "DECOY_ACCESS",
        "severity": "CRITICAL",
        "detection_reason": "Decoy accessed",
    })

    res = client.get("/api/events/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert metrics["total_events"] >= 1
    assert metrics["critical_count"] >= 1
    assert metrics["decoy_interactions_count"] >= 1


def test_alerts_lifecycle_flow(client):
    """
    Verifies that a CRITICAL event auto-creates an alert,
    which can be queried and updated through its lifecycle.
    """
    event_res = client.post("/api/events", json={
        "target_id": 400,
        "engine": "postgresql",
        "database_name": "finance_db",
        "username": "malicious_actor",
        "source_ip": "172.16.0.4",
        "query": "SELECT * FROM decoy_credit_cards;",
        "schema_name": "finance",
        "table_name": "decoy_credit_cards",
        "event_type": "DECOY_ACCESS",
        "severity": "CRITICAL",
        "detection_reason": "Direct honeypot credit card query",
    })
    event_id = event_res.json()["id"]

    # List alerts
    alerts_res = client.get("/api/alerts?severity=CRITICAL")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()["items"]
    assert len(alerts) >= 1
    target_alert = next(a for a in alerts if a["event_id"] == event_id)
    assert target_alert["status"] == "NEW"

    # Update status to INVESTIGATING
    patch_res = client.patch(
        f"/api/alerts/{target_alert['id']}/status",
        json={"status": "INVESTIGATING", "assigned_user_id": 42},
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "INVESTIGATING"
    assert updated["assigned_user_id"] == 42
    assert updated["acknowledged_at"] is not None

    # Update status to RESOLVED
    resolve_res = client.patch(
        f"/api/alerts/{target_alert['id']}/status",
        json={"status": "RESOLVED"},
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"
    assert resolve_res.json()["resolved_at"] is not None


def test_websocket_broadcast_on_event_creation(client):
    """
    Verifies that when an event is posted, connected WebSocket clients
    instantly receive the broadcasted security event JSON payload.
    """
    with client.websocket_connect("/ws/alerts") as websocket:
        # Send heartbeat
        websocket.send_text("ping")
        response = websocket.receive_text()
        assert response == "pong"

        # Post an event via REST API
        client.post("/api/events", json={
            "target_id": 500,
            "engine": "postgresql",
            "database_name": "soc_db",
            "username": "live_stream_tester",
            "source_ip": "10.10.10.10",
            "query": "SELECT * FROM decoy_keys;",
            "schema_name": "secret",
            "table_name": "decoy_keys",
            "event_type": "DECOY_ACCESS",
            "severity": "CRITICAL",
            "detection_reason": "Live socket streaming test event",
        })

        # Receive broadcast over WebSocket
        broadcast_data = websocket.receive_json()
        assert broadcast_data["type"] == "security_event"
        assert broadcast_data["event"]["username"] == "live_stream_tester"
        assert broadcast_data["event"]["severity"] == "CRITICAL"
        assert broadcast_data["event"]["table_name"] == "decoy_keys"
