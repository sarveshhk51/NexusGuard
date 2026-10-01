"""
DDL Generation Service for NexusGuard Deception.
Synthesizes isolated, safe DDL statements for PostgreSQL and MySQL decoy deployments.
"""

import logging
import re
from pydantic import BaseModel, Field
from app.deception.constants import DECOY_SCHEMA_NAME
from app.schema_intelligence.normalization import FullSchemaSnapshot, TableMetadata

logger = logging.getLogger(__name__)


class DDLPlan(BaseModel):
    """Execution plan containing ordered DDL commands and safe rollback routines."""
    engine: str
    decoy_schema: str = DECOY_SCHEMA_NAME
    schema_statements: list[str] = Field(default_factory=list)
    table_statements: list[str] = Field(default_factory=list)
    constraint_statements: list[str] = Field(default_factory=list)
    rollback_statements: list[str] = Field(default_factory=list)


class DDLGenerator:
    """Constructs dialect-specific DDL for creating the isolated deception asset."""

    @staticmethod
    def _quote_ident(ident: str, engine: str) -> str:
        """Sanitize and quote SQL identifiers to protect against injection."""
        # Strip dangerous characters
        clean = re.sub(r'[^a-zA-Z0-9_]', '', ident)
        if "mysql" in engine.lower():
            return f"`{clean}`"
        return f'"{clean}"'

    def generate_plan(self, snapshot: FullSchemaSnapshot, insertion_order: list[str]) -> DDLPlan:
        """Generate a complete DDLPlan matching the database engine."""
        engine_type = snapshot.engine.lower()
        if "mysql" in engine_type:
            return self.generate_mysql_ddl(snapshot, insertion_order)
        if "sqlite" in engine_type:
            return self.generate_sqlite_ddl(snapshot, insertion_order)
        return self.generate_postgresql_ddl(snapshot, insertion_order)

    def generate_postgresql_ddl(self, snapshot: FullSchemaSnapshot, insertion_order: list[str]) -> DDLPlan:
        """Generate PostgreSQL DDL targeting the 'nexusguard_decoy' schema."""
        plan = DDLPlan(engine="postgresql", decoy_schema=DECOY_SCHEMA_NAME)

        # 1. Create isolated schema
        plan.schema_statements.append(f'CREATE SCHEMA IF NOT EXISTS "{DECOY_SCHEMA_NAME}";')

        # 2. Tables in topological insertion order
        for table_key in insertion_order:
            table_meta = self._find_table(snapshot, table_key)
            if not table_meta:
                continue

            tbl_name = self._quote_ident(table_meta.table_name, "postgresql")
            col_defs: list[str] = []

            for col in table_meta.columns:
                c_name = self._quote_ident(col.name, "postgresql")
                c_type = self._map_pg_type(col.data_type)
                nullable = "" if col.nullable else " NOT NULL"
                col_defs.append(f"    {c_name} {c_type}{nullable}")

            # Primary Key constraint
            if table_meta.primary_keys:
                pk_cols = ", ".join(self._quote_ident(k, "postgresql") for k in table_meta.primary_keys)
                col_defs.append(f"    PRIMARY KEY ({pk_cols})")

            create_tbl = (
                f'CREATE TABLE IF NOT EXISTS "{DECOY_SCHEMA_NAME}".{tbl_name} (\n'
                + ",\n".join(col_defs)
                + "\n);"
            )
            plan.table_statements.append(create_tbl)

        # 3. Foreign Key constraints
        for schema in snapshot.schemas:
            for table in schema.tables:
                src_tbl = self._quote_ident(table.table_name, "postgresql")
                for fk in table.foreign_keys:
                    tgt_tbl = self._quote_ident(fk.target_table, "postgresql")
                    src_cols = ", ".join(self._quote_ident(c, "postgresql") for c in fk.source_columns)
                    tgt_cols = ", ".join(self._quote_ident(c, "postgresql") for c in fk.target_columns)
                    constraint_name = fk.constraint_name or f"fk_decoy_{table.table_name}_{fk.target_table}"
                    clean_cname = self._quote_ident(constraint_name, "postgresql")

                    alter_sql = (
                        f'ALTER TABLE "{DECOY_SCHEMA_NAME}".{src_tbl} '
                        f"ADD CONSTRAINT {clean_cname} "
                        f"FOREIGN KEY ({src_cols}) "
                        f'REFERENCES "{DECOY_SCHEMA_NAME}".{tgt_tbl} ({tgt_cols}) '
                        f"ON DELETE CASCADE;"
                    )
                    plan.constraint_statements.append(alter_sql)

        # 4. Rollback
        plan.rollback_statements.append(f'DROP SCHEMA IF EXISTS "{DECOY_SCHEMA_NAME}" CASCADE;')

        return plan

    def generate_mysql_ddl(self, snapshot: FullSchemaSnapshot, insertion_order: list[str]) -> DDLPlan:
        """Generate MySQL DDL targeting the 'nexusguard_decoy' database."""
        plan = DDLPlan(engine="mysql", decoy_schema=DECOY_SCHEMA_NAME)

        # 1. Create isolated database
        plan.schema_statements.append(
            f"CREATE DATABASE IF NOT EXISTS `{DECOY_SCHEMA_NAME}` "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        )

        # 2. Tables in topological insertion order
        for table_key in insertion_order:
            table_meta = self._find_table(snapshot, table_key)
            if not table_meta:
                continue

            tbl_name = self._quote_ident(table_meta.table_name, "mysql")
            col_defs: list[str] = []

            for col in table_meta.columns:
                c_name = self._quote_ident(col.name, "mysql")
                c_type = self._map_mysql_type(col.data_type)
                nullable = "" if col.nullable else " NOT NULL"
                col_defs.append(f"    {c_name} {c_type}{nullable}")

            if table_meta.primary_keys:
                pk_cols = ", ".join(self._quote_ident(k, "mysql") for k in table_meta.primary_keys)
                col_defs.append(f"    PRIMARY KEY ({pk_cols})")

            create_tbl = (
                f"CREATE TABLE IF NOT EXISTS `{DECOY_SCHEMA_NAME}`.{tbl_name} (\n"
                + ",\n".join(col_defs)
                + "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
            )
            plan.table_statements.append(create_tbl)

        # 3. Foreign Key constraints
        for schema in snapshot.schemas:
            for table in schema.tables:
                src_tbl = self._quote_ident(table.table_name, "mysql")
                for fk in table.foreign_keys:
                    tgt_tbl = self._quote_ident(fk.target_table, "mysql")
                    src_cols = ", ".join(self._quote_ident(c, "mysql") for c in fk.source_columns)
                    tgt_cols = ", ".join(self._quote_ident(c, "mysql") for c in fk.target_columns)
                    constraint_name = fk.constraint_name or f"fk_decoy_{table.table_name}_{fk.target_table}"
                    clean_cname = self._quote_ident(constraint_name, "mysql")

                    alter_sql = (
                        f"ALTER TABLE `{DECOY_SCHEMA_NAME}`.{src_tbl} "
                        f"ADD CONSTRAINT {clean_cname} "
                        f"FOREIGN KEY ({src_cols}) "
                        f"REFERENCES `{DECOY_SCHEMA_NAME}`.{tgt_tbl} ({tgt_cols}) "
                        f"ON DELETE CASCADE;"
                    )
                    plan.constraint_statements.append(alter_sql)

        # 4. Rollback
        plan.rollback_statements.append(f"DROP DATABASE IF EXISTS `{DECOY_SCHEMA_NAME}`;")

        return plan

    def _find_table(self, snapshot: FullSchemaSnapshot, table_key: str) -> TableMetadata | None:
        for schema in snapshot.schemas:
            for table in schema.tables:
                if f"{schema.schema_name}.{table.table_name}" == table_key or table.table_name == table_key:
                    return table
        return None

    @staticmethod
    def _map_pg_type(norm_type: str) -> str:
        upper = norm_type.upper()
        if "BOOLEAN" in upper:
            return "BOOLEAN"
        if "BIGINT" in upper:
            return "BIGINT"
        if "SMALLINT" in upper:
            return "SMALLINT"
        if "INTEGER" in upper or "INT" in upper:
            return "INTEGER"
        if "DOUBLE" in upper:
            return "DOUBLE PRECISION"
        if "FLOAT" in upper:
            return "REAL"
        if "DECIMAL" in upper or "NUMERIC" in upper:
            return upper
        if "TIMESTAMP" in upper:
            return "TIMESTAMP WITH TIME ZONE"
        if "DATE" in upper:
            return "DATE"
        if "TIME" in upper:
            return "TIME"
        if "UUID" in upper:
            return "VARCHAR(36)"  # Fallback to VARCHAR for portable UUID representation
        if "JSON" in upper:
            return "JSONB"
        if "TEXT" in upper:
            return "TEXT"
        if "VARCHAR" in upper:
            return upper
        return "VARCHAR(255)"

    @staticmethod
    def _map_mysql_type(norm_type: str) -> str:
        upper = norm_type.upper()
        if "BOOLEAN" in upper:
            return "TINYINT(1)"
        if "BIGINT" in upper:
            return "BIGINT"
        if "SMALLINT" in upper:
            return "SMALLINT"
        if "INTEGER" in upper or "INT" in upper:
            return "INT"
        if "DOUBLE" in upper:
            return "DOUBLE"
        if "FLOAT" in upper:
            return "FLOAT"
        if "DECIMAL" in upper or "NUMERIC" in upper:
            return upper
        if "TIMESTAMP" in upper or "DATETIME" in upper:
            return "DATETIME"
        if "DATE" in upper:
            return "DATE"
        if "TIME" in upper:
            return "TIME"
        if "UUID" in upper:
            return "VARCHAR(36)"
        if "JSON" in upper:
            return "JSON"
        if "TEXT" in upper:
            return "TEXT"
        if "VARCHAR" in upper:
            return upper
        return "VARCHAR(255)"

    def generate_sqlite_ddl(self, snapshot: FullSchemaSnapshot, insertion_order: list[str]) -> DDLPlan:
        """Generate SQLite DDL targeting the 'nexusguard_decoy' schema."""
        plan = DDLPlan(engine="sqlite", decoy_schema=DECOY_SCHEMA_NAME)

        # 1. Attach database (acts as schema in SQLite)
        plan.schema_statements.append(f"ATTACH DATABASE 'nexusguard_decoy.db' AS {DECOY_SCHEMA_NAME};")

        # 2. Tables in topological insertion order
        for table_key in insertion_order:
            table_meta = self._find_table(snapshot, table_key)
            if not table_meta:
                continue

            tbl_name = self._quote_ident(table_meta.table_name, "sqlite")
            col_defs: list[str] = []

            for col in table_meta.columns:
                c_name = self._quote_ident(col.name, "sqlite")
                c_type = self._map_sqlite_type(col.data_type)
                nullable = "" if col.nullable else " NOT NULL"
                col_defs.append(f"    {c_name} {c_type}{nullable}")

            if table_meta.primary_keys:
                pk_cols = ", ".join(self._quote_ident(k, "sqlite") for k in table_meta.primary_keys)
                col_defs.append(f"    PRIMARY KEY ({pk_cols})")

            drop_tbl = f'DROP TABLE IF EXISTS "{DECOY_SCHEMA_NAME}".{tbl_name};'
            plan.table_statements.append(drop_tbl)

            create_tbl = (
                f'CREATE TABLE IF NOT EXISTS "{DECOY_SCHEMA_NAME}".{tbl_name} (\n'
                + ",\n".join(col_defs)
                + "\n);"
            )
            plan.table_statements.append(create_tbl)

        # 3. Rollback
        plan.rollback_statements.append(f"DETACH DATABASE {DECOY_SCHEMA_NAME};")

        return plan

    @staticmethod
    def _map_sqlite_type(norm_type: str) -> str:
        upper = norm_type.upper()
        if "INT" in upper:
            return "INTEGER"
        if "FLOAT" in upper or "DOUBLE" in upper or "REAL" in upper:
            return "REAL"
        if "DECIMAL" in upper or "NUMERIC" in upper:
            return "NUMERIC"
        if "BLOB" in upper or "BYTEA" in upper or "BINARY" in upper:
            return "BLOB"
        return "TEXT"

