"""
Integration Tests for NexusGuard Schema Intelligence & Deception REST APIs.
"""

from fastapi.testclient import TestClient


def test_health_endpoints(client: TestClient):
    """Verify health check endpoints."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "NexusGuard" in data["service"]

    res_api = client.get("/api/health")
    assert res_api.status_code == 200


def test_schema_reflection_and_retrieval_api(client: TestClient):
    """Test POST /api/targets/1/reflect and GET /api/targets/1/schema."""
    # 1. Trigger reflection
    reflect_res = client.post("/api/targets/1/reflect")
    assert reflect_res.status_code == 200
    snapshot = reflect_res.json()
    assert snapshot["target_id"] == 1
    assert snapshot["total_tables"] == 6
    assert snapshot["total_relationships"] >= 4

    # 2. Get latest schema
    schema_res = client.get("/api/targets/1/schema")
    assert schema_res.status_code == 200
    assert schema_res.json()["total_tables"] == 6

    # 3. Get schema graph for React Flow
    graph_res = client.get("/api/targets/1/graph")
    assert graph_res.status_code == 200
    graph_data = graph_res.json()
    assert "nodes" in graph_data and "edges" in graph_data and "topology" in graph_data
    assert len(graph_data["nodes"]) == 6
    assert graph_data["topology"]["total_nodes"] == 6

    # 4. List snapshots
    list_res = client.get("/api/targets/1/snapshots")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


def test_decoy_lifecycle_api(client: TestClient):
    """Test /api/targets/1/decoy/generate, status, and removal."""
    # Ensure schema is reflected first
    client.post("/api/targets/1/reflect")

    # 1. Generate decoy
    gen_res = client.post("/api/targets/1/decoy/generate", json={"rows_per_table": 25, "seed": 42})
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["status"] == "READY"
    assert gen_data["table_count"] == 6
    assert gen_data["total_rows"] == 150  # 6 tables * 25 rows

    # 2. Get decoy status
    status_res = client.get("/api/targets/1/decoy")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "READY"

    # 3. Remove decoy
    del_res = client.request("DELETE", "/api/targets/1/decoy", json={"confirm": True})
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "REMOVED"
