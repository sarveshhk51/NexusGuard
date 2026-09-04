"""API routers package."""

from app.api.schema_intelligence import router as schema_router
from app.api.deception import router as deception_router

__all__ = ["schema_router", "deception_router"]
