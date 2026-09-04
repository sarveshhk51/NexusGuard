"""
NetworkX Graph and React Flow Visualization Service for NexusGuard.
Constructs directed dependency graphs from schema snapshots, performs topological analysis,
and generates formatted node/edge payloads for Person 4's React Flow canvas.
"""

from typing import Any
import networkx as nx
from pydantic import BaseModel, Field
from app.schema_intelligence.normalization import FullSchemaSnapshot, TableMetadata


class TopologyMetrics(BaseModel):
    """Calculated topological metrics for a database schema graph."""
    total_nodes: int
    total_edges: int
    connected_components: int
    root_tables: list[str]  # Tables with no FK dependencies (parents)
    leaf_tables: list[str]  # Tables not referenced by any other table
    has_cycles: bool
    cycles: list[list[str]] = Field(default_factory=list)
    dependency_order: list[str] = Field(default_factory=list)  # Insertion order (parents first)


class ReactFlowNode(BaseModel):
    """React Flow compatible node format."""
    id: str
    type: str = "tableNode"
    position: dict[str, float]
    data: dict[str, Any]


class ReactFlowEdge(BaseModel):
    """React Flow compatible edge format."""
    id: str
    source: str
    target: str
    sourceHandle: str | None = None
    targetHandle: str | None = None
    type: str = "smoothstep"
    animated: bool = True
    data: dict[str, Any] = Field(default_factory=dict)


class ReactFlowGraph(BaseModel):
    """Complete React Flow export payload."""
    nodes: list[ReactFlowNode]
    edges: list[ReactFlowEdge]
    topology: TopologyMetrics


class SchemaGraphService:
    """Builds and analyzes NetworkX graphs and exports to React Flow."""

    @staticmethod
    def _table_key(schema_name: str, table_name: str) -> str:
        return f"{schema_name}.{table_name}"

    def build_dependency_graph(self, snapshot: FullSchemaSnapshot) -> nx.DiGraph:
        """
        Builds a directed dependency graph where:
        Edge: ParentTable -> ChildTable (Child depends on Parent).
        This makes topological sort directly produce the parent-first data insertion order.
        """
        G = nx.DiGraph()

        # Add all tables as nodes with full metadata
        for schema in snapshot.schemas:
            for table in schema.tables:
                node_id = self._table_key(schema.schema_name, table.table_name)
                G.add_node(
                    node_id,
                    table_name=table.table_name,
                    schema_name=schema.schema_name,
                    columns=[c.model_dump() for c in table.columns],
                    primary_keys=table.primary_keys,
                    column_count=len(table.columns),
                    foreign_keys=[fk.model_dump() for fk in table.foreign_keys],
                    indexes=[idx.model_dump() for idx in table.indexes],
                )

        # Add directed edges: Parent -> Child (parent must exist before child)
        for schema in snapshot.schemas:
            for table in schema.tables:
                child_id = self._table_key(schema.schema_name, table.table_name)
                for fk in table.foreign_keys:
                    parent_id = self._table_key(fk.target_schema, fk.target_table)
                    if parent_id in G:
                        G.add_edge(
                            parent_id,
                            child_id,
                            constraint_name=fk.constraint_name,
                            source_columns=fk.source_columns,
                            target_columns=fk.target_columns,
                            child_id=child_id,
                            parent_id=parent_id,
                        )

        return G

    def get_topology_metrics(self, G: nx.DiGraph) -> TopologyMetrics:
        """Analyze graph structure and compute topological metrics."""
        total_nodes = G.number_of_nodes()
        total_edges = G.number_of_edges()

        # Weakly connected components
        undirected_copy = G.to_undirected()
        components = list(nx.connected_components(undirected_copy)) if total_nodes > 0 else []
        connected_components = len(components)

        # Root tables: in-degree == 0 (no dependencies on other tables)
        root_tables = [node for node, in_degree in G.in_degree() if in_degree == 0]

        # Leaf tables: out-degree == 0 (no other table depends on this table)
        leaf_tables = [node for node, out_degree in G.out_degree() if out_degree == 0]

        # Cycle detection
        cycles: list[list[str]] = []
        has_cycles = not nx.is_directed_acyclic_graph(G)
        if has_cycles:
            try:
                cycles = list(nx.simple_cycles(G))
            except Exception:
                cycles = []

        # Dependency order (topological sort)
        dependency_order: list[str] = []
        if not has_cycles and total_nodes > 0:
            dependency_order = list(nx.topological_sort(G))
        else:
            # If cycles exist, return approximate order
            dependency_order = list(G.nodes())

        return TopologyMetrics(
            total_nodes=total_nodes,
            total_edges=total_edges,
            connected_components=connected_components,
            root_tables=root_tables,
            leaf_tables=leaf_tables,
            has_cycles=has_cycles,
            cycles=cycles,
            dependency_order=dependency_order,
        )

    def to_react_flow(self, snapshot: FullSchemaSnapshot) -> ReactFlowGraph:
        """
        Builds the graph, calculates hierarchical coordinates, and outputs
        the complete React Flow specification.
        """
        G = self.build_dependency_graph(snapshot)
        metrics = self.get_topology_metrics(G)

        # Calculate hierarchical layout levels (layers)
        node_levels: dict[str, int] = {}
        if not metrics.has_cycles and metrics.total_nodes > 0:
            # Compute topological generations
            for level, generation in enumerate(nx.topological_generations(G)):
                for node in generation:
                    node_levels[node] = level
        else:
            # Fallback: based on in_degree
            for node in G.nodes():
                node_levels[node] = G.in_degree(node)

        # Group nodes by level for horizontal positioning
        levels: dict[int, list[str]] = {}
        for node, lvl in node_levels.items():
            levels.setdefault(lvl, []).append(node)

        # Layout parameters
        X_START = 80.0
        X_SPACING = 340.0
        Y_START = 60.0
        Y_SPACING = 240.0

        react_nodes: list[ReactFlowNode] = []
        for lvl, node_list in levels.items():
            y_pos = Y_START + (lvl * Y_SPACING)
            for idx, node_id in enumerate(node_list):
                x_pos = X_START + (idx * X_SPACING)
                node_data = G.nodes[node_id]

                react_nodes.append(
                    ReactFlowNode(
                        id=node_id,
                        type="tableNode",
                        position={"x": x_pos, "y": y_pos},
                        data={
                            "label": node_data.get("table_name", node_id),
                            "schema": node_data.get("schema_name", "public"),
                            "columns": node_data.get("columns", []),
                            "primary_keys": node_data.get("primary_keys", []),
                            "column_count": node_data.get("column_count", 0),
                            "is_root": node_id in metrics.root_tables,
                            "in_degree": G.in_degree(node_id),
                            "out_degree": G.out_degree(node_id),
                        },
                    )
                )

        # Build React Flow edges (child -> parent for visual schema clarity)
        react_edges: list[ReactFlowEdge] = []
        edge_counter = 1
        for parent_id, child_id, attrs in G.edges(data=True):
            source_cols = attrs.get("source_columns", [])
            target_cols = attrs.get("target_columns", [])
            source_handle = source_cols[0] if source_cols else None
            target_handle = target_cols[0] if target_cols else None

            react_edges.append(
                ReactFlowEdge(
                    id=f"edge_{edge_counter}_{child_id}_{parent_id}",
                    source=child_id,  # From table with FK
                    target=parent_id, # To referenced table
                    sourceHandle=source_handle,
                    targetHandle=target_handle,
                    type="smoothstep",
                    animated=True,
                    data={
                        "constraint_name": attrs.get("constraint_name"),
                        "source_columns": source_cols,
                        "target_columns": target_cols,
                    },
                )
            )
            edge_counter += 1

        return ReactFlowGraph(
            nodes=react_nodes,
            edges=react_edges,
            topology=metrics,
        )
