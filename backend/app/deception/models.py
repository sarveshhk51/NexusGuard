"""
SQLAlchemy ORM Model for Decoy Deployments.
Tracks decoy generation parameters, deployment states, synthetic summaries, and verification results.
"""

from datetime import datetime, timezone
from typing import Any
from sqlalchemy import Integer, String, DateTime, JSON, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from app.deception.constants import DECOY_SCHEMA_NAME, DeploymentStatus


class DecoyDeployment(DeclarativeBase):
    pass


class DecoyDeploymentRecord(DecoyDeployment):
    """Database record representing a decoy deployment lifecycle on a target database."""
    __tablename__ = "decoy_deployments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    snapshot_id: Mapped[int] = mapped_column(Integer, nullable=False)
    decoy_schema: Mapped[str] = mapped_column(String(100), default=DECOY_SCHEMA_NAME)
    status: Mapped[str] = mapped_column(String(50), default=DeploymentStatus.GENERATING, index=True)

    table_count: Mapped[int] = mapped_column(Integer, default=0)
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    rows_per_table: Mapped[int] = mapped_column(Integer, default=50)
    relationship_count: Mapped[int] = mapped_column(Integer, default=0)

    # Stored payloads
    ddl_plan: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    synthetic_data_summary: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    # Verification state
    verification_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    verification_details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
    deployed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
