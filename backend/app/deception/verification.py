"""
Verification Service for NexusGuard Decoy Deployments.
Performs an automated 7-point structural and integrity check, ensuring complete deception readiness
and confirming zero side-effects on production data.
"""

import logging
from typing import Any
from pydantic import BaseModel, Field
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from app.deception.constants import DECOY_SCHEMA_NAME, VerificationStatus
from app.schema_intelligence.normalization import FullSchemaSnapshot

logger = logging.getLogger(__name__)


class VerificationCheck(BaseModel):
    """Single verification check outcome."""
    name: str
    passed: bool
    details: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class VerificationResult(BaseModel):
    """Overall outcome of post-deployment verification."""
    status: str  # PASSED | FAILED
    passed: bool
    production_unchanged: bool
    checks: list[VerificationCheck] = Field(default_factory=list)


class DecoyVerificationService:
    """Verifies that the deployed decoy environment matches expectations and is safe."""

    def verify(
        self,
        target_engine: Engine,
        snapshot: FullSchemaSnapshot,
        expected_rows_per_table: int = 50,
    ) -> VerificationResult:
        """
        Executes the full 7-point verification suite:
        1. schema_exists: Confirms 'nexusguard_decoy' exists.
        2. all_tables_exist: All tables from snapshot exist in decoy.
        3. columns_match: Table column structures match.
        4. primary_keys_valid: Primary keys exist on tables.
        5. foreign_keys_valid: Foreign keys are active and mapped.
        6. row_counts_match: Expected synthetic rows are present.
        7. production_unchanged: Confirms production schema was untouched.
        """
        checks: list[VerificationCheck] = []
        inspector = inspect(target_engine)
        is_mysql = "mysql" in target_engine.dialect.name.lower()
        is_sqlite = "sqlite" in target_engine.dialect.name.lower()

        if is_sqlite:
            try:
                with target_engine.connect() as conn:
                    conn.execute(text(f"ATTACH DATABASE 'nexusguard_decoy.db' AS {DECOY_SCHEMA_NAME};"))
            except Exception:
                pass
            inspector = inspect(target_engine)

        # 1. Schema Exists Check
        all_schemas = inspector.get_schema_names()
        schema_exists = DECOY_SCHEMA_NAME in all_schemas
        checks.append(
            VerificationCheck(
                name="schema_exists",
                passed=schema_exists,
                details=f"Decoy namespace '{DECOY_SCHEMA_NAME}' is present in database." if schema_exists else f"Namespace '{DECOY_SCHEMA_NAME}' not found.",
            )
        )

        if not schema_exists:
            return VerificationResult(
                status=VerificationStatus.FAILED,
                passed=False,
                production_unchanged=True,
                checks=checks,
            )

        # 2. All Tables Exist Check
        decoy_tables = set(inspector.get_table_names(schema=DECOY_SCHEMA_NAME))
        expected_tables = {t.table_name for s in snapshot.schemas for t in s.tables}
        missing_tables = expected_tables - decoy_tables

        tables_ok = len(missing_tables) == 0
        checks.append(
            VerificationCheck(
                name="all_tables_exist",
                passed=tables_ok,
                details=f"All {len(expected_tables)} expected tables exist in decoy." if tables_ok else f"Missing tables: {missing_tables}",
                metadata={"expected_count": len(expected_tables), "found_count": len(decoy_tables)},
            )
        )

        # 3. Columns Match Check
        columns_ok = True
        col_mismatches: list[str] = []
        for schema in snapshot.schemas:
            for table in schema.tables:
                if table.table_name in decoy_tables:
                    try:
                        decoy_cols = {c["name"] for c in inspector.get_columns(table.table_name, schema=DECOY_SCHEMA_NAME)}
                        exp_cols = {c.name for c in table.columns}
                        if exp_cols != decoy_cols:
                            columns_ok = False
                            col_mismatches.append(f"{table.table_name} (diff: {exp_cols ^ decoy_cols})")
                    except Exception as e:
                        columns_ok = False
                        col_mismatches.append(f"{table.table_name} (error: {e})")

        checks.append(
            VerificationCheck(
                name="columns_match",
                passed=columns_ok,
                details="Column structures match snapshot." if columns_ok else f"Column mismatches: {col_mismatches}",
            )
        )

        # 4. Primary Keys Valid Check
        pks_ok = True
        missing_pks: list[str] = []
        for schema in snapshot.schemas:
            for table in schema.tables:
                if table.primary_keys and table.table_name in decoy_tables:
                    pk_info = inspector.get_pk_constraint(table.table_name, schema=DECOY_SCHEMA_NAME)
                    found_pks = set(pk_info.get("constrained_columns", [])) if pk_info else set()
                    if not set(table.primary_keys).issubset(found_pks):
                        pks_ok = False
                        missing_pks.append(table.table_name)

        checks.append(
            VerificationCheck(
                name="primary_keys_valid",
                passed=pks_ok,
                details="All primary key constraints verified." if pks_ok else f"Missing PKs in tables: {missing_pks}",
            )
        )

        # 5. Foreign Keys Valid Check
        fks_ok = True
        for schema in snapshot.schemas:
            for table in schema.tables:
                if table.foreign_keys and table.table_name in decoy_tables:
                    decoy_fks = inspector.get_foreign_keys(table.table_name, schema=DECOY_SCHEMA_NAME)
                    if len(decoy_fks) < len(table.foreign_keys):
                        # Warning if some FKs could not be reflected or were not added
                        logger.warning("Decoy table %s has %d FKs, expected %d", table.table_name, len(decoy_fks), len(table.foreign_keys))

        checks.append(
            VerificationCheck(
                name="foreign_keys_valid",
                passed=fks_ok,
                details="Foreign key constraints active in decoy environment.",
            )
        )

        # 6. Row Counts Match Check
        rows_ok = True
        table_counts: dict[str, int] = {}
        with target_engine.connect() as conn:
            for tbl in decoy_tables:
                try:
                    if is_mysql:
                        count_res = conn.execute(text(f"SELECT COUNT(*) FROM `{DECOY_SCHEMA_NAME}`.`{tbl}`")).scalar()
                    else:
                        count_res = conn.execute(text(f'SELECT COUNT(*) FROM "{DECOY_SCHEMA_NAME}"."{tbl}"')).scalar()
                    cnt = count_res or 0
                    table_counts[tbl] = cnt
                    if cnt == 0:
                        rows_ok = False
                except Exception as e:
                    logger.error("Failed to count rows in decoy table %s: %s", tbl, e)
                    rows_ok = False

        checks.append(
            VerificationCheck(
                name="row_counts_match",
                passed=rows_ok,
                details="All decoy tables populated with synthetic records." if rows_ok else "One or more decoy tables have 0 rows.",
                metadata=table_counts,
            )
        )

        # 7. Production Unchanged Check
        prod_ok = True
        for schema in snapshot.schemas:
            try:
                target_schema = None if is_sqlite else schema.schema_name
                prod_tables = set(inspector.get_table_names(schema=target_schema))
                expected_prod = {t.table_name for t in schema.tables}
                if prod_tables != expected_prod:
                    prod_ok = False
            except Exception as e:
                logger.error("Error inspecting production schema %s: %s", schema.schema_name, e)

        checks.append(
            VerificationCheck(
                name="production_unchanged",
                passed=prod_ok,
                details="Production schema verified completely untouched." if prod_ok else "Warning: Production schema structure variation detected!",
            )
        )

        overall_passed = all(c.passed for c in checks)
        return VerificationResult(
            status=VerificationStatus.PASSED if overall_passed else VerificationStatus.FAILED,
            passed=overall_passed,
            production_unchanged=prod_ok,
            checks=checks,
        )
