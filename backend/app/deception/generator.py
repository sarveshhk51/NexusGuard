"""
Decoy Generation Master Orchestrator for NexusGuard.
Coordinates schema snapshots, graph topological analysis, synthetic data synthesis,
DDL generation, deployment execution, and metadata persistence.
"""

from datetime import datetime, timezone
import logging
from typing import Any
from sqlalchemy import select, desc
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from app.deception.constants import DECOY_SCHEMA_NAME, DeploymentStatus, VerificationStatus
from app.deception.ddl import DDLGenerator, DDLPlan
from app.deception.dependency import DependencyAnalyzer
from app.deception.deployment import DecoyDeploymentService
from app.deception.models import DecoyDeploymentRecord
from app.deception.synthetic_data import SyntheticDataEngine
from app.deception.verification import DecoyVerificationService, VerificationResult
from app.schema_intelligence.graph import SchemaGraphService
from app.schema_intelligence.normalization import FullSchemaSnapshot
from app.schema_intelligence.snapshot import SnapshotRepository

logger = logging.getLogger(__name__)


class DecoyGenerator:
    """Master service for orchestrating decoy lifecycle operations."""

    def __init__(
        self,
        graph_service: SchemaGraphService | None = None,
        dep_analyzer: DependencyAnalyzer | None = None,
        ddl_generator: DDLGenerator | None = None,
        deployer: DecoyDeploymentService | None = None,
    ):
        self.graph_service = graph_service or SchemaGraphService()
        self.dep_analyzer = dep_analyzer or DependencyAnalyzer()
        self.ddl_generator = ddl_generator or DDLGenerator()
        self.deployer = deployer or DecoyDeploymentService()

    def generate_decoy_plan(
        self,
        session: Session,
        target_id: int,
        rows_per_table: int = 50,
        snapshot_id: int | None = None,
        seed: int | None = 42,
    ) -> tuple[DecoyDeploymentRecord, dict[str, list[dict[str, Any]]]]:
        """
        Synthesize the deception environment metadata without immediate deployment:
        1. Fetch schema snapshot
        2. Build graph & topological order
        3. Generate synthetic data
        4. Build DDL plan
        5. Persist record with status=READY
        """
        # 1. Fetch snapshot
        if snapshot_id:
            snapshot = SnapshotRepository.get_snapshot(session, snapshot_id)
        else:
            snapshot = SnapshotRepository.get_latest_snapshot(session, target_id)

        if not snapshot:
            raise ValueError(f"No schema snapshot available for target ID {target_id}. Please reflect schema first.")

        # 2. Build graph & compute insertion sequence
        graph = self.graph_service.build_dependency_graph(snapshot)
        dep_result = self.dep_analyzer.compute_insertion_order(graph)
        insertion_order = dep_result.insertion_order

        # 3. Generate synthetic data
        synth_engine = SyntheticDataEngine(snapshot, rows_per_table=rows_per_table, seed=seed)
        dataset = synth_engine.generate_all(insertion_order, dep_result.deferred_constraints)

        # 4. Generate DDL plan
        ddl_plan = self.ddl_generator.generate_plan(snapshot, insertion_order)

        # 5. Summarize rows
        summary = {tbl: len(rows) for tbl, rows in dataset.items()}
        total_rows = sum(summary.values())

        # 6. Save or update deployment record
        record = DecoyDeploymentRecord(
            target_id=target_id,
            snapshot_id=snapshot_id or 1,
            decoy_schema=DECOY_SCHEMA_NAME,
            status=DeploymentStatus.READY,
            table_count=len(insertion_order),
            total_rows=total_rows,
            rows_per_table=rows_per_table,
            relationship_count=snapshot.total_relationships,
            ddl_plan=ddl_plan.model_dump(),
            synthetic_data_summary=summary,
            verification_status=VerificationStatus.PENDING,
        )
        session.add(record)
        session.commit()
        session.refresh(record)

        return record, dataset

    def deploy_decoy(
        self,
        session: Session,
        target_engine: Engine,
        deployment_id: int,
        dataset: dict[str, list[dict[str, Any]]],
    ) -> tuple[DecoyDeploymentRecord, VerificationResult]:
        """
        Deploy the prepared decoy to the target database and execute verification.
        """
        record = session.get(DecoyDeploymentRecord, deployment_id)
        if not record:
            raise ValueError(f"Decoy deployment record {deployment_id} not found.")

        # Fetch corresponding snapshot
        snapshot = SnapshotRepository.get_snapshot(session, record.snapshot_id)
        if not snapshot:
            snapshot = SnapshotRepository.get_latest_snapshot(session, record.target_id)
        if not snapshot:
            raise ValueError("Associated schema snapshot could not be found.")

        # Reconstruct DDLPlan
        ddl_plan = DDLPlan.model_validate(record.ddl_plan)

        # Update status to DEPLOYING
        record.status = DeploymentStatus.DEPLOYING
        session.commit()

        try:
            # Reconstruct insertion order from dataset keys
            insertion_order = list(dataset.keys())

            # Execute deployment
            ver_result = self.deployer.deploy(
                target_engine=target_engine,
                snapshot=snapshot,
                ddl_plan=ddl_plan,
                synthetic_data=dataset,
                insertion_order=insertion_order,
            )

            record.status = DeploymentStatus.DEPLOYED
            record.deployed_at = datetime.now(timezone.utc)
            record.verification_status = ver_result.status
            record.verification_details = ver_result.model_dump()
            record.error_message = None
            session.commit()
            session.refresh(record)

            return record, ver_result

        except Exception as e:
            record.status = DeploymentStatus.FAILED
            record.verification_status = VerificationStatus.FAILED
            record.error_message = str(e)
            session.commit()
            raise

    def remove_decoy(
        self,
        session: Session,
        target_engine: Engine,
        target_id: int,
    ) -> DecoyDeploymentRecord | None:
        """Drop the decoy schema from target and update deployment status to REMOVED."""
        stmt = (
            select(DecoyDeploymentRecord)
            .where(DecoyDeploymentRecord.target_id == target_id)
            .order_by(desc(DecoyDeploymentRecord.created_at))
            .limit(1)
        )
        record = session.execute(stmt).scalar_one_or_none()

        # Remove from physical database
        self.deployer.remove(target_engine)

        if record:
            record.status = DeploymentStatus.REMOVED
            record.removed_at = datetime.now(timezone.utc)
            session.commit()
            session.refresh(record)

        return record

    @staticmethod
    def get_latest_deployment(session: Session, target_id: int) -> DecoyDeploymentRecord | None:
        """Fetch the most recent deployment record for a target."""
        stmt = (
            select(DecoyDeploymentRecord)
            .where(DecoyDeploymentRecord.target_id == target_id)
            .order_by(desc(DecoyDeploymentRecord.created_at))
            .limit(1)
        )
        return session.execute(stmt).scalar_one_or_none()
