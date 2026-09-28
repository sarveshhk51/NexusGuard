"""
Detection Engine Orchestrator.
NexusGuard Person 3 — Coordinates detection rules and produces normalized security event candidates.
"""

from typing import List, Optional
from app.detection.base import DetectionRule, RawEvent, DetectionResult
from app.detection.rules.decoy_access import DecoyAccessRule
from app.detection.rules.schema_enumeration import SchemaEnumerationRule
from app.detection.rules.repeated_access import RepeatedAccessRule
from app.security_events.schemas import SecurityEventCreate
from app.security_events.models import SeverityEnum, EventTypeEnum, EventStatusEnum


SEVERITY_PRIORITY = {
    SeverityEnum.CRITICAL: 4,
    SeverityEnum.HIGH: 3,
    SeverityEnum.MEDIUM: 2,
    SeverityEnum.LOW: 1,
}


class DetectionEngine:
    """
    Evaluates incoming raw database telemetry against configured detection rules.
    Prioritizes highest-severity detections (Decoy Access > Reconnaissance > Anomalies).
    """

    def __init__(self, rules: Optional[List[DetectionRule]] = None):
        if rules is not None:
            self.rules = rules
        else:
            # Default rule pipeline ordered by priority
            self.rules = [
                DecoyAccessRule(),
                SchemaEnumerationRule(),
                RepeatedAccessRule(),
            ]

    def add_rule(self, rule: DetectionRule) -> None:
        """Register a new custom detection rule."""
        self.rules.append(rule)

    def evaluate(self, event: RawEvent) -> Optional[SecurityEventCreate]:
        """
        Evaluates a RawEvent across all rules.
        Returns the highest-priority SecurityEventCreate if any rule flags an issue, or None if benign.
        """
        highest_result: Optional[DetectionResult] = None

        for rule in self.rules:
            result = rule.evaluate(event)
            if result and result.matched:
                if highest_result is None:
                    highest_result = result
                else:
                    # Keep the higher severity detection
                    if SEVERITY_PRIORITY.get(result.severity, 0) > SEVERITY_PRIORITY.get(highest_result.severity, 0):
                        highest_result = result

                # Fast path: Decoy access is always CRITICAL and the top priority
                if highest_result.severity == SeverityEnum.CRITICAL and highest_result.event_type == EventTypeEnum.DECOY_ACCESS:
                    break

        if not highest_result:
            return None

        return SecurityEventCreate(
            target_id=event.target_id,
            engine=event.engine,
            database_name=event.database_name,
            username=event.username,
            source_ip=event.source_ip,
            query=event.query,
            timestamp=event.timestamp,
            schema_name=highest_result.schema_name,
            table_name=highest_result.table_name,
            event_type=highest_result.event_type,
            severity=highest_result.severity,
            detection_reason=highest_result.detection_reason,
            status=EventStatusEnum.NEW,
        )
