"""
NexusGuard Active Defense Module.
Provides dynamic IP containment, firewall rules, and SIEM webhook alerts.
"""

from app.defense.models import BlockedIP

__all__ = ["BlockedIP"]
