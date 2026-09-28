"""
Tests for SecurityEventService and SecurityEventRepository.
NexusGuard Person 3 — Verifies persistence, auto-alert escalation, pagination, status lifecycle, and audit hooks.
"""

import pytest
from app.security_events.service import SecurityEventService
from app.security_events.schemas import SecurityEventCreate
from app.security_events.models import SeverityEnum, EventTypeEnum, EventStatusEnum


def test_record_critical_event_escalates_to_alert(db_session):
    """CRITICAL event must automatically generate an actionable Alert."""
    service = SecurityEventService(db_session)
    event_in = SecurityEventCreate(
        target_id=1,
        engine="postgresql",
        database_name="prod",
        username="attacker",
        source_ip="192.168.1.5",
        query="SELECT * FROM nexusguard_decoy.payments;",
        schema_name="nexusguard_decoy",
        table_name="payments",
        event_type=EventTypeEnum.DECOY_ACCESS,
        severity=SeverityEnum.CRITICAL,
        detection_reason="Potential unauthorized interaction with deception asset.",
        status=EventStatusEnum.NEW,
    )

    event, alert = service.record_event(event_in)
    assert event.id is not None
    assert alert is not None
    assert alert.event_id == event.id
    assert alert.severity == "CRITICAL"
    assert alert.status == "NEW"


def test_record_low_severity_does_not_escalate(db_session):
    """LOW severity system events should be logged but NOT create an urgent Alert."""
    service = SecurityEventService(db_session)
    event_in = SecurityEventCreate(
        target_id=1,
        engine="postgresql",
        database_name="prod",
        username="admin",
        source_ip="127.0.0.1",
        query="SELECT 1;",
        event_type=EventTypeEnum.SYSTEM_EVENT,
        severity=SeverityEnum.LOW,
        detection_reason="Routine health query.",
        status=EventStatusEnum.NEW,
    )

    event, alert = service.record_event(event_in)
    assert event.id is not None
    assert alert is None


def test_pagination_and_filtering(db_session):
    """Verify pagination breaks results into distinct pages and filters accurately."""
    service = SecurityEventService(db_session)

    # Insert 15 events (10 for target 1, 5 for target 2)
    for i in range(10):
        service.record_event(
            SecurityEventCreate(
                target_id=1,
                engine="postgresql",
                database_name="prod",
                username=f"user_{i}",
                source_ip="10.0.0.1",
                query=f"SELECT {i} FROM nexusguard_decoy.t;",
                event_type=EventTypeEnum.DECOY_ACCESS,
                severity=SeverityEnum.CRITICAL,
                detection_reason="Decoy access",
            )
        )
    for i in range(5):
        service.record_event(
            SecurityEventCreate(
                target_id=2,
                engine="mysql",
                database_name="shop",
                username=f"bot_{i}",
                source_ip="10.0.0.2",
                query=f"SELECT {i} FROM information_schema.tables;",
                event_type=EventTypeEnum.SCHEMA_ENUMERATION,
                severity=SeverityEnum.HIGH,
                detection_reason="Enumeration",
            )
        )

    # Page 1 with page_size=5 (Total for target 1 should be 10, total_pages=2)
    page1 = service.list_events(target_id=1, page=1, page_size=5)
    assert page1.total == 10
    assert len(page1.items) == 5
    assert page1.total_pages == 2
    assert page1.page == 1

    # Page 2 with page_size=5
    page2 = service.list_events(target_id=1, page=2, page_size=5)
    assert len(page2.items) == 5
    assert page2.page == 2
    # Ensure different records on page 2
    assert page1.items[0].id != page2.items[0].id


def test_alert_status_lifecycle_and_audit(db_session):
    """Verify transitions: NEW -> INVESTIGATING -> RESOLVED, setting timestamps & invoking audit callback."""
    audit_log_entries = []

    def mock_audit_logger(action, resource_type, resource_id, metadata):
        audit_log_entries.append({
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "metadata": metadata,
        })

    service = SecurityEventService(db_session, audit_logger=mock_audit_logger)

    # 1. Create alert
    event, alert = service.record_event(
        SecurityEventCreate(
            target_id=1,
            engine="postgresql",
            database_name="prod",
            username="hacker",
            source_ip="8.8.8.8",
            query="SELECT * FROM nexusguard_decoy.secret;",
            severity=SeverityEnum.CRITICAL,
            detection_reason="Decoy interaction",
        )
    )
    assert alert.status == "NEW"

    # 2. Analyst begins investigation
    investigating_alert = service.update_alert_status(
        alert_id=alert.id,
        new_status=EventStatusEnum.INVESTIGATING,
        assigned_user_id=42,
    )
    assert investigating_alert.status == "INVESTIGATING"
    assert investigating_alert.acknowledged_at is not None
    assert investigating_alert.assigned_user_id == 42
    # Linked event status should also be synchronized
    assert db_session.get(event.__class__, event.id).status == "INVESTIGATING"

    # 3. Analyst resolves incident
    resolved_alert = service.update_alert_status(
        alert_id=alert.id,
        new_status=EventStatusEnum.RESOLVED,
    )
    assert resolved_alert.status == "RESOLVED"
    assert resolved_alert.resolved_at is not None
    assert db_session.get(event.__class__, event.id).status == "RESOLVED"

    # 4. Check audit log entries
    assert len(audit_log_entries) == 2
    assert audit_log_entries[0]["action"] == "UPDATE_ALERT_STATUS"
    assert audit_log_entries[0]["metadata"]["new_status"] == "INVESTIGATING"
    assert audit_log_entries[1]["metadata"]["new_status"] == "RESOLVED"
