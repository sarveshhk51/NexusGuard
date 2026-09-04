"""
Abstract Base Schema Reflection Adapter.
Defines the contract for dialect-specific reflection implementations.
"""

from abc import ABC, abstractmethod
from sqlalchemy.engine import Engine
from app.schema_intelligence.normalization import (
    ColumnMetadata,
    ForeignKeyMetadata,
    IndexMetadata,
    TableMetadata,
)


class SchemaReflectionAdapter(ABC):
    """Abstract interface for database-specific schema reflection."""

    @abstractmethod
    def get_system_schemas(self) -> set[str]:
        """Return system schema names that should be ignored during reflection."""
        ...

    @abstractmethod
    def reflect_schemas(self, engine: Engine) -> list[str]:
        """Discover available user schemas/databases on the target."""
        ...

    @abstractmethod
    def reflect_tables(self, engine: Engine, schema: str) -> list[str]:
        """Discover user table names in the specified schema."""
        ...

    @abstractmethod
    def reflect_columns(self, engine: Engine, schema: str, table: str) -> list[ColumnMetadata]:
        """Extract normalized column metadata for a given table."""
        ...

    @abstractmethod
    def reflect_primary_keys(self, engine: Engine, schema: str, table: str) -> list[str]:
        """Extract primary key column names."""
        ...

    @abstractmethod
    def reflect_foreign_keys(self, engine: Engine, schema: str, table: str) -> list[ForeignKeyMetadata]:
        """Extract foreign key constraints."""
        ...

    @abstractmethod
    def reflect_indexes(self, engine: Engine, schema: str, table: str) -> list[IndexMetadata]:
        """Extract index metadata."""
        ...

    def reflect_table_metadata(self, engine: Engine, schema: str, table: str) -> TableMetadata:
        """Helper to build a complete TableMetadata object."""
        columns = self.reflect_columns(engine, schema, table)
        primary_keys = self.reflect_primary_keys(engine, schema, table)
        foreign_keys = self.reflect_foreign_keys(engine, schema, table)
        indexes = self.reflect_indexes(engine, schema, table)

        # Mark PK flag on columns
        pk_set = set(primary_keys)
        for col in columns:
            if col.name in pk_set:
                col.is_primary_key = True

        return TableMetadata(
            schema_name=schema,
            table_name=table,
            columns=columns,
            primary_keys=primary_keys,
            foreign_keys=foreign_keys,
            indexes=indexes,
        )
