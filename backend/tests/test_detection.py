"""
Tests for Detection Rules and Detection Engine.
NexusGuard Person 3 — Verifies threat detection, zero false-positives for benign traffic, and priority ordering.
"""

from datetime import datetime, timezone
import pytest
from app.detection.base import RawEvent
from app.detection.engine import DetectionEngine
from app.detection.rules.decoy_access import DecoyAccessRule
from app.detection.rules.schema_enumeration import SchemaEnumerationRule
from app.detection.rules.repeated_access import RepeatedAccessRule
from app.security_events.models import SeverityEnum, EventTypeEnum


@pytest.fixture
def engine():
    return DetectionEngine()


def test_decoy_access_detected_critical(engine):
    """Verify that any query accessing nexusguard_decoy schema triggers CRITICAL alert."""
    raw_event = RawEvent(
        target_id=1,
        engine="postgresql",
        database_name="production_db",
        username="compromised_app",
        source_ip="192.168.1.50",
        query="SELECT * FROM nexusguard_decoy.customers WHERE balance > 1000;",
    )

    detected = engine.evaluate(raw_event)
    assert detected is not None
    assert detected.event_type == EventTypeEnum.DECOY_ACCESS
    assert detected.severity == SeverityEnum.CRITICAL
    assert detected.schema_name == "nexusguard_decoy"
    assert detected.table_name == "customers"
    assert detected.detection_reason == "Potential unauthorized interaction with deception asset."


def test_benign_query_not_detected(engine):
    """
    Zero False-Positive Principle:
    Queries touching regular production schemas (e.g. public.orders) should NOT be flagged by the decoy rule.
    """
    raw_event = RawEvent(
        target_id=1,
        engine="postgresql",
        database_name="production_db",
        username="legitimate_app",
        source_ip="10.0.1.20",
        query="SELECT id, amount FROM public.orders WHERE status = 'COMPLETED';",
    )

    detected = engine.evaluate(raw_event)
    # A single regular query is completely benign
    assert detected is None


def test_schema_enumeration_detected(engine):
    """Verify that catalog exploration queries (e.g. information_schema) trigger reconnaissance alerts."""
    raw_event = RawEvent(
        target_id=2,
        engine="mysql",
        database_name="corporate",
        username="sqlmap_bot",
        source_ip="45.33.32.156",
        query="SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'corporate';",
    )

    detected = engine.evaluate(raw_event)
    assert detected is not None
    assert detected.event_type == EventTypeEnum.SCHEMA_ENUMERATION
    assert detected.severity == SeverityEnum.HIGH
    assert "reconnaissance" in detected.detection_reason.lower()


def test_repeated_access_burst_detected():
    """Verify that query bursts exceeding threshold trigger frequency alerts."""
    rule = RepeatedAccessRule(window_seconds=10, threshold=3)
    engine_with_repeat = DetectionEngine(rules=[rule])

    base_time = datetime.now(timezone.utc)
    for i in range(2):
        event = RawEvent(
            target_id=1,
            engine="postgresql",
            database_name="db",
            username="crawler",
            source_ip="192.168.1.99",
            query=f"SELECT {i} FROM normal_table;",
            timestamp=base_time,
        )
        assert engine_with_repeat.evaluate(event) is None

    # The 3rd query reaches threshold
    burst_event = RawEvent(
        target_id=1,
        engine="postgresql",
        database_name="db",
        username="crawler",
        source_ip="192.168.1.99",
        query="SELECT 3 FROM normal_table;",
        timestamp=base_time,
    )
    detected = engine_with_repeat.evaluate(burst_event)
    assert detected is not None
    assert detected.event_type == EventTypeEnum.REPEATED_ACCESS
    assert detected.severity == SeverityEnum.HIGH
