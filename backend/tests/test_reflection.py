"""
Unit and Integration Tests for Schema Reflection.
"""

from app.schema_intelligence.normalization import TypeNormalizer
from app.schema_intelligence.reflection import SchemaReflectionService


def test_type_normalizer():
    """Verify vendor-specific SQL type normalization."""
    assert TypeNormalizer.normalize("int4", "postgresql") == "INTEGER"
    assert TypeNormalizer.normalize("varchar(100)") == "VARCHAR(100)"
    assert TypeNormalizer.normalize("tinyint(1)", "mysql") == "BOOLEAN"
    assert TypeNormalizer.normalize("decimal(10,2)") == "DECIMAL(10,2)"
    assert TypeNormalizer.normalize("timestamp with time zone", "postgresql") == "TIMESTAMP"
    assert TypeNormalizer.normalize("jsonb", "postgresql") == "JSON"


def test_schema_reflection_service(demo_target_engine):
    """Reflect the 6-table enterprise demo database and verify extracted metadata."""
    service = SchemaReflectionService.for_engine(demo_target_engine)
    snapshot = service.reflect(demo_target_engine, target_id=1)

    assert snapshot.target_id == 1
    assert snapshot.total_tables == 6
    assert snapshot.total_relationships >= 4

    # Extract table names
    all_tables = {t.table_name for s in snapshot.schemas for t in s.tables}
    expected_tables = {"customers", "products", "orders", "order_items", "payments", "employees"}
    assert expected_tables.issubset(all_tables)

    # Inspect customers table
    customers_meta = next(t for s in snapshot.schemas for t in s.tables if t.table_name == "customers")
    col_names = {c.name for c in customers_meta.columns}
    assert {"customer_id", "name", "email", "phone"}.issubset(col_names)
    assert "customer_id" in customers_meta.primary_keys

    # Inspect orders table foreign keys
    orders_meta = next(t for s in snapshot.schemas for t in s.tables if t.table_name == "orders")
    fk_targets = {fk.target_table for fk in orders_meta.foreign_keys}
    assert "customers" in fk_targets
