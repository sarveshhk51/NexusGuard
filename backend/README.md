# NexusGuard — Subsystem 2: Schema Intelligence & Deception Engine

This subsystem implements the core schema discovery, topological graph analysis, realistic synthetic decoy generation, and isolated deployment engine for the **NexusGuard** cyber-deception database security platform.

---

## Architecture Overview

```
TARGET DATABASE (PostgreSQL / MySQL)
          │
          ▼
Schema Reflection (SQLAlchemy Inspector)
          │
          ▼
Schema Normalization (Pydantic Models)
          │
          ▼
Immutable Schema Snapshot (Metadata DB)
          │
          ▼
NetworkX Graph & Topology Analysis ──────► React Flow Export (For Person 4 SOC)
          │
          ▼
Faker Synthetic Data Engine (Parent-First, FK-Consistent)
          │
          ▼
DDL Plan Generator (PostgreSQL / MySQL)
          │
          ▼
Decoy Deployment (`nexusguard_decoy`) ───► Target for Person 3 Monitoring
          │
          ▼
7-Point Automated Verification Suite
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                          # FastAPI Application
│   ├── api/
│   │   ├── schema_intelligence.py       # Reflection, Snapshots & Graph APIs
│   │   └── deception.py                 # Decoy Generation, Deploy, Verify, Remove APIs
│   ├── schema_intelligence/
│   │   ├── adapters/
│   │   │   ├── base.py                  # Abstract SchemaReflectionAdapter
│   │   │   ├── postgres.py              # PostgreSQL Reflection Adapter
│   │   │   └── mysql.py                 # MySQL 8 Reflection Adapter
│   │   ├── normalization.py             # Unified Pydantic Metadata Models
│   │   ├── reflection.py                # Reflection Orchestration Service
│   │   ├── snapshot.py                  # Immutable Snapshot Repository
│   │   ├── graph.py                     # NetworkX Graph & React Flow Layout
│   │   └── models.py                    # Schema Snapshot SQLAlchemy Models
│   ├── deception/
│   │   ├── constants.py                 # DECOY_SCHEMA_NAME = "nexusguard_decoy"
│   │   ├── dependency.py                # Topological Sort & Cycle Breaking
│   │   ├── synthetic_data.py            # Faker Engine with 30+ Column Patterns
│   │   ├── ddl.py                       # Safe DDL Generator (Postgres & MySQL)
│   │   ├── deployment.py                # Decoy Deployment & Safe Rollback
│   │   ├── verification.py              # 7-Point Structural Verification Suite
│   │   ├── generator.py                 # Master Decoy Orchestrator
│   │   └── models.py                    # Decoy Deployment SQLAlchemy Models
│   └── compat/
│       └── database_adapter.py          # Standalone Database Shim (Person 1 merge point)
├── tests/
│   ├── conftest.py                      # Shared fixtures & CRM Demo DB
│   ├── test_reflection.py               # Schema Reflection Tests
│   ├── test_graph.py                    # Graph & React Flow Tests
│   ├── test_dependency.py               # Topological & Cycle Tests
│   ├── test_synthetic_data.py           # Synthetic Data & Referential Integrity Tests
│   ├── test_ddl.py                      # DDL Generation Tests
│   └── test_api_endpoints.py            # Full REST API Integration Tests
├── requirements.txt
└── pytest.ini
```

---

## API Endpoints Contract

### Schema Intelligence Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/targets/{id}/reflect` | Reflect target schema and save immutable snapshot |
| `GET` | `/api/targets/{id}/schema` | Retrieve latest reflected schema snapshot |
| `GET` | `/api/targets/{id}/graph` | Retrieve React Flow nodes, edges, and topology metrics |
| `GET` | `/api/targets/{id}/snapshots` | List historical snapshots for target |
| `GET` | `/api/targets/{id}/snapshots/{snapshot_id}` | Retrieve specific snapshot record |

### Deception Engine Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/targets/{id}/decoy/generate` | Synthesize data and DDL plan without deploying |
| `POST` | `/api/targets/{id}/decoy/deploy` | Deploy decoy schema to target database |
| `GET` | `/api/targets/{id}/decoy` | Get active decoy deployment status & summary |
| `DELETE` | `/api/targets/{id}/decoy` | Drop decoy schema (`nexusguard_decoy`) |
| `POST` | `/api/targets/{id}/decoy/verify` | Re-run 7-point structural verification check |

---

## Integration Notes for Teammates

### For Person 1 (Core Backend, Auth, RBAC & Target Management)
* **Target Connection**: Person 2 uses `get_target_adapter(target_id)` in `app/api/schema_intelligence.py`. When ready, replace `app/compat/database_adapter.py` with your `DatabaseAdapter` providing `.get_engine()`.
* **API Routers**: Include `schema_router` and `deception_router` in your `app/api/router.py`.
* **Metadata Models**: The SQLAlchemy models `SchemaSnapshotRecord` (`schema_snapshots` table) and `DecoyDeploymentRecord` (`decoy_deployments` table) are standard SQLAlchemy 2.0 classes ready to be managed by Alembic.

### For Person 3 (Monitoring, Detection, Events & WebSockets)
* **Decoy Asset Name**: The decoy is deployed into `nexusguard_decoy` (Postgres schema or MySQL database).
* Import the constant:
  ```python
  from app.deception.constants import DECOY_SCHEMA_NAME  # "nexusguard_decoy"
  ```
* Any queries touching `nexusguard_decoy.*` must trigger your `DECOY_ACCESS` rule with `CRITICAL` severity.

### For Person 4 (SOC Frontend & React Flow Canvas)
* `GET /api/targets/{id}/graph` outputs pre-formatted React Flow data:
  ```json
  {
    "nodes": [
      {
        "id": "public.customers",
        "type": "tableNode",
        "position": { "x": 80.0, "y": 60.0 },
        "data": {
          "label": "customers",
          "schema": "public",
          "columns": [...],
          "primary_keys": ["customer_id"],
          "column_count": 5,
          "is_root": true
        }
      }
    ],
    "edges": [
      {
        "id": "edge_1_public.orders_public.customers",
        "source": "public.orders",
        "target": "public.customers",
        "sourceHandle": "customer_id",
        "targetHandle": "customer_id",
        "type": "smoothstep",
        "animated": true
      }
    ],
    "topology": {
      "total_nodes": 6,
      "total_edges": 5,
      "connected_components": 1,
      "root_tables": ["public.customers", "public.products"],
      "leaf_tables": ["public.payments"],
      "has_cycles": false,
      "dependency_order": ["public.customers", "public.products", "public.orders", "..."]
    }
  }
  ```

---

## Running Tests

From `backend/`:
```bash
python -m pytest tests -v
```
