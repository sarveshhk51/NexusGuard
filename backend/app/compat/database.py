"""
Compatibility Database Session for Standalone Person 3 Operations.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.security_events.models import Base

METADATA_DB_URL = os.getenv("METADATA_DATABASE_URL", "sqlite:///nexusguard_metadata.db")

# If using SQLite, ensure multithread compatibility
is_sqlite = "sqlite" in METADATA_DB_URL
engine = create_engine(
    METADATA_DB_URL,
    connect_args={"check_same_thread": False} if is_sqlite else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db(target_engine=None):
    """Initializes tables for Person 3 models."""
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)


def get_db():
    """FastAPI database session dependency."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
