"""
Base Interfaces and Contracts for the NexusGuard Detection Engine.
Person 3 Subsystem.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.security_events.models import SeverityEnum, EventTypeEnum


@dataclass
class RawEvent:
    """
    Represents an un-evaluated raw database query event collected by a Monitoring Provider.
    """
    target_id: int
    engine: str  # postgresql, mysql
    database_name: str
    username: str
    source_ip: str
    query: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DetectionResult:
    """
    Represents the output when a DetectionRule matches a raw query event.
    """
    event_type: EventTypeEnum
    severity: SeverityEnum
    detection_reason: str
    schema_name: Optional[str] = None
    table_name: Optional[str] = None
    matched: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


class DetectionRule(ABC):
    """
    Abstract base class for all detection rules in NexusGuard.
    Each rule inspects a RawEvent and determines if it triggers a security event.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier name for this rule."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable explanation of what this rule detects."""
        pass

    @abstractmethod
    def matches(self, event: RawEvent) -> bool:
        """Quickly check whether this rule applies to the raw event."""
        pass

    @abstractmethod
    def evaluate(self, event: RawEvent) -> Optional[DetectionResult]:
        """
        Evaluate the raw event in detail and return a DetectionResult if a violation is confirmed,
        or None if no security issue is found.
        """
        pass
