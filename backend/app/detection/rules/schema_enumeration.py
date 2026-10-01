"""
Schema Enumeration Detection Rule.
NexusGuard Person 3 — Detects database reconnaissance, catalog enumeration, and crawler activity.
"""

import re
from typing import Optional
from app.detection.base import DetectionRule, RawEvent, DetectionResult
from app.security_events.models import SeverityEnum, EventTypeEnum


class SchemaEnumerationRule(DetectionRule):
    """
    Detects attempts to discover database topology, table structures, and columns.
    Commonly performed by penetration testing tools (sqlmap), attackers, or automated recon bots.
    """

    # Common reconnaissance targets across PostgreSQL and MySQL
    RECON_PATTERNS = [
        r"\binformation_schema\.(?:tables|columns|schemata|views|routines|user_privileges)\b",
        r"\bpg_catalog\.(?:pg_tables|pg_class|pg_namespace|pg_database|pg_attribute)\b",
        r"\bshow\s+(?:tables|databases|schemas|columns|fields)\b",
        r"\bselect\s+table_name\s+from\s+information_schema\b",
        r"\bselect\s+column_name\s+from\s+information_schema\b",
    ]

    def __init__(self, high_severity_tables_only: bool = False):
        self._regex = re.compile(
            "|".join(self.RECON_PATTERNS),
            re.IGNORECASE,
        )
        self.high_severity_tables_only = high_severity_tables_only

    @property
    def name(self) -> str:
        return "SCHEMA_ENUMERATION_RULE"

    @property
    def description(self) -> str:
        return "Detects reconnaissance queries inspecting database catalogs or enumerating schemas."

    def matches(self, event: RawEvent) -> bool:
        if not event.query:
            return False
        return bool(self._regex.search(event.query))

    def evaluate(self, event: RawEvent) -> Optional[DetectionResult]:
        if not self.matches(event):
            return None

        # Determine severity: scanning all schemata/tables is HIGH, single SHOW TABLES may be MEDIUM
        matched_str = self._regex.search(event.query).group(0).lower()
        if "information_schema" in matched_str or "pg_catalog" in matched_str:
            severity = SeverityEnum.HIGH
        else:
            severity = SeverityEnum.MEDIUM

        return DetectionResult(
            event_type=EventTypeEnum.SCHEMA_ENUMERATION,
            severity=severity,
            detection_reason="Suspicious schema reconnaissance query targeting catalog metadata.",
            schema_name="information_schema" if "information_schema" in matched_str else None,
            table_name=None,
            matched=True,
            metadata={
                "rule": self.name,
                "matched_pattern": matched_str,
            },
        )
