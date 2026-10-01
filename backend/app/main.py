"""
NexusGuard — Unified Cyber Deception Database Security Platform.
Integrates:
- Subsystem 2 (Person 2): Schema Intelligence & Synthetic Decoy Engine
- Subsystem 3 (Person 3): Detection Engine, Security Events, Alerts & WebSocket SOC Streaming
- Active Defense: Dynamic IP Containment, Webhook Notifications, and Live Attack Simulation
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.compat.database_adapter import init_metadata_db
from app.api.schema_intelligence import router as schema_router
from app.api.deception import router as deception_router
from app.security_events.router import router as security_events_router
from app.websocket.router import router as websocket_router
from app.defense.router import router as defense_router
from app.defense.middleware import IPContainmentMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Initializes metadata database tables upon startup across all subsystems.
    """
    init_metadata_db()
    yield


app = FastAPI(
    title="NexusGuard — Cyber Deception & Database Defense Platform",
    description=(
        "Next-generation cyber-deception database security platform. "
        "Provides automated schema reflection, topology-aware synthetic decoy generation, "
        "real-time threat detection, live WebSocket SOC broadcasting, and dynamic IP containment."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# 1. IP Containment Middleware (drops connections from banned attacker IPs)
app.add_middleware(IPContainmentMiddleware)

# 2. CORS setup for Person 4 Frontend (React / Vite / Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Mount all API Routers
app.include_router(schema_router)
app.include_router(deception_router)
app.include_router(security_events_router)
app.include_router(websocket_router)
app.include_router(defense_router)


@app.get("/", include_in_schema=False)
def root():
    """Redirect root access to Swagger interactive documentation."""
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    """Operational health check across all integrated subsystems."""
    return {
        "status": "healthy",
        "service": "NexusGuard Unified Cyber Deception Platform",
        "subsystems": {
            "subsystem_2": "Schema Intelligence & Deception Engine (Person 2)",
            "subsystem_3": "Threat Detection & WebSocket SOC (Person 3)",
            "active_defense": "Dynamic IP Containment & Webhook Mitigation",
        },
        "version": "1.0.0",
    }
