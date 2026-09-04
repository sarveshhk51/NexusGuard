"""
Unit and Referential Integrity Tests for Synthetic Data Generation.
"""

from faker import Faker
from app.deception.dependency import DependencyAnalyzer
from app.deception.synthetic_data import ColumnInferenceEngine, SyntheticDataEngine
from app.schema_intelligence.graph import SchemaGraphService
from app.schema_intelligence.normalization import ColumnMetadata
from app.schema_intelligence.reflection import SchemaReflectionService


def test_column_inference_engine():
    """Verify regex pattern inference on various column names."""
    engine = ColumnInferenceEngine(Faker())

    col_email = ColumnMetadata(name="email", data_type="VARCHAR(255)", raw_type="VARCHAR")
    val_email = engine.infer_value(col_email)
    assert "@" in str(val_email)

    col_phone = ColumnMetadata(name="phone_number", data_type="VARCHAR(50)", raw_type="VARCHAR")
    val_phone = engine.infer_value(col_phone)
    assert len(str(val_phone)) > 5

    col_salary = ColumnMetadata(name="salary", data_type="DECIMAL(10,2)", raw_type="DECIMAL")
    val_salary = engine.infer_value(col_salary)
    assert float(val_salary) > 0


def test_synthetic_data_generation_and_fk_consistency(demo_target_engine):
    """
    Generate synthetic data for the CRM database and strictly verify
    referential integrity (all child foreign keys exist in parent primary keys).
    """
    service = SchemaReflectionService.for_engine(demo_target_engine)
    snapshot = service.reflect(demo_target_engine, target_id=1)

    graph_service = SchemaGraphService()
    G = graph_service.build_dependency_graph(snapshot)
    dep_res = DependencyAnalyzer().compute_insertion_order(G)

    ROWS = 30
    synth_engine = SyntheticDataEngine(snapshot, rows_per_table=ROWS, seed=123)
    dataset = synth_engine.generate_all(dep_res.insertion_order, dep_res.deferred_constraints)

    # 1. Check all tables generated with expected count
    for tbl_key in dep_res.insertion_order:
        rows = dataset[tbl_key]
        assert len(rows) == ROWS

    # Find customer table key and order table key
    cust_key = next(k for k in dataset.keys() if "customers" in k)
    order_key = next(k for k in dataset.keys() if "orders" in k and "items" not in k)
    item_key = next(k for k in dataset.keys() if "order_items" in k)
    prod_key = next(k for k in dataset.keys() if "products" in k)

    # 2. Verify PK uniqueness and starting ID offset
    cust_pks = [r["customer_id"] for r in dataset[cust_key]]
    assert len(cust_pks) == len(set(cust_pks))
    assert min(cust_pks) >= 10001

    # 3. CRITICAL: Verify referential integrity of orders -> customers
    order_cust_fks = [r["customer_id"] for r in dataset[order_key]]
    for fk_val in order_cust_fks:
        assert fk_val in cust_pks, f"Orphaned FK found: {fk_val} not in customer PKs"

    # 4. CRITICAL: Verify referential integrity of order_items -> products
    prod_pks = {r["product_id"] for r in dataset[prod_key]}
    item_prod_fks = [r["product_id"] for r in dataset[item_key]]
    for fk_val in item_prod_fks:
        assert fk_val in prod_pks, f"Orphaned product FK found: {fk_val} not in product PKs"
