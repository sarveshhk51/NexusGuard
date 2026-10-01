"""
NexusGuard Active Defense Models.
Stores dynamically blocked malicious IP addresses and mitigation logs.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from app.schema_intelligence.models import Base


class BlockedIP(Base):
    __tablename__ = "nexusguard_blocked_ips"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ip_address = Column(String(64), unique=True, index=True, nullable=False)
    reason = Column(String(255), nullable=False)
    severity = Column(String(32), default="CRITICAL")
    query_snippet = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    blocked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    unblocked_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "ip_address": self.ip_address,
            "reason": self.reason,
            "severity": self.severity,
            "query_snippet": self.query_snippet,
            "is_active": self.is_active,
            "blocked_at": self.blocked_at.isoformat() if self.blocked_at else None,
            "unblocked_at": self.unblocked_at.isoformat() if self.unblocked_at else None,
        }
