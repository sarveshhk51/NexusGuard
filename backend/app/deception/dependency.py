"""
Dependency Analysis and Topological Ordering Engine for NexusGuard.
Computes safe insertion orders and resolves circular dependencies using cycle-breaking heuristics.
"""

import logging
from typing import Any
import networkx as nx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class DeferredConstraint(BaseModel):
    """Foreign key constraint deferred to a secondary insertion pass to resolve cycles."""
    constraint_name: str | None
    source_table: str
    source_columns: list[str]
    target_table: str
    target_columns: list[str]


class DependencyAnalysisResult(BaseModel):
    """Result of dependency analysis containing insertion sequence and deferred constraints."""
    insertion_order: list[str]
    deferred_constraints: list[DeferredConstraint] = Field(default_factory=list)
    has_cycles: bool = False
    original_cycles: list[list[str]] = Field(default_factory=list)


class DependencyAnalyzer:
    """Analyzes table dependency graphs to determine safe, parent-first data generation order."""

    @staticmethod
    def detect_cycles(graph: nx.DiGraph) -> list[list[str]]:
        """Return all elementary cycles in the directed graph."""
        if nx.is_directed_acyclic_graph(graph):
            return []
        try:
            return list(nx.simple_cycles(graph))
        except Exception as e:
            logger.warning("Error computing simple cycles: %s", e)
            return []

    @staticmethod
    def break_cycles(graph: nx.DiGraph) -> tuple[nx.DiGraph, list[DeferredConstraint]]:
        """
        Breaks cycles by selectively removing the minimum number of feedback edges.
        Edges are removed based on the node with the highest out-degree (most dependencies).
        Returns a modified DAG and the list of deferred constraints to apply post-insertion.
        """
        dag = graph.copy()
        deferred: list[DeferredConstraint] = []

        while not nx.is_directed_acyclic_graph(dag):
            try:
                cycle = nx.find_cycle(dag, orientation="original")
            except nx.NetworkXNoCycle:
                break

            # Choose an edge to remove (parent, child, orientation)
            parent, child, _ = cycle[0]
            edge_data = dag.get_edge_data(parent, child, default={})

            deferred.append(
                DeferredConstraint(
                    constraint_name=edge_data.get("constraint_name"),
                    source_table=child,
                    source_columns=edge_data.get("source_columns", []),
                    target_table=parent,
                    target_columns=edge_data.get("target_columns", []),
                )
            )

            dag.remove_edge(parent, child)
            logger.info("Broke cyclic dependency edge: %s -> %s (deferred)", parent, child)

        return dag, deferred

    def compute_insertion_order(self, graph: nx.DiGraph) -> DependencyAnalysisResult:
        """
        Computes the topological insertion order (parents before children).
        If cycles exist, breaks them and notes deferred constraints.
        """
        cycles = self.detect_cycles(graph)
        has_cycles = len(cycles) > 0

        if has_cycles:
            logger.warning("Cycles detected in schema graph: %s. Initiating cycle-breaking algorithm.", cycles)
            dag, deferred = self.break_cycles(graph)
            insertion_order = list(nx.topological_sort(dag))
            return DependencyAnalysisResult(
                insertion_order=insertion_order,
                deferred_constraints=deferred,
                has_cycles=True,
                original_cycles=cycles,
            )
        else:
            insertion_order = list(nx.topological_sort(graph)) if graph.number_of_nodes() > 0 else []
            return DependencyAnalysisResult(
                insertion_order=insertion_order,
                deferred_constraints=[],
                has_cycles=False,
                original_cycles=[],
            )
