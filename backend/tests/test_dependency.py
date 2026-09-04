"""
Unit Tests for Dependency Analysis, Topological Sorting, and Cycle Resolution.
"""

import networkx as nx
from app.deception.dependency import DependencyAnalyzer


def test_dependency_analyzer_acyclic():
    """Test insertion order calculation on an acyclic graph."""
    G = nx.DiGraph()
    G.add_edge("customers", "orders")
    G.add_edge("orders", "payments")

    analyzer = DependencyAnalyzer()
    res = analyzer.compute_insertion_order(G)

    assert not res.has_cycles
    assert len(res.deferred_constraints) == 0
    assert res.insertion_order == ["customers", "orders", "payments"]


def test_dependency_analyzer_with_cycle():
    """Test cycle detection and automatic cycle breaking."""
    G = nx.DiGraph()
    # Cyclic: A -> B -> C -> A
    G.add_edge("table_a", "table_b", source_columns=["b_id"], target_columns=["id"], constraint_name="fk_a_b")
    G.add_edge("table_b", "table_c", source_columns=["c_id"], target_columns=["id"], constraint_name="fk_b_c")
    G.add_edge("table_c", "table_a", source_columns=["a_id"], target_columns=["id"], constraint_name="fk_c_a")

    analyzer = DependencyAnalyzer()
    cycles = analyzer.detect_cycles(G)
    assert len(cycles) > 0

    res = analyzer.compute_insertion_order(G)
    assert res.has_cycles
    assert len(res.deferred_constraints) == 1
    # Check that all 3 tables are in the insertion order
    assert set(res.insertion_order) == {"table_a", "table_b", "table_c"}
