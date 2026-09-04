"""
Compatibility Adapter Layer for NexusGuard.
Provides standalone database connection and session management during Person 2 development.
When merging with Person 1's code, this shim can either wrap or be replaced by Person 1's DatabaseAdapter.
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from app.schema_intelligence.models import Base as SchemaBase
from app.deception.models import DecoyDeployment as DeceptionBase


class DatabaseAdapterCompat:
    """
    Compatibility shim providing target database engines.
    Matches Person 1's DatabaseAdapter interface contract.
    """

    def __init__(self, connection_url: str):
        self.connection_url = connection_url
        self._engine: Engine = create_engine(connection_url, pool_pre_ping=True)

    def get_engine(self) -> Engine:
        """Return the active SQLAlchemy Engine instance."""
        return self._engine

    def test_connection(self) -> bool:
        """Verify database connectivity."""
        try:
            with self._engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    def disconnect(self) -> None:
        """Dispose of the engine connection pool."""
        self._engine.dispose()


# Standalone Metadata DB Engine and Session Factory
METADATA_DB_URL = os.getenv("METADATA_DATABASE_URL", "sqlite:///nexusguard_metadata.db")
metadata_engine = create_engine(
    METADATA_DB_URL,
    connect_args={"check_same_thread": False} if "sqlite" in METADATA_DB_URL else {},
)
MetadataSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=metadata_engine)


def init_metadata_db():
    """Initializes metadata database tables for snapshots and decoy deployments."""
    SchemaBase.metadata.create_all(bind=metadata_engine)
    DeceptionBase.metadata.create_all(bind=metadata_engine)


def get_metadata_db():
    """FastAPI dependency for obtaining a metadata DB session."""
    init_metadata_db()
    db = MetadataSessionLocal()
    try:
        yield db
    finally:
        db.close()
