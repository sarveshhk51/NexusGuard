"""
Decoy Access Detection Rule.
NexusGuard Person 3 — High-priority rule detecting unauthorized interaction with decoy assets.
"""

import re
from typing import Optional, List
from app.detection.base import DetectionRule, RawEvent, DetectionResult
from app.security_events.models import SeverityEnum, EventTypeEnum


class DecoyAccessRule(DetectionRule):
    """
    Highest priority detection rule.
    Detects any query targeting decoy schemas or decoy tables (default: nexusguard_decoy).
    Legitimate applications have zero reason to interact with decoy environments.
    """

    def __init__(self, target_decoy_schemas: Optional[List[str]] = None):
        """
        :param target_decoy_schemas: List of decoy schema names to watch (defaults to ['nexusguard_decoy'])
        """
        self.decoy_schemas = [s.lower() for s in (target_decoy_schemas or ["nexusguard_decoy"])]
        
        # Regex to capture schema and table name: e.g. nexusguard_decoy.customers or `nexusguard_decoy`.`customers`
        # Also supports "USE nexusguard_decoy" or database-level switching
        schema_pattern = "|".join(re.escape(s) for s in self.decoy_schemas)
        self._pattern = re.compile(
            rf"(?:['\"`]?({schema_pattern})['\"`]?)\s*\.\s*['\"`]?([a-zA-Z0-9_]+)['\"`]?",
            re.IGNORECASE,
        )
        self._simple_match = re.compile(rf"\b({schema_pattern})\b", re.IGNORECASE)

    @property
    def name(self) -> str:
        return "DECOY_ACCESS_RULE"

    @property
    def description(self) -> str:
        return "Detects direct interaction with synthetic decoy schemas and tables."

    def matches(self, event: RawEvent) -> bool:
        """Quickly check if the query string references any decoy schema."""
        if not event.query:
            return False
        return bool(self._simple_match.search(event.query))

    def evaluate(self, event: RawEvent) -> Optional[DetectionResult]:
        """
        Evaluates the query for decoy access.
        Extracts the schema and table if available.
        Assigns CRITICAL severity and non-accusatory detection reason.
        """
        if not self.matches(event):
            return None

        schema_name = self.decoy_schemas[0]
        table_name = None

        # Try to parse exact schema and table
        match = self._pattern.search(event.query)
        if match:
            schema_name = match.group(1).lower()
            table_name = match.group(2)

        return DetectionResult(
            event_type=EventTypeEnum.DECOY_ACCESS,
            severity=SeverityEnum.CRITICAL,
            detection_reason="Potential unauthorized interaction with deception asset.",
            schema_name=schema_name,
            table_name=table_name,
            matched=True,
            metadata={
                "rule": self.name,
                "detected_pattern": match.group(0) if match else schema_name,
            },
        )
