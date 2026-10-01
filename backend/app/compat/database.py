"""
Compatibility Re-export for Person 3 database imports.
Points directly to the unified metadata engine and session provider.
"""

from app.compat.database_adapter import (
    engine,
    SessionLocal,
    MetadataSessionLocal,
    metadata_engine,
    init_db,
    init_metadata_db,
    get_db,
    get_metadata_db,
    METADATA_DB_URL,
)

__all__ = [
    "engine",
    "SessionLocal",
    "MetadataSessionLocal",
    "metadata_engine",
    "init_db",
    "init_metadata_db",
    "get_db",
    "get_metadata_db",
    "METADATA_DB_URL",
]
