"""
Schema Intelligence REST API Endpoints for NexusGuard.
Exposes reflection triggers, schema snapshots, and React Flow graph payloads for Person 4's SOC frontend.
"""

import os
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.compat.database_adapter import DatabaseAdapterCompat, get_metadata_db
from app.schema_intelligence.graph import ReactFlowGraph, SchemaGraphService
from app.schema_intelligence.normalization import FullSchemaSnapshot
from app.schema_intelligence.reflection import SchemaReflectionService
from app.schema_intelligence.snapshot import SnapshotRepository

router = APIRouter(prefix="/api/targets", tags=["Schema Intelligence"])

# Target connection resolver shim (reads environment variables or defaults)
def get_target_adapter(target_id: int) -> DatabaseAdapterCompat:
    """Resolves target database connection URL for a given target ID."""
    url = os.getenv(f"TARGET_{target_id}_URL")
    if not url:
        if target_id == 1:
            url = os.getenv("POSTGRES_TARGET_URL", "postgresql+psycopg2://nexusguard:nexusguard@localhost:5433/enterprise")
        elif target_id == 2:
            url = os.getenv("MYSQL_TARGET_URL", "mysql+pymysql://nexusguard:nexusguard@localhost:3306/enterprise")
        else:
            url = os.getenv("DEFAULT_TARGET_URL", f"sqlite:///target_demo_{target_id}.db")
    return DatabaseAdapterCompat(url)


@router.post(
    "/{target_id}/reflect",
    response_model=FullSchemaSnapshot,
    summary="Trigger Schema Reflection",
    description="Reflects tables, columns, primary keys, foreign keys, and indexes from the target database.",
)
def reflect_target_schema(
    target_id: int,
    session: Session = Depends(get_metadata_db),
):
    adapter = get_target_adapter(target_id)
    engine = adapter.get_engine()

    try:
        service = SchemaReflectionService.for_engine(engine)
        snapshot = service.reflect(engine, target_id=target_id)
        SnapshotRepository.save_snapshot(session, snapshot)
        return snapshot
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Schema reflection failed for target {target_id}: {str(e)}",
        )


@router.get(
    "/{target_id}/schema",
    response_model=FullSchemaSnapshot,
    summary="Get Latest Schema Snapshot",
    description="Returns the most recently reflected schema snapshot for the specified target.",
)
def get_latest_schema(
    target_id: int,
    session: Session = Depends(get_metadata_db),
):
    snapshot = SnapshotRepository.get_latest_snapshot(session, target_id)
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No schema snapshot exists for target {target_id}. Trigger reflection first.",
        )
    return snapshot


@router.get(
    "/{target_id}/graph",
    response_model=ReactFlowGraph,
    summary="Get Schema Dependency Graph for React Flow",
    description="Returns nodes, edges, and topological metrics formatted for direct rendering on Person 4's React Flow canvas.",
)
def get_schema_graph(
    target_id: int,
    session: Session = Depends(get_metadata_db),
):
    snapshot = SnapshotRepository.get_latest_snapshot(session, target_id)
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No schema snapshot found for target {target_id}. Run reflection first.",
        )
    graph_service = SchemaGraphService()
    return graph_service.to_react_flow(snapshot)


@router.get(
    "/{target_id}/snapshots",
    summary="List Schema Snapshots",
    description="Lists historical snapshot records for this target.",
)
def list_target_snapshots(
    target_id: int,
    session: Session = Depends(get_metadata_db),
):
    records = SnapshotRepository.list_snapshots(session, target_id)
    return [
        {
            "id": r.id,
            "target_id": r.target_id,
            "engine": r.engine,
            "captured_at": r.captured_at,
            "table_count": r.table_count,
            "relationship_count": r.relationship_count,
        }
        for r in records
    ]


@router.get(
    "/{target_id}/snapshots/{snapshot_id}",
    response_model=FullSchemaSnapshot,
    summary="Get Specific Schema Snapshot",
)
def get_specific_snapshot(
    target_id: int,
    snapshot_id: int,
    session: Session = Depends(get_metadata_db),
):
    snapshot = SnapshotRepository.get_snapshot(session, snapshot_id)
    if not snapshot or snapshot.target_id != target_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Snapshot ID {snapshot_id} not found for target {target_id}.",
        )
    return snapshot
