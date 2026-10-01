"""
Decoy Deployment and Lifecycle Execution Engine for NexusGuard.
Safely executes DDL, seeds referentially consistent synthetic data, and manages rollbacks.
"""

from datetime import datetime, timezone
import logging
from typing import Any
from sqlalchemy import MetaData, Table, insert, text
from sqlalchemy.engine import Engine
from app.deception.constants import DECOY_SCHEMA_NAME, DeploymentStatus, VerificationStatus
from app.deception.ddl import DDLPlan
from app.deception.verification import DecoyVerificationService, VerificationResult
from app.schema_intelligence.normalization import FullSchemaSnapshot

import sqlite3
from decimal import Decimal

try:
    sqlite3.register_adapter(Decimal, float)
except Exception:
    pass

logger = logging.getLogger(__name__)


class DeploymentExecutionError(Exception):
    """Raised when an unrecoverable error occurs during decoy deployment."""
    pass


class DecoyDeploymentService:
    """Executes DDL deployment plans, seeds data, and performs rollback upon error."""

    def __init__(self, verifier: DecoyVerificationService | None = None):
        self.verifier = verifier or DecoyVerificationService()

    def deploy(
        self,
        target_engine: Engine,
        snapshot: FullSchemaSnapshot,
        ddl_plan: DDLPlan,
        synthetic_data: dict[str, list[dict[str, Any]]],
        insertion_order: list[str],
    ) -> VerificationResult:
        """
        Deploy the deception environment:
        1. Execute schema creation
        2. Execute table creation (dependency order)
        3. Insert synthetic rows
        4. Apply foreign key constraints
        5. Verify deployment with 7-point suite
        6. On failure: trigger automatic rollback
        """
        logger.info("Initiating decoy deployment to target (%s engine)", ddl_plan.engine)
        is_mysql = "mysql" in target_engine.dialect.name.lower()
        is_sqlite = "sqlite" in target_engine.dialect.name.lower()

        if is_sqlite:
            from sqlalchemy import event
            @event.listens_for(target_engine, "connect")
            def _auto_attach(dbapi_conn, _):
                try:
                    cur = dbapi_conn.cursor()
                    cur.execute(f"ATTACH DATABASE 'nexusguard_decoy.db' AS {DECOY_SCHEMA_NAME};")
                    cur.close()
                except Exception:
                    pass

        try:
            with target_engine.begin() as conn:
                if is_sqlite:
                    try:
                        conn.execute(text(f"ATTACH DATABASE 'nexusguard_decoy.db' AS {DECOY_SCHEMA_NAME};"))
                    except Exception:
                        pass
                # 1. Execute schema creation statements
                for stmt in ddl_plan.schema_statements:
                    logger.debug("Executing schema statement: %s", stmt)
                    try:
                        conn.execute(text(stmt))
                    except Exception as e:
                        if is_sqlite and "already in use" in str(e).lower():
                            logger.info("Decoy schema already attached in SQLite connection")
                        else:
                            raise

                # 2. Execute table creation statements
                for stmt in ddl_plan.table_statements:
                    logger.debug("Executing table statement: %s", stmt)
                    conn.execute(text(stmt))

            # 3. Seed synthetic data (table by table in insertion order)
            # Use separate transaction for bulk insert
            metadata = MetaData()
            with target_engine.begin() as conn:
                for table_key in insertion_order:
                    rows = synthetic_data.get(table_key, [])
                    if not rows:
                        continue

                    raw_table_name = table_key.split(".")[-1]
                    logger.info("Inserting %d synthetic rows into %s.%s", len(rows), DECOY_SCHEMA_NAME, raw_table_name)

                    # Reflect or construct Table object to bind insert
                    table_obj = Table(raw_table_name, metadata, autoload_with=target_engine, schema=DECOY_SCHEMA_NAME)

                    # Sanitize Decimals for SQLite
                    if is_sqlite:
                        sanitized_rows = []
                        for r in rows:
                            sanitized_rows.append({
                                k: float(v) if isinstance(v, Decimal) else v
                                for k, v in r.items()
                            })
                        rows = sanitized_rows

                    conn.execute(insert(table_obj), rows)

            # 4. Apply Foreign Key constraints
            with target_engine.begin() as conn:
                for stmt in ddl_plan.constraint_statements:
                    try:
                        conn.execute(text(stmt))
                    except Exception as e:
                        logger.warning("Could not apply FK constraint '%s': %s", stmt, e)

            # 5. Run Verification Suite
            logger.info("Running post-deployment verification suite")
            ver_result = self.verifier.verify(target_engine, snapshot)

            if not ver_result.passed:
                logger.warning("Verification failed: %s", [c.name for c in ver_result.checks if not c.passed])

            return ver_result

        except Exception as exc:
            logger.error("Error encountered during decoy deployment. Rolling back: %s", exc)
            self._rollback(target_engine, ddl_plan)
            raise DeploymentExecutionError(f"Deployment failed and was rolled back safely: {exc}") from exc

    def remove(self, target_engine: Engine, ddl_plan: DDLPlan | None = None) -> bool:
        """Removes the isolated deception schema and all contained decoy tables."""
        logger.info("Removing decoy environment '%s'", DECOY_SCHEMA_NAME)
        dialect_name = target_engine.dialect.name.lower()
        is_mysql = "mysql" in dialect_name
        is_sqlite = "sqlite" in dialect_name

        try:
            with target_engine.begin() as conn:
                if is_mysql:
                    conn.execute(text(f"DROP DATABASE IF EXISTS `{DECOY_SCHEMA_NAME}`;"))
                elif is_sqlite:
                    import os
                    try:
                        conn.execute(text(f"DETACH DATABASE {DECOY_SCHEMA_NAME};"))
                    except Exception:
                        pass
                    if os.path.exists("nexusguard_decoy.db"):
                        try:
                            os.remove("nexusguard_decoy.db")
                        except Exception:
                            pass
                else:
                    conn.execute(text(f'DROP SCHEMA IF EXISTS "{DECOY_SCHEMA_NAME}" CASCADE;'))
            logger.info("Decoy environment dropped successfully.")
            return True
        except Exception as e:
            logger.error("Failed to remove decoy environment: %s", e)
            raise DeploymentExecutionError(f"Failed to remove decoy schema: {e}") from e

    def _rollback(self, target_engine: Engine, ddl_plan: DDLPlan) -> None:
        """Executes predefined rollback statements from the DDLPlan."""
        try:
            with target_engine.begin() as conn:
                for stmt in ddl_plan.rollback_statements:
                    conn.execute(text(stmt))
            logger.info("Rollback executed cleanly.")
        except Exception as e:
            logger.critical("Rollback execution error: %s", e)
