"""
NexusGuard Active Defense Service.
Handles automated IP containment, outbound webhook notifications, and mitigation state.
"""

import os
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import httpx
from sqlalchemy.orm import Session
from app.defense.models import BlockedIP

logger = logging.getLogger("nexusguard.defense")

# Default or configured security webhook URL (e.g. Discord, Slack, SIEM)
SECURITY_WEBHOOK_URL = os.getenv("SECURITY_WEBHOOK_URL", "")


class DefenseService:
    def __init__(self, db: Session):
        self.db = db

    def is_ip_blocked(self, ip_address: str) -> bool:
        """Checks if an IP address is actively blocked."""
        record = (
            self.db.query(BlockedIP)
            .filter(BlockedIP.ip_address == ip_address, BlockedIP.is_active == True)
            .first()
        )
        return record is not None

    def block_ip(
        self,
        ip_address: str,
        reason: str,
        severity: str = "CRITICAL",
        query_snippet: Optional[str] = None,
    ) -> BlockedIP:
        """Adds or reactivates an IP in the active firewall blocklist."""
        existing = (
            self.db.query(BlockedIP)
            .filter(BlockedIP.ip_address == ip_address)
            .first()
        )
        if existing:
            existing.is_active = True
            existing.reason = reason
            existing.severity = severity
            existing.query_snippet = query_snippet
            existing.blocked_at = datetime.now(timezone.utc)
            existing.unblocked_at = None
            self.db.commit()
            self.db.refresh(existing)
            logger.warning(f"Reactivated block for IP: {ip_address} ({reason})")
            return existing

        new_block = BlockedIP(
            ip_address=ip_address,
            reason=reason,
            severity=severity,
            query_snippet=query_snippet,
            is_active=True,
            blocked_at=datetime.now(timezone.utc),
        )
        self.db.add(new_block)
        self.db.commit()
        self.db.refresh(new_block)
        logger.warning(f"Actively blocked attacker IP: {ip_address} ({reason})")
        return new_block

    def unblock_ip(self, ip_address: str) -> bool:
        """Removes an active block for an IP address."""
        record = (
            self.db.query(BlockedIP)
            .filter(BlockedIP.ip_address == ip_address, BlockedIP.is_active == True)
            .first()
        )
        if not record:
            return False

        record.is_active = False
        record.unblocked_at = datetime.now(timezone.utc)
        self.db.commit()
        logger.info(f"Unblocked IP: {ip_address}")
        return True

    def unblock_all(self) -> int:
        """Removes active blocks for all IPs in the firewall blocklist."""
        records = (
            self.db.query(BlockedIP)
            .filter(BlockedIP.is_active == True)
            .all()
        )
        now = datetime.now(timezone.utc)
        count = len(records)
        for r in records:
            r.is_active = False
            r.unblocked_at = now
        self.db.commit()
        logger.info(f"Unblocked all ({count}) IPs")
        return count

    def list_blocked_ips(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Retrieves list of blocked IPs for SOC display."""
        query = self.db.query(BlockedIP)
        if active_only:
            query = query.filter(BlockedIP.is_active == True)
        records = query.order_by(BlockedIP.blocked_at.desc()).all()
        return [r.to_dict() for r in records]

    async def dispatch_webhook_alert(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dispatches outbound HTTP POST notification to external SIEM or webhook.
        Fulfills teacher requirement: 'sends requests, block ip etc etc'.
        """
        webhook_data = {
            "platform": "NexusGuard Cyber Deception Engine",
            "action": "AUTOMATED_CONTAINMENT_DISPATCH",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": payload,
        }

        if SECURITY_WEBHOOK_URL:
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.post(SECURITY_WEBHOOK_URL, json=webhook_data)
                    return {
                        "status": "delivered",
                        "status_code": resp.status_code,
                        "destination": SECURITY_WEBHOOK_URL,
                        "payload": webhook_data,
                    }
            except Exception as exc:
                logger.error(f"Failed to post to webhook: {exc}")
                return {
                    "status": "delivery_failed",
                    "error": str(exc),
                    "destination": SECURITY_WEBHOOK_URL,
                    "payload": webhook_data,
                }
        else:
            # Simulated webhook dispatch log (for local demos)
            logger.info(f"[OUTBOUND REQUEST DISPATCHED]: {webhook_data}")
            return {
                "status": "simulated_sent",
                "status_code": 200,
                "destination": "Mock Security Webhook / SIEM",
                "payload": webhook_data,
            }
