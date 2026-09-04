"""
NexusGuard FastAPI Backend Application.
Person 2 Subsystem: Schema Intelligence & Deception Engine.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.schema_intelligence import router as schema_router
from app.api.deception import router as deception_router
from app.compat.database_adapter import init_metadata_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize metadata tables on startup
    init_metadata_db()
    yield


app = FastAPI(
    title="NexusGuard — Deception-Driven Database Security",
    description="Schema Intelligence, Topology-Aware Synthetic Decoy Generation, and Isolated Deployment Platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# Health endpoints
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "NexusGuard Schema & Deception Engine",
        "subsystem": "Person 2",
        "version": "1.0.0",
    }

# Include routers
app.include_router(schema_router)
app.include_router(deception_router)
