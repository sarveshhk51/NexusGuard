"""
Security Events and Alerts Repository Layer.
NexusGuard Person 3 — Database queries, filtering, pagination, and aggregations.
"""

from datetime import datetime
from math import ceil
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.security_events.models import (
    SecurityEvent,
    Alert,
    SeverityEnum,
    EventTypeEnum,
    EventStatusEnum,
)
from app.security_events.schemas import (
    SecurityEventCreate,
    EventMetricsSummary,
)


class SecurityEventRepository:
    """Handles low-level database operations for SecurityEvents and Alerts."""

    def __init__(self, db: Session):
        self.db = db

    # ==========================================
    # Security Event Queries
    # ==========================================

    def create_event(self, event_in: SecurityEventCreate) -> SecurityEvent:
        """Persists a new security event into the metadata database."""
        event_dict = event_in.model_dump()
        db_event = SecurityEvent(**event_dict)
        self.db.add(db_event)
        self.db.commit()
        self.db.refresh(db_event)
        return db_event

    def get_event(self, event_id: str) -> Optional[SecurityEvent]:
        """Fetch a single security event by its UUID."""
        return self.db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()

    def list_events(
        self,
        target_id: Optional[int] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        event_type: Optional[str] = None,
        source_ip: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[SecurityEvent], int, int]:
        """
        List security events with multi-criteria filtering and pagination.
        Returns: (events_list, total_count, total_pages)
        """
        query = self.db.query(SecurityEvent)

        # Apply Filters
        if target_id is not None:
            query = query.filter(SecurityEvent.target_id == target_id)
        if severity:
            query = query.filter(SecurityEvent.severity == severity)
        if status:
            query = query.filter(SecurityEvent.status == status)
        if event_type:
            query = query.filter(SecurityEvent.event_type == event_type)
        if source_ip:
            query = query.filter(SecurityEvent.source_ip == source_ip)
        if date_from:
            query = query.filter(SecurityEvent.timestamp >= date_from)
        if date_to:
            query = query.filter(SecurityEvent.timestamp <= date_to)

        # Count total matches before pagination
        total_count = query.count()

        # Calculate pages
        page = max(1, page)
        page_size = max(1, min(100, page_size))  # Safety cap at 100
        total_pages = ceil(total_count / page_size) if total_count > 0 else 1
        offset = (page - 1) * page_size

        # Retrieve paginated records sorted by newest first
        events = (
            query.order_by(desc(SecurityEvent.timestamp))
            .offset(offset)
            .limit(page_size)
            .all()
        )

        return events, total_count, total_pages

    def update_event_status(
        self, event_id: str, new_status: EventStatusEnum
    ) -> Optional[SecurityEvent]:
        """Updates the status of an existing security event."""
        event = self.get_event(event_id)
        if not event:
            return None
        event.status = new_status.value
        self.db.commit()
        self.db.refresh(event)
        return event

    def aggregate_metrics(self) -> EventMetricsSummary:
        """Calculates security metric counts for the SOC dashboard top cards."""
        total = self.db.query(func.count(SecurityEvent.id)).scalar() or 0
        critical = (
            self.db.query(func.count(SecurityEvent.id))
            .filter(SecurityEvent.severity == SeverityEnum.CRITICAL.value)
            .scalar()
            or 0
        )
        high = (
            self.db.query(func.count(SecurityEvent.id))
            .filter(SecurityEvent.severity == SeverityEnum.HIGH.value)
            .scalar()
            or 0
        )
        medium = (
            self.db.query(func.count(SecurityEvent.id))
            .filter(SecurityEvent.severity == SeverityEnum.MEDIUM.value)
            .scalar()
            or 0
        )
        low = (
            self.db.query(func.count(SecurityEvent.id))
            .filter(SecurityEvent.severity == SeverityEnum.LOW.value)
            .scalar()
            or 0
        )
        decoy_interactions = (
            self.db.query(func.count(SecurityEvent.id))
            .filter(SecurityEvent.event_type == EventTypeEnum.DECOY_ACCESS.value)
            .scalar()
            or 0
        )
        active_threats = (
            self.db.query(func.count(SecurityEvent.id))
            .filter(SecurityEvent.status.in_([EventStatusEnum.NEW.value, EventStatusEnum.INVESTIGATING.value]))
            .scalar()
            or 0
        )

        return EventMetricsSummary(
            total_events=total,
            critical_count=critical,
            high_count=high,
            medium_count=medium,
            low_count=low,
            decoy_interactions_count=decoy_interactions,
            active_threats_count=active_threats,
        )

    # ==========================================
    # Alert Queries
    # ==========================================

    def create_alert(
        self,
        event_id: str,
        severity: str,
        status: EventStatusEnum = EventStatusEnum.NEW,
    ) -> Alert:
        """Creates an actionable alert linked to a SecurityEvent."""
        alert = Alert(
            event_id=event_id,
            severity=severity,
            status=status.value,
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def get_alert(self, alert_id: str) -> Optional[Alert]:
        """Fetch alert by ID with linked security event."""
        return self.db.query(Alert).filter(Alert.id == alert_id).first()

    def list_alerts(
        self,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Alert], int, int]:
        """List alerts with pagination and filtering."""
        query = self.db.query(Alert)
        if severity:
            query = query.filter(Alert.severity == severity)
        if status:
            query = query.filter(Alert.status == status)

        total_count = query.count()
        page = max(1, page)
        page_size = max(1, min(100, page_size))
        total_pages = ceil(total_count / page_size) if total_count > 0 else 1
        offset = (page - 1) * page_size

        alerts = (
            query.order_by(desc(Alert.created_at))
            .offset(offset)
            .limit(page_size)
            .all()
        )
        return alerts, total_count, total_pages
