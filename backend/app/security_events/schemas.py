"""
Pydantic Schemas for Security Events, Alerts, and WebSocket Payloads.
NexusGuard Person 3 — Contracts for REST API and WebSocket communication.
"""

from datetime import datetime
from typing import Optional, List, Generic, TypeVar
from pydantic import BaseModel, ConfigDict, Field
from app.security_events.models import SeverityEnum, EventTypeEnum, EventStatusEnum

T = TypeVar("T")


# ==========================================
# Security Event Schemas
# ==========================================

class SecurityEventBase(BaseModel):
    target_id: int = Field(..., description="ID of the monitored database target")
    engine: str = Field(..., description="Database engine (postgresql, mysql)")
    database_name: str = Field(..., description="Name of the target database")
    username: str = Field(..., description="Database user who ran the query")
    source_ip: str = Field(default="127.0.0.1", description="Source IP address of client")
    query: str = Field(..., description="Raw SQL query executed")
    schema_name: Optional[str] = Field(default=None, description="Accessed schema name")
    table_name: Optional[str] = Field(default=None, description="Accessed table name")
    event_type: EventTypeEnum = Field(default=EventTypeEnum.DECOY_ACCESS)
    severity: SeverityEnum = Field(default=SeverityEnum.CRITICAL)
    detection_reason: str = Field(..., description="Human-readable reason for detection")
    status: EventStatusEnum = Field(default=EventStatusEnum.NEW)


class SecurityEventCreate(SecurityEventBase):
    timestamp: Optional[datetime] = None


class SecurityEventResponse(SecurityEventBase):
    id: str
    timestamp: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SecurityEventStatusUpdate(BaseModel):
    status: EventStatusEnum = Field(..., description="Updated lifecycle status")


# ==========================================
# Alert Schemas
# ==========================================

class AlertResponse(BaseModel):
    id: str
    event_id: str
    severity: SeverityEnum
    status: EventStatusEnum
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    assigned_user_id: Optional[int] = None
    event: Optional[SecurityEventResponse] = None

    model_config = ConfigDict(from_attributes=True)


class AlertStatusUpdate(BaseModel):
    status: EventStatusEnum = Field(..., description="Updated alert status")
    assigned_user_id: Optional[int] = Field(default=None, description="User ID assigned to investigate")


# ==========================================
# WebSocket Broadcast Schema (Exact Contract)
# ==========================================

class WebSocketSecurityEventPayload(BaseModel):
    """
    Contract required by Person 4 (Frontend SOC Dashboard):
    {
      "type": "security_event",
      "event": {
        "id": "uuid",
        "timestamp": "...",
        "target_id": 1,
        "severity": "CRITICAL",
        "event_type": "DECOY_ACCESS",
        "source_ip": "10.0.0.42",
        "username": "demo_user",
        "schema_name": "nexusguard_decoy",
        "table_name": "customers",
        "query": "SELECT * FROM nexusguard_decoy.customers",
        "detection_reason": "Potential unauthorized interaction with deception asset.",
        "status": "NEW"
      }
    }
    """
    type: str = "security_event"
    event: SecurityEventResponse


# ==========================================
# Pagination & Aggregation Schemas
# ==========================================

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class EventMetricsSummary(BaseModel):
    total_events: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    decoy_interactions_count: int
    active_threats_count: int
