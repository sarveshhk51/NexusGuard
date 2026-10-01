"""
FastAPI Router for Security Events and Alerts.
NexusGuard Person 3 — REST API Endpoints for SOC Analyst Queries and Alert Lifecycle.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.compat.database import get_db
from app.security_events.schemas import (
    SecurityEventCreate,
    SecurityEventResponse,
    AlertResponse,
    AlertStatusUpdate,
    PaginatedResponse,
    EventMetricsSummary,
)
from app.security_events.service import SecurityEventService
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/api", tags=["Security Events & Alerts"])


# ==========================================
# Metrics & Aggregation (Must be before /{id})
# ==========================================

@router.get(
    "/events/metrics",
    response_model=EventMetricsSummary,
    summary="Get SOC Summary Metrics",
    description="Returns aggregate counts of events by severity, active threats, and decoy interactions for dashboard cards.",
)
def get_soc_metrics(db: Session = Depends(get_db)):
    service = SecurityEventService(db)
    return service.get_metrics()


# ==========================================
# Security Events Endpoints
# ==========================================

@router.post(
    "/events",
    response_model=SecurityEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest / Record Security Event",
    description="Persists a detected threat event. If severity is HIGH or CRITICAL, automatically escalates to create an Alert and broadcasts via WebSocket.",
)
async def create_security_event(
    event_in: SecurityEventCreate,
    db: Session = Depends(get_db),
):
    service = SecurityEventService(db)
    event, _ = service.record_event(event_in)

    # Broadcast to all connected SOC analysts over WebSocket
    event_response = SecurityEventResponse.model_validate(event)
    await ws_manager.broadcast_security_event(event_response)

    return event_response


@router.get(
    "/events",
    response_model=PaginatedResponse[SecurityEventResponse],
    summary="List Security Events",
    description="Query security events with multi-criteria filtering and pagination.",
)
def list_security_events(
    target_id: Optional[int] = Query(
        None, description="Filter by monitored database target ID"),
    severity: Optional[str] = Query(
        None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    status: Optional[str] = Query(
        None, description="Filter by lifecycle status (NEW, INVESTIGATING, RESOLVED, FALSE_POSITIVE)"),
    event_type: Optional[str] = Query(
        None, description="Filter by detection event type"),
    source_ip: Optional[str] = Query(
        None, description="Filter by client source IP address"),
    date_from: Optional[datetime] = Query(
        None, description="Start date/time (ISO 8601)"),
    date_to: Optional[datetime] = Query(
        None, description="End date/time (ISO 8601)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    service = SecurityEventService(db)
    return service.list_events(
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


@router.get(
    "/events/{event_id}",
    response_model=SecurityEventResponse,
    summary="Get Security Event by ID",
    description="Retrieve full details for a specific security event.",
)
def get_security_event(
    event_id: str,
    db: Session = Depends(get_db),
):
    service = SecurityEventService(db)
    event = service.get_event(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Security event '{event_id}' not found",
        )
    return event


# ==========================================
# Alerts Endpoints
# ==========================================

@router.get(
    "/alerts",
    response_model=PaginatedResponse[AlertResponse],
    summary="List Actionable Alerts",
    description="Query high-priority alerts with pagination and status/severity filtering.",
)
def list_alerts(
    severity: Optional[str] = Query(
        None, description="Filter by severity (HIGH, CRITICAL)"),
    status: Optional[str] = Query(
        None, description="Filter by lifecycle status (NEW, INVESTIGATING, RESOLVED, FALSE_POSITIVE)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    service = SecurityEventService(db)
    return service.list_alerts(
        severity=severity,
        status=status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/alerts/{alert_id}",
    response_model=AlertResponse,
    summary="Get Alert by ID",
    description="Retrieve alert details along with full linked security event telemetry.",
)
def get_alert(
    alert_id: str,
    db: Session = Depends(get_db),
):
    service = SecurityEventService(db)
    alert = service.get_alert(alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_id}' not found",
        )
    return alert


@router.patch(
    "/alerts/{alert_id}/status",
    response_model=AlertResponse,
    summary="Update Alert Status",
    description="Update the lifecycle status of an alert (e.g. acknowledge or resolve). Synchronizes linked security event status.",
)
def update_alert_status(
    alert_id: str,
    status_update: AlertStatusUpdate,
    db: Session = Depends(get_db),
):
    service = SecurityEventService(db)
    updated = service.update_alert_status(
        alert_id=alert_id,
        new_status=status_update.status,
        assigned_user_id=status_update.assigned_user_id,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_id}' not found",
        )
    return updated
