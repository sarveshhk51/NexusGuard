"""
NexusGuard Active Defense Module.
Provides dynamic IP containment, firewall rules, and SIEM webhook alerts.
"""

from app.defense.models import BlockedIP
from app.defense.service import DefenseService

__all__ = ["BlockedIP", "DefenseService"]
