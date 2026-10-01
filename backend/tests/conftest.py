"""
Pytest Test Fixtures and Demo Database Setup for NexusGuard.
Unifies fixtures across Person 2 (Schema/Deception), Person 3 (Detection/SOC), and Active Defense.
"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    Numeric,
    String,
    Table,
    create_engine,
    func,
)
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.schema_intelligence.models import Base as SchemaBase
from app.deception.models import DecoyDeployment as DeceptionBase
from app.security_events.models import Base as SecurityBase
from app.defense.models import BlockedIP
from app.compat.database import get_db
from app.main import app


@pytest.fixture(scope="session")
def engine():
    """In-memory SQLite engine for Person 3 & Security/Defense tests."""
    test_eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SecurityBase.metadata.create_all(bind=test_eng)
    SchemaBase.metadata.create_all(bind=test_eng)
    DeceptionBase.metadata.create_all(bind=test_eng)
    yield test_eng
    SecurityBase.metadata.drop_all(bind=test_eng)


@pytest.fixture
def db_session(engine):
    """Provides a transactional database session for each test."""
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="session")
def demo_target_engine():
    """
    Creates an in-memory SQLite database simulating an Enterprise CRM target database
    with 6 interconnected tables (customers, products, orders, order_items, payments, employees).
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    metadata = MetaData()

    customers = Table(
        "customers",
        metadata,
        Column("customer_id", Integer, primary_key=True, autoincrement=True),
        Column("name", String(100), nullable=False),
        Column("email", String(255), nullable=False),
        Column("phone", String(50), nullable=True),
        Column("created_at", DateTime, default=func.now()),
    )

    products = Table(
        "products",
        metadata,
        Column("product_id", Integer, primary_key=True, autoincrement=True),
        Column("name", String(100), nullable=False),
        Column("price", Numeric(10, 2), nullable=False),
        Column("stock", Integer, default=0),
        Column("sku", String(50), nullable=True),
    )

    orders = Table(
        "orders",
        metadata,
        Column("order_id", Integer, primary_key=True, autoincrement=True),
        Column("customer_id", Integer, ForeignKey("customers.customer_id"), nullable=False),
        Column("order_date", Date, default=func.current_date()),
        Column("status", String(50), default="PENDING"),
        Column("total", Numeric(10, 2), default=0.00),
    )

    order_items = Table(
        "order_items",
        metadata,
        Column("item_id", Integer, primary_key=True, autoincrement=True),
        Column("order_id", Integer, ForeignKey("orders.order_id"), nullable=False),
        Column("product_id", ForeignKey("products.product_id"), nullable=False),
        Column("quantity", Integer, default=1),
        Column("unit_price", Numeric(10, 2), nullable=False),
    )

    payments = Table(
        "payments",
        metadata,
        Column("payment_id", Integer, primary_key=True, autoincrement=True),
        Column("order_id", ForeignKey("orders.order_id"), nullable=False),
        Column("amount", Numeric(10, 2), nullable=False),
        Column("payment_date", DateTime, default=func.now()),
        Column("payment_status", String(50), default="SUCCESS"),
    )

    employees = Table(
        "employees",
        metadata,
        Column("employee_id", Integer, primary_key=True, autoincrement=True),
        Column("first_name", String(50), nullable=False),
        Column("last_name", String(50), nullable=False),
        Column("email", String(255), nullable=False),
        Column("department", String(100), nullable=True),
        Column("salary", Numeric(10, 2), nullable=True),
    )

    metadata.create_all(engine)

    # Insert a few sample production rows
    with engine.begin() as conn:
        conn.execute(
            customers.insert(),
            [
                {"name": "Real Alice", "email": "alice@production.org", "phone": "555-0101"},
                {"name": "Real Bob", "email": "bob@production.org", "phone": "555-0102"},
            ],
        )
        conn.execute(
            products.insert(),
            [
                {"name": "Laptop X", "price": 1299.99, "stock": 10, "sku": "SKU-PROD-1"},
                {"name": "Mouse Y", "price": 29.99, "stock": 50, "sku": "SKU-PROD-2"},
            ],
        )
        conn.execute(
            orders.insert(),
            [
                {"customer_id": 1, "status": "COMPLETED", "total": 1329.98},
            ],
        )

    return engine


@pytest.fixture
def metadata_session():
    """Creates an in-memory SQLite metadata session for testing snapshots and deployments."""
    eng = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SchemaBase.metadata.create_all(eng)
    DeceptionBase.metadata.create_all(eng)
    SessionClass = sessionmaker(bind=eng)
    session = SessionClass()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(demo_target_engine, monkeypatch):
    """FastAPI TestClient with monkeypatched target database resolver."""
    from app.compat.database_adapter import DatabaseAdapterCompat
    from app.api import schema_intelligence, deception

    class MockAdapter(DatabaseAdapterCompat):
        def __init__(self, *args, **kwargs):
            self._engine = demo_target_engine

    monkeypatch.setattr(schema_intelligence, "get_target_adapter", lambda target_id: MockAdapter())
    monkeypatch.setattr(deception, "get_target_adapter", lambda target_id: MockAdapter())

    with TestClient(app) as test_client:
        yield test_client
