"""
PostgreSQL Schema Reflection Adapter for NexusGuard.
Uses SQLAlchemy 2.x inspect() to discover schemas, tables, columns, constraints, and indexes.
"""

from typing import Any
from sqlalchemy import inspect
from sqlalchemy.engine import Engine
from app.schema_intelligence.adapters.base import SchemaReflectionAdapter
from app.schema_intelligence.normalization import (
    ColumnMetadata,
    ForeignKeyMetadata,
    IndexMetadata,
    TypeNormalizer,
)


class PostgresReflectionAdapter(SchemaReflectionAdapter):
    """Reflects schema information from PostgreSQL databases."""

    SYSTEM_SCHEMAS = {
        "pg_catalog",
        "information_schema",
        "pg_toast",
        "nexusguard_decoy",  # Never reflect the decoy as production
    }

    def get_system_schemas(self) -> set[str]:
        return self.SYSTEM_SCHEMAS

    def reflect_schemas(self, engine: Engine) -> list[str]:
        inspector = inspect(engine)
        all_schemas = inspector.get_schema_names()
        # Filter out system and temp schemas
        return [
            s for s in all_schemas
            if s not in self.SYSTEM_SCHEMAS and not s.startswith("pg_temp")
        ]

    def reflect_tables(self, engine: Engine, schema: str) -> list[str]:
        inspector = inspect(engine)
        if engine.dialect.name == "sqlite":
            return inspector.get_table_names()
        return inspector.get_table_names(schema=schema)

    def reflect_columns(self, engine: Engine, schema: str, table: str) -> list[ColumnMetadata]:
        inspector = inspect(engine)
        target_schema = None if engine.dialect.name == "sqlite" else schema
        raw_cols = inspector.get_columns(table, schema=target_schema)
        columns: list[ColumnMetadata] = []

        for col in raw_cols:
            col_name = col["name"]
            type_obj = col["type"]
            raw_type = str(type_obj)
            normalized_type = TypeNormalizer.normalize(raw_type, dialect="postgresql")

            # Extract precision / length if available
            max_length = getattr(type_obj, "length", None)
            precision = getattr(type_obj, "precision", None)
            scale = getattr(type_obj, "scale", None)

            # Check if auto increment / serial
            default_val = str(col.get("default")) if col.get("default") is not None else None
            is_auto = False
            if default_val and ("nextval" in default_val or "identity" in default_val.lower()):
                is_auto = True

            columns.append(
                ColumnMetadata(
                    name=col_name,
                    data_type=normalized_type,
                    raw_type=raw_type,
                    nullable=col.get("nullable", True),
                    default=default_val,
                    is_primary_key=False,  # Updated in reflect_table_metadata
                    is_auto_increment=is_auto,
                    max_length=max_length,
                    numeric_precision=precision,
                    numeric_scale=scale,
                )
            )
        return columns

    def reflect_primary_keys(self, engine: Engine, schema: str, table: str) -> list[str]:
        inspector = inspect(engine)
        target_schema = None if engine.dialect.name == "sqlite" else schema
        pk_constraint = inspector.get_pk_constraint(table, schema=target_schema)
        return pk_constraint.get("constrained_columns", []) if pk_constraint else []

    def reflect_foreign_keys(self, engine: Engine, schema: str, table: str) -> list[ForeignKeyMetadata]:
        inspector = inspect(engine)
        target_schema = None if engine.dialect.name == "sqlite" else schema
        raw_fks = inspector.get_foreign_keys(table, schema=target_schema)
        fks: list[ForeignKeyMetadata] = []

        for fk in raw_fks:
            target_schema_name = fk.get("referred_schema") or schema
            fks.append(
                ForeignKeyMetadata(
                    constraint_name=fk.get("name"),
                    source_schema=schema,
                    source_table=table,
                    source_columns=fk.get("constrained_columns", []),
                    target_schema=target_schema_name,
                    target_table=fk.get("referred_table", ""),
                    target_columns=fk.get("referred_columns", []),
                )
            )
        return fks

    def reflect_indexes(self, engine: Engine, schema: str, table: str) -> list[IndexMetadata]:
        inspector = inspect(engine)
        target_schema = None if engine.dialect.name == "sqlite" else schema
        raw_indexes = inspector.get_indexes(table, schema=target_schema)
        indexes: list[IndexMetadata] = []

        for idx in raw_indexes:
            indexes.append(
                IndexMetadata(
                    name=idx.get("name") or f"idx_{table}",
                    columns=idx.get("column_names", []),
                    is_unique=idx.get("unique", False),
                )
            )
        return indexes
