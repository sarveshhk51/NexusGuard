"""
NexusGuard Cyber Deception Platform — Core Backend Application.
Person 3: Detection Engine, Security Events, Alerts & WebSocket SOC Streaming.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.compat.database import init_db
from app.security_events.router import router as security_events_router
from app.websocket.router import router as websocket_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Initializes metadata database tables upon startup.
    """
    init_db()
    yield


app = FastAPI(
    title="NexusGuard Cyber Deception Engine API",
    description=(
        "Enterprise database cyber deception platform. "
        "Provides decoy monitoring telemetry, real-time threat detection, "
        "automated alert escalation, and live WebSocket SOC broadcasting."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Cross-Origin Resource Sharing (CORS) setup for Frontend (Person 4)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Person 3 Routers
app.include_router(security_events_router)
app.include_router(websocket_router)


@app.get("/", include_in_schema=False)
def root():
    """Redirect root access to Swagger interactive documentation."""
    return RedirectResponse(url="/docs")


@app.get(
    "/health",
    tags=["System"],
    summary="System Health Check",
    description="Returns operational status of the NexusGuard Deception Engine.",
)
def health_check():
    return {
        "status": "healthy",
        "service": "NexusGuard Cyber Deception Engine",
        "version": "1.0.0",
    }
