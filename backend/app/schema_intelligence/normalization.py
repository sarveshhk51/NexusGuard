"""
Schema Normalization & Metadata Models for NexusGuard.
Converts raw database inspection results into unified, validated Pydantic data models.
"""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class ColumnMetadata(BaseModel):
    """Metadata representing a single database table column."""
    name: str
    data_type: str  # Normalized type string, e.g. "INTEGER", "VARCHAR(255)", "BOOLEAN"
    raw_type: str   # Original dialect-specific type string from inspector
    nullable: bool = True
    default: str | None = None
    is_primary_key: bool = False
    is_auto_increment: bool = False
    max_length: int | None = None
    numeric_precision: int | None = None
    numeric_scale: int | None = None


class ForeignKeyMetadata(BaseModel):
    """Metadata representing a foreign key relationship between tables."""
    constraint_name: str | None = None
    source_schema: str
    source_table: str
    source_columns: list[str]  # Supports composite foreign keys
    target_schema: str
    target_table: str
    target_columns: list[str]


class IndexMetadata(BaseModel):
    """Metadata representing an index on a table."""
    name: str
    columns: list[str]
    is_unique: bool = False


class TableMetadata(BaseModel):
    """Complete metadata for a single database table."""
    schema_name: str
    table_name: str
    columns: list[ColumnMetadata] = Field(default_factory=list)
    primary_keys: list[str] = Field(default_factory=list)
    foreign_keys: list[ForeignKeyMetadata] = Field(default_factory=list)
    indexes: list[IndexMetadata] = Field(default_factory=list)
    row_count_estimate: int | None = None


class SchemaMetadata(BaseModel):
    """Metadata for a schema (or database in MySQL) containing tables."""
    schema_name: str
    tables: list[TableMetadata] = Field(default_factory=list)


class FullSchemaSnapshot(BaseModel):
    """
    Immutable representation of an entire database schema snapshot.
    This model serves as the data contract consumed by the NetworkX graph,
    the synthetic data generator, and Person 4's frontend.
    """
    target_id: int
    engine: str  # "postgresql" or "mysql"
    captured_at: datetime
    schemas: list[SchemaMetadata] = Field(default_factory=list)
    total_tables: int = 0
    total_relationships: int = 0


class TypeNormalizer:
    """Normalizes vendor-specific SQL types into consistent standard types."""

    @staticmethod
    def normalize(raw_type_str: str, dialect: str = "generic") -> str:
        upper = raw_type_str.upper().strip()

        # Handle parameterized types (VARCHAR, CHAR, DECIMAL, NUMERIC)
        if "VARCHAR" in upper:
            return upper
        if "CHAR" in upper and "VAR" not in upper:
            return upper
        if "DECIMAL" in upper or "NUMERIC" in upper:
            return upper

        # Integer variations
        if any(t in upper for t in ["INT8", "BIGINT"]):
            return "BIGINT"
        if any(t in upper for t in ["INT2", "SMALLINT", "TINYINT"]):
            if dialect == "mysql" and "TINYINT(1)" in upper:
                return "BOOLEAN"
            return "SMALLINT"
        if any(t in upper for t in ["INT", "INTEGER", "INT4", "MEDIUMINT", "SERIAL"]):
            return "INTEGER"

        # Boolean
        if any(t in upper for t in ["BOOL", "BOOLEAN"]):
            return "BOOLEAN"

        # Floating point
        if any(t in upper for t in ["DOUBLE", "FLOAT8"]):
            return "DOUBLE"
        if any(t in upper for t in ["FLOAT", "REAL", "FLOAT4"]):
            return "FLOAT"

        # Temporal
        if "TIMESTAMP" in upper or "DATETIME" in upper:
            return "TIMESTAMP"
        if "TIME" in upper:
            return "TIME"
        if "DATE" in upper:
            return "DATE"

        # Text / Binary / JSON / UUID
        if "UUID" in upper:
            return "UUID"
        if "JSON" in upper:
            return "JSON"
        if "TEXT" in upper:
            return "TEXT"
        if any(t in upper for t in ["BLOB", "BYTEA", "BINARY"]):
            return "BLOB"

        return upper
