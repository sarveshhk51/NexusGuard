"""
SQLAlchemy Database Models for Security Events and Alerts.
NexusGuard Person 3 — Monitoring, Detection, Events & Real-Time Alerting.
"""

from datetime import datetime, timezone
import uuid
import enum

from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Text,
    ForeignKey,
    Index,
    Enum as SQLEnum,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class SeverityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class EventTypeEnum(str, enum.Enum):
    DECOY_ACCESS = "DECOY_ACCESS"
    SUSPICIOUS_QUERY = "SUSPICIOUS_QUERY"
    SCHEMA_ENUMERATION = "SCHEMA_ENUMERATION"
    REPEATED_ACCESS = "REPEATED_ACCESS"
    AUTHENTICATION_ANOMALY = "AUTHENTICATION_ANOMALY"
    SYSTEM_EVENT = "SYSTEM_EVENT"


class EventStatusEnum(str, enum.Enum):
    NEW = "NEW"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


def generate_uuid() -> str:
    """Generate a string UUID for primary keys."""
    return str(uuid.uuid4())


def get_utc_now() -> datetime:
    """Return timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class SecurityEvent(Base):
    """
    Normalized Security Event model.
    Represents an event detected by the Monitoring Provider and Detection Engine.
    """
    __tablename__ = "nexusguard_security_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime(timezone=True), default=get_utc_now, nullable=False, index=True)
    target_id = Column(Integer, nullable=False, index=True)
    engine = Column(String(32), nullable=False)  # postgresql, mysql
    database_name = Column(String(128), nullable=False)
    username = Column(String(128), nullable=False)
    source_ip = Column(String(64), nullable=False, default="127.0.0.1", index=True)
    query = Column(Text, nullable=False)
    schema_name = Column(String(128), nullable=True)
    table_name = Column(String(128), nullable=True)
    event_type = Column(String(64), default=EventTypeEnum.DECOY_ACCESS.value, nullable=False, index=True)
    severity = Column(String(32), default=SeverityEnum.CRITICAL.value, nullable=False, index=True)
    detection_reason = Column(Text, nullable=False)
    status = Column(String(32), default=EventStatusEnum.NEW.value, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    # Relationship to Alert (one-to-one or one-to-many)
    alerts = relationship("Alert", back_populates="security_event", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_security_events_target_status", "target_id", "status"),
        Index("ix_security_events_severity_status", "severity", "status"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "target_id": self.target_id,
            "engine": self.engine,
            "database_name": self.database_name,
            "username": self.username,
            "source_ip": self.source_ip,
            "query": self.query,
            "schema_name": self.schema_name,
            "table_name": self.table_name,
            "event_type": self.event_type,
            "severity": self.severity,
            "detection_reason": self.detection_reason,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Alert(Base):
    """
    Actionable Security Alert model for SOC operations.
    Raised automatically when HIGH or CRITICAL security events occur.
    """
    __tablename__ = "nexusguard_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("nexusguard_security_events.id", ondelete="CASCADE"), nullable=False, index=True)
    severity = Column(String(32), default=SeverityEnum.CRITICAL.value, nullable=False, index=True)
    status = Column(String(32), default=EventStatusEnum.NEW.value, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False, index=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    assigned_user_id = Column(Integer, nullable=True)

    # Relationship back to SecurityEvent
    security_event = relationship("SecurityEvent", back_populates="alerts")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "severity": self.severity,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "assigned_user_id": self.assigned_user_id,
            "event": self.security_event.to_dict() if self.security_event else None,
        }
