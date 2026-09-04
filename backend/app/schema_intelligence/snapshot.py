"""
Snapshot Persistence Service for NexusGuard.
Manages saving, retrieving, and listing immutable schema snapshots in the metadata DB.
"""

from typing import Sequence
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from app.schema_intelligence.models import SchemaSnapshotRecord
from app.schema_intelligence.normalization import FullSchemaSnapshot


class SnapshotRepository:
    """Repository handling database operations for schema snapshots."""

    @staticmethod
    def save_snapshot(session: Session, snapshot: FullSchemaSnapshot) -> SchemaSnapshotRecord:
        """Persist a new immutable schema snapshot."""
        # Convert Pydantic model to json-serializable dict
        snapshot_dict = snapshot.model_dump(mode="json")

        record = SchemaSnapshotRecord(
            target_id=snapshot.target_id,
            engine=snapshot.engine,
            captured_at=snapshot.captured_at,
            snapshot_data=snapshot_dict,
            table_count=snapshot.total_tables,
            relationship_count=snapshot.total_relationships,
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record

    @staticmethod
    def get_snapshot_record(session: Session, snapshot_id: int) -> SchemaSnapshotRecord | None:
        """Fetch snapshot database record by ID."""
        stmt = select(SchemaSnapshotRecord).where(SchemaSnapshotRecord.id == snapshot_id)
        return session.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_snapshot(session: Session, snapshot_id: int) -> FullSchemaSnapshot | None:
        """Fetch FullSchemaSnapshot Pydantic model by record ID."""
        record = SnapshotRepository.get_snapshot_record(session, snapshot_id)
        if not record:
            return None
        return FullSchemaSnapshot.model_validate(record.snapshot_data)

    @staticmethod
    def get_latest_snapshot_record(session: Session, target_id: int) -> SchemaSnapshotRecord | None:
        """Fetch the most recent snapshot database record for a target."""
        stmt = (
            select(SchemaSnapshotRecord)
            .where(SchemaSnapshotRecord.target_id == target_id)
            .order_by(desc(SchemaSnapshotRecord.captured_at))
            .limit(1)
        )
        return session.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_latest_snapshot(session: Session, target_id: int) -> FullSchemaSnapshot | None:
        """Fetch the most recent FullSchemaSnapshot for a target."""
        record = SnapshotRepository.get_latest_snapshot_record(session, target_id)
        if not record:
            return None
        return FullSchemaSnapshot.model_validate(record.snapshot_data)

    @staticmethod
    def list_snapshots(session: Session, target_id: int) -> Sequence[SchemaSnapshotRecord]:
        """List all snapshots for a given target, ordered newest first."""
        stmt = (
            select(SchemaSnapshotRecord)
            .where(SchemaSnapshotRecord.target_id == target_id)
            .order_by(desc(SchemaSnapshotRecord.captured_at))
        )
        return session.execute(stmt).scalars().all()
