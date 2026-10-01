"""
NexusGuard Active Defense & Attack Simulator Router.
Provides endpoints for blocked IP management, webhook dispatch logs,
and live end-to-end attack simulation for demonstrations.
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.compat.database import get_db
from app.defense.service import DefenseService
from app.detection.engine import DetectionEngine
from app.detection.base import RawEvent
from app.security_events.service import SecurityEventService
from app.security_events.schemas import SecurityEventResponse
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/defense", tags=["Active Defense & Demonstration"])


class BlockIPRequest(BaseModel):
    ip_address: str = Field(..., json_schema_extra={"example": "192.168.1.105"})
    reason: str = Field(..., json_schema_extra={"example": "Unauthorized Decoy Table Access"})
    severity: str = Field(default="CRITICAL", json_schema_extra={"example": "CRITICAL"})
    query_snippet: Optional[str] = Field(None, json_schema_extra={"example": "SELECT * FROM nexusguard_decoy.users"})


class SimulateAttackRequest(BaseModel):
    scenario: str = Field(
        default="decoy_breach",
        description="Attack scenario: 'decoy_breach', 'reconnaissance', or 'brute_force'",
        json_schema_extra={"example": "decoy_breach"},
    )
    attacker_ip: str = Field(default="198.51.100.42", json_schema_extra={"example": "198.51.100.42"})
    attacker_user: str = Field(default="sqli_infiltrator", json_schema_extra={"example": "sqli_infiltrator"})
    target_id: int = Field(default=1, json_schema_extra={"example": 1})
    custom_query: Optional[str] = Field(
        None,
        json_schema_extra={"example": "SELECT username, password_hash FROM nexusguard_decoy.admin_credentials WHERE '1'='1'"},
    )


@router.get("/blocked-ips", summary="List All Blocked IPs")
def list_blocked_ips(
    active_only: bool = Query(True, description="Filter for currently active blocks only"),
    db: Session = Depends(get_db),
):
    defense = DefenseService(db)
    return defense.list_blocked_ips(active_only=active_only)


@router.post("/block", summary="Manually Block an IP Address")
def manually_block_ip(req: BlockIPRequest, db: Session = Depends(get_db)):
    defense = DefenseService(db)
    record = defense.block_ip(
        ip_address=req.ip_address,
        reason=req.reason,
        severity=req.severity,
        query_snippet=req.query_snippet,
    )
    return {"status": "blocked", "record": record.to_dict()}


@router.post("/unblock/{ip_address}", summary="Unblock an IP Address")
def unblock_ip(ip_address: str, db: Session = Depends(get_db)):
    defense = DefenseService(db)
    success = defense.unblock_ip(ip_address)
    if not success:
        raise HTTPException(status_code=404, detail=f"IP '{ip_address}' is not actively blocked")
    return {"status": "unblocked", "ip_address": ip_address}


@router.post(
    "/simulate-attack",
    summary="Live Demonstration: Execute End-to-End Attack Simulation",
    description=(
        "Simulates a live attack against the database decoy. "
        "Steps executed: 1) Threat query executed 2) Detection engine triggers 3) "
        "WebSocket alert broadcast 4) Outbound webhook sent 5) Attacker IP blocked."
    ),
)
async def simulate_attack(
    req: SimulateAttackRequest,
    db: Session = Depends(get_db),
):
    # 1. Determine attack query based on scenario
    if req.custom_query:
        query = req.custom_query
    elif req.scenario == "reconnaissance":
        query = "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema != 'sys'"
    elif req.scenario == "brute_force":
        query = "SELECT * FROM nexusguard_decoy.payment_vault LIMIT 10"
    else:  # default decoy_breach
        query = "SELECT username, password_hash FROM nexusguard_decoy.admin_credentials WHERE 1=1 --"

    # 2. Package telemetry as RawEvent
    raw_event = RawEvent(
        target_id=req.target_id,
        engine="mysql",
        database_name="production_crm",
        username=req.attacker_user,
        source_ip=req.attacker_ip,
        query=query,
    )

    # 3. Evaluate through Detection Engine (Person 3)
    detection_engine = DetectionEngine()
    detected_event = detection_engine.evaluate(raw_event)

    result_payload = {
        "scenario": req.scenario,
        "attacker": {
            "source_ip": req.attacker_ip,
            "username": req.attacker_user,
            "query": query,
        },
        "detection_engine": {
            "triggered": detected_event is not None,
            "rule_matched": detected_event.event_type.value if detected_event else None,
            "severity": detected_event.severity.value if detected_event else "BENIGN",
            "reason": detected_event.detection_reason if detected_event else "No threat detected",
        },
        "active_defense": {},
        "websocket_broadcast": False,
        "subsequent_probe_blocked": False,
    }

    if detected_event:
        # 4. Record event and create alert via Service (Person 3)
        service = SecurityEventService(db)
        event_model, alert_model = service.record_event(detected_event)

        # 5. Broadcast to WebSocket SOC clients (Person 3 / 4)
        event_response = SecurityEventResponse.model_validate(event_model)
        await ws_manager.broadcast_security_event(event_response)
        result_payload["websocket_broadcast"] = True
        result_payload["event_id"] = str(event_model.id)
        if alert_model:
            result_payload["alert_id"] = str(alert_model.id)

        # 6. Trigger Active Defense Mitigation: Block IP + Send Webhook
        defense = DefenseService(db)
        blocked_record = defense.block_ip(
            ip_address=req.attacker_ip,
            reason=f"Auto-mitigation: {detected_event.detection_reason}",
            severity=detected_event.severity.value,
            query_snippet=query,
        )

        webhook_result = await defense.dispatch_webhook_alert({
            "event_id": str(event_model.id),
            "threat_type": detected_event.event_type.value,
            "severity": detected_event.severity.value,
            "attacker_ip": req.attacker_ip,
            "query": query,
            "action": "IP_BLOCKED",
        })

        result_payload["active_defense"] = {
            "ip_block_status": "ACTIVATED",
            "blocked_ip": req.attacker_ip,
            "reason": blocked_record.reason,
            "webhook_dispatch": webhook_result,
        }

        # 7. Demonstrate attacker lockout
        is_blocked = defense.is_ip_blocked(req.attacker_ip)
        result_payload["subsequent_probe_blocked"] = is_blocked

    return result_payload
