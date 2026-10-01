"""
Demo Target Database Seeder for NexusGuard.
Pre-populates an in-process SQLite target database (target_demo.db) with
6 realistic enterprise tables (customers, products, orders, order_items, payments, employees)
so schema reflection, decoy generation, and React Flow graph topology work out-of-the-box
even when external PostgreSQL / MySQL servers are not locally installed.
"""

import os
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

DEMO_DB_PATH = "target_demo.db"


def ensure_demo_target_db():
    """Creates target_demo.db with enterprise tables if it does not exist."""
    engine = create_engine(f"sqlite:///{DEMO_DB_PATH}", connect_args={"check_same_thread": False})
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
        Column("product_id", Integer, ForeignKey("products.product_id"), nullable=False),
        Column("quantity", Integer, default=1),
        Column("unit_price", Numeric(10, 2), nullable=False),
    )

    payments = Table(
        "payments",
        metadata,
        Column("payment_id", Integer, primary_key=True, autoincrement=True),
        Column("order_id", Integer, ForeignKey("orders.order_id"), nullable=False),
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

    # Insert sample seed rows if table is empty
    with engine.begin() as conn:
        result = conn.execute(customers.select().limit(1)).first()
        if not result:
            conn.execute(
                customers.insert(),
                [
                    {"name": "Alice Johnson", "email": "alice@production-enterprise.com", "phone": "+1-555-0101"},
                    {"name": "Robert Smith", "email": "robert@production-enterprise.com", "phone": "+1-555-0102"},
                    {"name": "Elena Rostova", "email": "elena@production-enterprise.com", "phone": "+1-555-0103"},
                ],
            )
            conn.execute(
                products.insert(),
                [
                    {"name": "Enterprise Database Firewall Appliance", "price": 4999.99, "stock": 15, "sku": "SEC-FW-01"},
                    {"name": "Deception Sensor Honeynode X1", "price": 1299.50, "stock": 40, "sku": "DEC-HN-02"},
                    {"name": "SOC Analyst Multi-Monitor Station", "price": 899.00, "stock": 25, "sku": "HW-WS-03"},
                ],
            )
            conn.execute(
                orders.insert(),
                [
                    {"customer_id": 1, "status": "COMPLETED", "total": 6299.49},
                    {"customer_id": 2, "status": "PROCESSING", "total": 1299.50},
                ],
            )
