"""
Deception Engine REST API Endpoints for NexusGuard.
Exposes decoy generation, isolated schema deployment, verification, and removal controls.
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.schema_intelligence import get_target_adapter
from app.compat.database_adapter import get_metadata_db
from app.deception.constants import DECOY_SCHEMA_NAME, DeploymentStatus
from app.deception.generator import DecoyGenerator
from app.deception.verification import DecoyVerificationService, VerificationResult
from app.schema_intelligence.snapshot import SnapshotRepository

router = APIRouter(prefix="/api/targets", tags=["Deception Engine"])

# Ephemeral cache to hold generated datasets between generate and deploy steps
_DATASET_CACHE: dict[int, dict[str, list[dict[str, Any]]]] = {}


class DecoyGenerateRequest(BaseModel):
    rows_per_table: int = Field(default=50, ge=1, le=1000)
    snapshot_id: int | None = None
    seed: int | None = 42


class DecoyDeployRequest(BaseModel):
    deployment_id: int


class DecoyDeleteRequest(BaseModel):
    confirm: bool = True


@router.post(
    "/{target_id}/decoy/generate",
    summary="Generate Synthetic Decoy Plan",
    description="Generates topology-aware synthetic data and DDL statements without deploying them yet.",
)
def generate_decoy(
    target_id: int,
    payload: DecoyGenerateRequest = DecoyGenerateRequest(),
    session: Session = Depends(get_metadata_db),
):
    generator = DecoyGenerator()
    try:
        record, dataset = generator.generate_decoy_plan(
            session=session,
            target_id=target_id,
            rows_per_table=payload.rows_per_table,
            snapshot_id=payload.snapshot_id,
            seed=payload.seed,
        )
        # Store in cache for deployment execution
        _DATASET_CACHE[record.id] = dataset

        return {
            "deployment_id": record.id,
            "target_id": record.target_id,
            "status": record.status,
            "decoy_schema": record.decoy_schema,
            "table_count": record.table_count,
            "total_rows": record.total_rows,
            "rows_per_table": record.rows_per_table,
            "relationship_count": record.relationship_count,
            "synthetic_data_summary": record.synthetic_data_summary,
            "created_at": record.created_at,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Decoy generation failed: {str(e)}",
        )


@router.post(
    "/{target_id}/decoy/deploy",
    summary="Deploy Decoy to Target Database",
    description="Applies DDL, seeds synthetic data into the isolated decoy schema, and runs 7-point verification.",
)
def deploy_decoy(
    target_id: int,
    payload: DecoyDeployRequest,
    session: Session = Depends(get_metadata_db),
):
    dataset = _DATASET_CACHE.get(payload.deployment_id)
    generator = DecoyGenerator()

    # If dataset not in memory cache (e.g. server restart), regenerate dynamically
    if not dataset:
        target_adapter = get_target_adapter(target_id)
        record = DecoyGenerator.get_latest_deployment(session, target_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deployment record not found. Call /decoy/generate first.",
            )
        # Regenerate dataset
        rec, dataset = generator.generate_decoy_plan(
            session=session,
            target_id=target_id,
            rows_per_table=record.rows_per_table,
            snapshot_id=record.snapshot_id,
        )
        payload.deployment_id = rec.id

    target_adapter = get_target_adapter(target_id)
    target_engine = target_adapter.get_engine()

    try:
        record, ver_result = generator.deploy_decoy(
            session=session,
            target_engine=target_engine,
            deployment_id=payload.deployment_id,
            dataset=dataset,
        )
        return {
            "deployment_id": record.id,
            "target_id": record.target_id,
            "status": record.status,
            "decoy_schema": record.decoy_schema,
            "table_count": record.table_count,
            "total_rows": record.total_rows,
            "verification": ver_result.model_dump(),
            "deployed_at": record.deployed_at,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Decoy deployment failed: {str(e)}",
        )


@router.get(
    "/{target_id}/decoy",
    summary="Get Decoy Status",
    description="Returns the active decoy environment deployment state and verification status.",
)
def get_decoy_status(
    target_id: int,
    session: Session = Depends(get_metadata_db),
):
    record = DecoyGenerator.get_latest_deployment(session, target_id)
    if not record:
        return {
            "target_id": target_id,
            "status": "NONE",
            "message": "No deception asset deployed for this target.",
        }

    return {
        "deployment_id": record.id,
        "target_id": record.target_id,
        "status": record.status,
        "decoy_schema": record.decoy_schema,
        "table_count": record.table_count,
        "total_rows": record.total_rows,
        "rows_per_table": record.rows_per_table,
        "relationship_count": record.relationship_count,
        "synthetic_data_summary": record.synthetic_data_summary,
        "verification_status": record.verification_status,
        "verification_details": record.verification_details,
        "created_at": record.created_at,
        "deployed_at": record.deployed_at,
        "removed_at": record.removed_at,
        "error_message": record.error_message,
    }


@router.delete(
    "/{target_id}/decoy",
    summary="Remove Decoy Environment",
    description="Drops the isolated decoy schema and tables from the target database.",
)
def remove_decoy(
    target_id: int,
    payload: DecoyDeleteRequest = DecoyDeleteRequest(),
    session: Session = Depends(get_metadata_db),
):
    if not payload.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation required to drop decoy schema.",
        )

    target_adapter = get_target_adapter(target_id)
    target_engine = target_adapter.get_engine()
    generator = DecoyGenerator()

    try:
        record = generator.remove_decoy(session, target_engine, target_id)
        return {
            "target_id": target_id,
            "status": DeploymentStatus.REMOVED,
            "message": f"Decoy environment '{DECOY_SCHEMA_NAME}' successfully dropped.",
            "removed_at": record.removed_at if record else None,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove decoy: {str(e)}",
        )


@router.post(
    "/{target_id}/decoy/verify",
    response_model=VerificationResult,
    summary="Verify Decoy Health",
    description="Executes the 7-point structural and integrity check on an existing decoy.",
)
def verify_decoy(
    target_id: int,
    session: Session = Depends(get_metadata_db),
):
    snapshot = SnapshotRepository.get_latest_snapshot(session, target_id)
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No schema snapshot available for verification reference.",
        )

    target_adapter = get_target_adapter(target_id)
    target_engine = target_adapter.get_engine()
    verifier = DecoyVerificationService()
    return verifier.verify(target_engine, snapshot)
