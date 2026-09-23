"""
Tests for SecurityEvent and Alert Models and Pydantic Schemas.
"""

from datetime import datetime, timezone
from app.security_events.models import SecurityEvent, Alert, SeverityEnum, EventTypeEnum, EventStatusEnum
from app.security_events.schemas import SecurityEventResponse, AlertResponse, WebSocketSecurityEventPayload


def test_create_security_event(db_session):
    """Verify that a security event can be persisted and queried."""
    event = SecurityEvent(
        target_id=1,
        engine="postgresql",
        database_name="prod_db",
        username="attacker_user",
        source_ip="192.168.1.100",
        query="SELECT * FROM nexusguard_decoy.customers;",
        schema_name="nexusguard_decoy",
        table_name="customers",
        event_type=EventTypeEnum.DECOY_ACCESS.value,
        severity=SeverityEnum.CRITICAL.value,
        detection_reason="Potential unauthorized interaction with deception asset.",
        status=EventStatusEnum.NEW.value,
    )
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)

    assert event.id is not None
    assert event.target_id == 1
    assert event.severity == "CRITICAL"
    assert event.status == "NEW"

    # Validate against Pydantic schema
    response_dto = SecurityEventResponse.model_validate(event)
    assert response_dto.id == event.id
    assert response_dto.query == "SELECT * FROM nexusguard_decoy.customers;"


def test_create_alert_linked_to_event(db_session):
    """Verify that an alert is properly linked to its security event."""
    event = SecurityEvent(
        target_id=2,
        engine="mysql",
        database_name="ecommerce",
        username="recon_bot",
        source_ip="10.0.0.42",
        query="SELECT * FROM nexusguard_decoy.orders;",
        schema_name="nexusguard_decoy",
        table_name="orders",
        event_type=EventTypeEnum.DECOY_ACCESS.value,
        severity=SeverityEnum.CRITICAL.value,
        detection_reason="Potential unauthorized interaction with deception asset.",
        status=EventStatusEnum.NEW.value,
    )
    db_session.add(event)
    db_session.commit()

    alert = Alert(
        event_id=event.id,
        severity=SeverityEnum.CRITICAL.value,
        status=EventStatusEnum.NEW.value,
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    assert alert.id is not None
    assert alert.event_id == event.id
    assert alert.security_event.username == "recon_bot"

    # Validate WebSocket payload contract
    event_dto = SecurityEventResponse.model_validate(event)
    ws_payload = WebSocketSecurityEventPayload(event=event_dto)
    payload_dict = ws_payload.model_dump()

    assert payload_dict["type"] == "security_event"
    assert payload_dict["event"]["severity"] == "CRITICAL"
    assert payload_dict["event"]["schema_name"] == "nexusguard_decoy"
