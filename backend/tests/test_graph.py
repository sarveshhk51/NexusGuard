"""
Unit and Integration Tests for NetworkX Graph Builder & React Flow Export.
"""

from app.schema_intelligence.graph import SchemaGraphService
from app.schema_intelligence.reflection import SchemaReflectionService


def test_schema_graph_service(demo_target_engine):
    """Test NetworkX graph building and topological metrics."""
    service = SchemaReflectionService.for_engine(demo_target_engine)
    snapshot = service.reflect(demo_target_engine, target_id=1)

    graph_service = SchemaGraphService()
    G = graph_service.build_dependency_graph(snapshot)

    assert G.number_of_nodes() == 6
    assert G.number_of_edges() >= 4

    metrics = graph_service.get_topology_metrics(G)
    assert not metrics.has_cycles
    assert len(metrics.cycles) == 0

    # Check root tables (no parents: customers, products, employees)
    root_names = [r.split(".")[-1] for r in metrics.root_tables]
    assert "customers" in root_names
    assert "products" in root_names
    assert "employees" in root_names

    # Check topological order: customers must precede orders
    topo = [t.split(".")[-1] for t in metrics.dependency_order]
    assert topo.index("customers") < topo.index("orders")
    assert topo.index("products") < topo.index("order_items")
    assert topo.index("orders") < topo.index("order_items")


def test_react_flow_export(demo_target_engine):
    """Verify React Flow export format structure and properties."""
    service = SchemaReflectionService.for_engine(demo_target_engine)
    snapshot = service.reflect(demo_target_engine, target_id=1)

    graph_service = SchemaGraphService()
    rf_payload = graph_service.to_react_flow(snapshot)

    assert len(rf_payload.nodes) == 6
    assert len(rf_payload.edges) >= 4

    # Check node attributes
    for node in rf_payload.nodes:
        assert node.type == "tableNode"
        assert "x" in node.position and "y" in node.position
        assert "label" in node.data
        assert "columns" in node.data

    # Check edge attributes
    for edge in rf_payload.edges:
        assert edge.source
        assert edge.target
        assert edge.animated is True
        assert edge.type == "smoothstep"
