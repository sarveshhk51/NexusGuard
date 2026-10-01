"""
NexusGuard Active Defense Module.
"""
from app.defense.models import BlockedIP
from app.defense.service import DefenseService

__all__ = [
    "BlockedIP",
    "DefenseService",
]
