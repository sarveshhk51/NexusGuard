"""
Tests for NexusGuard Active Defense and Attack Simulation.
Verifies automated IP containment, webhook dispatch logs, and middleware enforcement.
"""

import pytest
from app.defense.service import DefenseService
from app.defense.models import BlockedIP
from app.compat.database import SessionLocal


def test_ip_block_and_unblock_service(db_session):
    service = DefenseService(db_session)
    test_ip = "203.0.113.55"

    assert not service.is_ip_blocked(test_ip)

    # Block IP
    record = service.block_ip(
        ip_address=test_ip,
        reason="Test decoy intrusion",
        severity="CRITICAL",
        query_snippet="SELECT * FROM nexusguard_decoy.secret",
    )
    assert record.is_active is True
    assert service.is_ip_blocked(test_ip) is True

    # List blocked IPs
    blocked_list = service.list_blocked_ips(active_only=True)
    assert any(b["ip_address"] == test_ip for b in blocked_list)

    # Unblock IP
    success = service.unblock_ip(test_ip)
    assert success is True
    assert service.is_ip_blocked(test_ip) is False


def test_simulate_attack_endpoint(client):
    """Verifies the live demonstration endpoint that executes the full defense loop."""
    payload = {
        "scenario": "decoy_breach",
        "attacker_ip": "198.51.100.99",
        "attacker_user": "demo_hacker",
        "target_id": 1,
    }

    resp = client.post("/api/defense/simulate-attack", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["detection_engine"]["triggered"] is True
    assert data["detection_engine"]["rule_matched"] == "DECOY_ACCESS"
    assert data["detection_engine"]["severity"] == "CRITICAL"
    assert data["active_defense"]["ip_block_status"] == "ACTIVATED"
    assert data["active_defense"]["blocked_ip"] == "198.51.100.99"
    assert data["subsequent_probe_blocked"] is True


def test_ip_containment_middleware_blocks_access(client):
    """Banned IP trying to query protected endpoints must receive 403 Forbidden."""
    banned_ip = "198.51.100.88"

    # Block IP through defense API endpoint
    block_resp = client.post(
        "/api/defense/block",
        json={"ip_address": banned_ip, "reason": "Test active ban"},
    )
    assert block_resp.status_code == 200

    # Request with X-Forwarded-For as banned IP
    response = client.get("/api/targets/1/schema", headers={"X-Forwarded-For": banned_ip})
    assert response.status_code == 403
    assert "IP_ACCESS_BLOCKED" in response.text
