"""
NexusGuard Active Defense Module.
"""
from app.defense.models import BlockedIP
from app.defense.service import DefenseService
from app.defense.router import router as defense_router
from app.defense.middleware import IPContainmentMiddleware

__all__ = [
    "BlockedIP",
    "DefenseService",
    "defense_router",
    "IPContainmentMiddleware",
]
