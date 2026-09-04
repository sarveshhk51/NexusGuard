"""Schema Intelligence package for NexusGuard."""

from app.schema_intelligence.normalization import (
    ColumnMetadata,
    ForeignKeyMetadata,
    IndexMetadata,
    TableMetadata,
    SchemaMetadata,
    FullSchemaSnapshot,
    TypeNormalizer,
)
from app.schema_intelligence.reflection import SchemaReflectionService
from app.schema_intelligence.snapshot import SnapshotRepository
from app.schema_intelligence.graph import SchemaGraphService, ReactFlowGraph, TopologyMetrics

__all__ = [
    "ColumnMetadata",
    "ForeignKeyMetadata",
    "IndexMetadata",
    "TableMetadata",
    "SchemaMetadata",
    "FullSchemaSnapshot",
    "TypeNormalizer",
    "SchemaReflectionService",
    "SnapshotRepository",
    "SchemaGraphService",
    "ReactFlowGraph",
    "TopologyMetrics",
]
