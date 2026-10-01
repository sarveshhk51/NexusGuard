"""
NexusGuard IP Containment Middleware.
Inspects incoming client IP addresses against the active blocked IP repository.
If an attacker IP has been blocked, immediately drops/rejects the connection with HTTP 403.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.compat.database import get_db, SessionLocal
from app.defense.service import DefenseService

# Endpoints that are always accessible even when under containment
WHITELIST_PATHS = {
    "/docs",
    "/openapi.json",
    "/redoc",
    "/health",
    "/api/health",
    "/api/defense/unblock",
    "/api/defense/simulate-attack",
    "/api/defense/blocked-ips",
    "/api/defense/block",
}


class IPContainmentMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow whitelisted documentation and simulation endpoints
        path = request.url.path
        if any(path.startswith(w) for w in WHITELIST_PATHS):
            return await call_next(request)

        # Determine client IP (honor reverse proxies if present)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif request.client and request.client.host:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        # Check against blocked IPs in database
        db = SessionLocal()
        try:
            defense = DefenseService(db)
            if defense.is_ip_blocked(client_ip):
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "IP_ACCESS_BLOCKED",
                        "detail": "Connection terminated by NexusGuard Active Defense.",
                        "client_ip": client_ip,
                        "mitigation": "Automated containment active. Contact SOC administrator.",
                    },
                )
        finally:
            db.close()

        return await call_next(request)
