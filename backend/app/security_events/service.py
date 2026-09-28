"""
Security Events and Alerts Service Layer.
NexusGuard Person 3 — Business logic, auto-alert escalation, lifecycle transitions, and audit integration.
"""

from datetime import datetime, timezone
from typing import Optional, Tuple, Callable, Any
from sqlalchemy.orm import Session

from app.security_events.models import (
    SecurityEvent,
    Alert,
    SeverityEnum,
    EventStatusEnum,
)
from app.security_events.schemas import (
    SecurityEventCreate,
    SecurityEventResponse,
    AlertResponse,
    PaginatedResponse,
    EventMetricsSummary,
)
from app.security_events.repository import SecurityEventRepository


class SecurityEventService:
    """
    Coordinates threat lifecycle, alert escalation, validation, and audit recording.
    """

    def __init__(self, db: Session, audit_logger: Optional[Callable[[str, str, str, Any], None]] = None):
        """
        :param db: SQLAlchemy metadata database session
        :param audit_logger: Optional callback from Person 1's audit service (action, resource_type, resource_id, metadata)
        """
        self.db = db
        self.repo = SecurityEventRepository(db)
        self.audit_logger = audit_logger

    def record_event(self, event_in: SecurityEventCreate) -> Tuple[SecurityEvent, Optional[Alert]]:
        """
        Records a detected threat.
        If severity is HIGH or CRITICAL, automatically escalates to create an actionable Alert.
        """
        # 1. Persist the normalized event
        event = self.repo.create_event(event_in)

        # 2. Automatically escalate HIGH and CRITICAL events into SOC Alerts
        alert = None
        if event.severity in [SeverityEnum.CRITICAL.value, SeverityEnum.HIGH.value]:
            alert = self.repo.create_alert(
                event_id=event.id,
                severity=event.severity,
                status=EventStatusEnum.NEW,
            )

        return event, alert

    def get_event(self, event_id: str) -> Optional[SecurityEventResponse]:
        """Retrieve a security event by ID."""
        event = self.repo.get_event(event_id)
        if not event:
            return None
        return SecurityEventResponse.model_validate(event)

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
    ) -> PaginatedResponse[SecurityEventResponse]:
        """Query security events with filtering and pagination."""
        items, total, total_pages = self.repo.list_events(
            target_id=target_id,
            severity=severity,
            status=status,
            event_type=event_type,
            source_ip=source_ip,
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size,
        )

        return PaginatedResponse[SecurityEventResponse](
            items=[SecurityEventResponse.model_validate(e) for e in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    def list_alerts(
        self,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedResponse[AlertResponse]:
        """Query alerts with filtering and pagination."""
        items, total, total_pages = self.repo.list_alerts(
            severity=severity,
            status=status,
            page=page,
            page_size=page_size,
        )

        return PaginatedResponse[AlertResponse](
            items=[AlertResponse.model_validate(a) for a in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    def get_alert(self, alert_id: str) -> Optional[AlertResponse]:
        """Retrieve an alert with full linked event details."""
        alert = self.repo.get_alert(alert_id)
        if not alert:
            return None
        return AlertResponse.model_validate(alert)

    def update_alert_status(
        self,
        alert_id: str,
        new_status: EventStatusEnum,
        assigned_user_id: Optional[int] = None,
    ) -> Optional[AlertResponse]:
        """
        Transition an alert's status (NEW -> INVESTIGATING -> RESOLVED / FALSE_POSITIVE).
        Updates timestamps, synchronizes the underlying event status, and emits audit logs.
        """
        alert = self.repo.get_alert(alert_id)
        if not alert:
            return None

        old_status = alert.status
        now = datetime.now(timezone.utc)

        # Update lifecycle timestamps
        if new_status == EventStatusEnum.INVESTIGATING and not alert.acknowledged_at:
            alert.acknowledged_at = now
        elif new_status in [EventStatusEnum.RESOLVED, EventStatusEnum.FALSE_POSITIVE]:
            alert.resolved_at = now

        if assigned_user_id is not None:
            alert.assigned_user_id = assigned_user_id

        alert.status = new_status.value

        # Synchronize linked event status
        if alert.security_event:
            alert.security_event.status = new_status.value

        self.db.commit()
        self.db.refresh(alert)

        # Emit audit log if audit service is attached
        if self.audit_logger:
            self.audit_logger(
                action="UPDATE_ALERT_STATUS",
                resource_type="ALERT",
                resource_id=alert.id,
                metadata={
                    "previous_status": old_status,
                    "new_status": new_status.value,
                    "assigned_user_id": assigned_user_id,
                },
            )

        return AlertResponse.model_validate(alert)

    def get_metrics(self) -> EventMetricsSummary:
        """Fetch real-time metrics for SOC dashboard."""
        return self.repo.aggregate_metrics()
