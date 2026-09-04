"""
SQLAlchemy ORM models for Schema Intelligence.
Stores immutable schema snapshots in NexusGuard's metadata database.
"""

from datetime import datetime, timezone
from typing import Any
from sqlalchemy import Integer, String, DateTime, JSON, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class SchemaSnapshotRecord(Base):
    """
    Persistent, immutable record of a database schema snapshot.
    The full snapshot is stored as JSON in snapshot_data.
    """
    __tablename__ = "schema_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    engine: Mapped[str] = mapped_column(String(50), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    snapshot_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    table_count: Mapped[int] = mapped_column(Integer, default=0)
    relationship_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
