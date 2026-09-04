"""
Schema Reflection Orchestrator for NexusGuard.
Coordinates dialect-specific reflection adapters to build complete, normalized FullSchemaSnapshot objects.
"""

from datetime import datetime, timezone
import logging
from sqlalchemy.engine import Engine
from app.schema_intelligence.adapters.base import SchemaReflectionAdapter
from app.schema_intelligence.adapters.postgres import PostgresReflectionAdapter
from app.schema_intelligence.adapters.mysql import MySQLReflectionAdapter
from app.schema_intelligence.normalization import (
    FullSchemaSnapshot,
    SchemaMetadata,
    TableMetadata,
)

logger = logging.getLogger(__name__)


class SchemaReflectionService:
    """Orchestrates schema reflection across different database engines."""

    def __init__(self, adapter: SchemaReflectionAdapter):
        self.adapter = adapter

    @classmethod
    def for_engine(cls, engine: Engine) -> "SchemaReflectionService":
        """Factory method to instantiate the correct adapter based on engine dialect."""
        dialect_name = engine.dialect.name.lower()
        if "postgres" in dialect_name:
            return cls(PostgresReflectionAdapter())
        elif "mysql" in dialect_name:
            return cls(MySQLReflectionAdapter())
        else:
            # Default to postgres-compatible reflection for general relational DBs (e.g. SQLite in unit tests)
            logger.warning(
                "Dialect '%s' not explicitly postgres or mysql; falling back to PostgresReflectionAdapter",
                dialect_name,
            )
            return cls(PostgresReflectionAdapter())

    @classmethod
    def for_engine_type(cls, engine_type: str) -> "SchemaReflectionService":
        """Factory method based on string identifier ('postgresql' or 'mysql')."""
        normalized = engine_type.lower().strip()
        if "postgres" in normalized:
            return cls(PostgresReflectionAdapter())
        elif "mysql" in normalized:
            return cls(MySQLReflectionAdapter())
        else:
            return cls(PostgresReflectionAdapter())

    def reflect(self, engine: Engine, target_id: int) -> FullSchemaSnapshot:
        """
        Execute full metadata reflection for the target database:
        1. Discover schemas/databases
        2. Discover all tables in each schema
        3. Discover columns, primary keys, foreign keys, and indexes for each table
        4. Calculate summary metrics (total tables, relationships)
        5. Return an immutable FullSchemaSnapshot
        """
        dialect_name = engine.dialect.name.lower()
        engine_str = "postgresql" if "postgres" in dialect_name else ("mysql" if "mysql" in dialect_name else dialect_name)
        captured_at = datetime.now(timezone.utc)

        discovered_schemas: list[SchemaMetadata] = []
        total_tables = 0
        total_relationships = 0

        # Discover schemas
        schema_names = self.adapter.reflect_schemas(engine)
        if not schema_names:
            # If no explicit schemas found (e.g. SQLite or default search path), use default
            schema_names = ["public"]

        for s_name in schema_names:
            try:
                table_names = self.adapter.reflect_tables(engine, schema=s_name)
            except Exception as e:
                logger.error("Failed to list tables in schema %s: %s", s_name, e)
                continue

            schema_tables: list[TableMetadata] = []
            for t_name in table_names:
                try:
                    table_meta = self.adapter.reflect_table_metadata(engine, schema=s_name, table=t_name)
                    schema_tables.append(table_meta)
                    total_tables += 1
                    total_relationships += len(table_meta.foreign_keys)
                except Exception as e:
                    logger.error("Failed to reflect table %s.%s: %s", s_name, t_name, e)
                    continue

            if schema_tables:
                discovered_schemas.append(
                    SchemaMetadata(
                        schema_name=s_name,
                        tables=schema_tables,
                    )
                )

        return FullSchemaSnapshot(
            target_id=target_id,
            engine=engine_str,
            captured_at=captured_at,
            schemas=discovered_schemas,
            total_tables=total_tables,
            total_relationships=total_relationships,
        )
