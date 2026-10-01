"""
Compatibility Adapter Layer for NexusGuard.
Provides unified database connection and session management across all subsystems:
- Person 2: Schema Intelligence & Deception Engine
- Person 3: Detection Engine, Security Events & Alerts
- Active Defense: IP Containment & Blocklist
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

# Standalone Metadata DB Engine and Session Factory defined first to prevent circular imports
METADATA_DB_URL = os.getenv("METADATA_DATABASE_URL", "sqlite:///nexusguard_metadata.db")
metadata_engine = create_engine(
    METADATA_DB_URL,
    connect_args={"check_same_thread": False} if "sqlite" in METADATA_DB_URL else {},
    pool_pre_ping=True,
)
MetadataSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=metadata_engine)

# Aliases for Person 3 compatibility
engine = metadata_engine
SessionLocal = MetadataSessionLocal


class DatabaseAdapterCompat:
    """
    Compatibility shim providing target database engines.
    Matches Person 1's DatabaseAdapter interface contract.
    """

    def __init__(self, connection_url: str):
        self.connection_url = connection_url
        self._engine: Engine = create_engine(connection_url, pool_pre_ping=True)
        if "sqlite" in connection_url.lower():
            from sqlalchemy import event
            @event.listens_for(self._engine, "connect")
            def _auto_attach_decoy(dbapi_conn, _):
                try:
                    cur = dbapi_conn.cursor()
                    cur.execute("ATTACH DATABASE 'nexusguard_decoy.db' AS nexusguard_decoy;")
                    cur.close()
                except Exception:
                    pass

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


def init_metadata_db(target_engine=None):
    """Initializes all metadata database tables across all subsystems."""
    from app.schema_intelligence.models import Base as SchemaBase
    from app.deception.models import DecoyDeployment as DeceptionBase
    from app.security_events.models import Base as SecurityBase
    from app.defense.models import BlockedIP

    eng = target_engine or metadata_engine
    SchemaBase.metadata.create_all(bind=eng)
    DeceptionBase.metadata.create_all(bind=eng)
    SecurityBase.metadata.create_all(bind=eng)

    try:
        from app.compat.seed_demo import ensure_seed_security_events
        session = sessionmaker(bind=eng)()
        try:
            ensure_seed_security_events(session)
        finally:
            session.close()
    except Exception:
        pass


init_db = init_metadata_db


def get_metadata_db():
    """FastAPI dependency for obtaining a metadata DB session."""
    init_metadata_db()
    db = MetadataSessionLocal()
    try:
        yield db
    finally:
        db.close()


get_db = get_metadata_db
