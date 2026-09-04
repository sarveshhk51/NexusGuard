"""
Unit Tests for DDL Generation for PostgreSQL and MySQL.
"""

from app.deception.constants import DECOY_SCHEMA_NAME
from app.deception.ddl import DDLGenerator
from app.deception.dependency import DependencyAnalyzer
from app.schema_intelligence.graph import SchemaGraphService
from app.schema_intelligence.reflection import SchemaReflectionService


def test_postgresql_ddl_generation(demo_target_engine):
    """Verify PostgreSQL DDL plan generation targeting nexusguard_decoy."""
    service = SchemaReflectionService.for_engine(demo_target_engine)
    snapshot = service.reflect(demo_target_engine, target_id=1)

    graph_service = SchemaGraphService()
    G = graph_service.build_dependency_graph(snapshot)
    dep_res = DependencyAnalyzer().compute_insertion_order(G)

    generator = DDLGenerator()
    plan = generator.generate_postgresql_ddl(snapshot, dep_res.insertion_order)

    assert plan.engine == "postgresql"
    assert plan.decoy_schema == DECOY_SCHEMA_NAME

    # Schema creation
    assert any(DECOY_SCHEMA_NAME in stmt for stmt in plan.schema_statements)

    # Table creation
    assert len(plan.table_statements) == 6
    for stmt in plan.table_statements:
        assert f'"{DECOY_SCHEMA_NAME}"' in stmt

    # Foreign key constraints
    assert len(plan.constraint_statements) >= 4

    # Rollback statements
    assert any("DROP SCHEMA" in stmt and "CASCADE" in stmt for stmt in plan.rollback_statements)


def test_mysql_ddl_generation(demo_target_engine):
    """Verify MySQL DDL plan generation targeting nexusguard_decoy."""
    service = SchemaReflectionService.for_engine(demo_target_engine)
    snapshot = service.reflect(demo_target_engine, target_id=1)

    graph_service = SchemaGraphService()
    G = graph_service.build_dependency_graph(snapshot)
    dep_res = DependencyAnalyzer().compute_insertion_order(G)

    generator = DDLGenerator()
    plan = generator.generate_mysql_ddl(snapshot, dep_res.insertion_order)

    assert plan.engine == "mysql"
    assert any("CREATE DATABASE" in stmt for stmt in plan.schema_statements)
    assert any("ENGINE=InnoDB" in stmt for stmt in plan.table_statements)
    assert any("DROP DATABASE" in stmt for stmt in plan.rollback_statements)
