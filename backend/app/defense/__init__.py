"""
NexusGuard Active Defense Module.
Provides dynamic IP containment, firewall rules, and SIEM webhook alerts.
"""

from app.defense.models import BlockedIP
from app.defense.service import DefenseService
from app.defense.middleware import IPContainmentMiddleware
from app.defense.router import router as defense_router

__all__ = ["BlockedIP", "DefenseService", "IPContainmentMiddleware", "defense_router"]
