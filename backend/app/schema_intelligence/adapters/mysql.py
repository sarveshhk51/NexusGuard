"""
MySQL Schema Reflection Adapter for NexusGuard.
Uses SQLAlchemy 2.x inspect() to discover databases, tables, columns, constraints, and indexes.
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


class MySQLReflectionAdapter(SchemaReflectionAdapter):
    """Reflects schema and table information from MySQL 8 databases."""

    SYSTEM_SCHEMAS = {
        "mysql",
        "information_schema",
        "performance_schema",
        "sys",
        "nexusguard_decoy",
    }

    def get_system_schemas(self) -> set[str]:
        return self.SYSTEM_SCHEMAS

    def reflect_schemas(self, engine: Engine) -> list[str]:
        inspector = inspect(engine)
        all_schemas = inspector.get_schema_names()
        # In MySQL, schema names correspond to database names
        return [s for s in all_schemas if s not in self.SYSTEM_SCHEMAS]

    def reflect_tables(self, engine: Engine, schema: str) -> list[str]:
        inspector = inspect(engine)
        return inspector.get_table_names(schema=schema)

    def reflect_columns(self, engine: Engine, schema: str, table: str) -> list[ColumnMetadata]:
        inspector = inspect(engine)
        raw_cols = inspector.get_columns(table, schema=schema)
        columns: list[ColumnMetadata] = []

        for col in raw_cols:
            col_name = col["name"]
            type_obj = col["type"]
            raw_type = str(type_obj)
            normalized_type = TypeNormalizer.normalize(raw_type, dialect="mysql")

            max_length = getattr(type_obj, "length", None)
            precision = getattr(type_obj, "precision", None)
            scale = getattr(type_obj, "scale", None)

            # Auto-increment flag check
            is_auto = col.get("autoincrement", False)
            default_val = str(col.get("default")) if col.get("default") is not None else None

            columns.append(
                ColumnMetadata(
                    name=col_name,
                    data_type=normalized_type,
                    raw_type=raw_type,
                    nullable=col.get("nullable", True),
                    default=default_val,
                    is_primary_key=False,
                    is_auto_increment=bool(is_auto),
                    max_length=max_length,
                    numeric_precision=precision,
                    numeric_scale=scale,
                )
            )
        return columns

    def reflect_primary_keys(self, engine: Engine, schema: str, table: str) -> list[str]:
        inspector = inspect(engine)
        pk_constraint = inspector.get_pk_constraint(table, schema=schema)
        return pk_constraint.get("constrained_columns", []) if pk_constraint else []

    def reflect_foreign_keys(self, engine: Engine, schema: str, table: str) -> list[ForeignKeyMetadata]:
        inspector = inspect(engine)
        raw_fks = inspector.get_foreign_keys(table, schema=schema)
        fks: list[ForeignKeyMetadata] = []

        for fk in raw_fks:
            target_schema = fk.get("referred_schema") or schema
            fks.append(
                ForeignKeyMetadata(
                    constraint_name=fk.get("name"),
                    source_schema=schema,
                    source_table=table,
                    source_columns=fk.get("constrained_columns", []),
                    target_schema=target_schema,
                    target_table=fk.get("referred_table", ""),
                    target_columns=fk.get("referred_columns", []),
                )
            )
        return fks

    def reflect_indexes(self, engine: Engine, schema: str, table: str) -> list[IndexMetadata]:
        inspector = inspect(engine)
        raw_indexes = inspector.get_indexes(table, schema=schema)
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
