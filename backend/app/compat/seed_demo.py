"""
Demo Target Database Seeder for NexusGuard.
Pre-populates an in-process SQLite target database (target_demo.db) with
6 realistic enterprise tables (customers, products, orders, order_items, payments, employees)
and seeds initial realistic security events in nexusguard_metadata.db
so the SOC dashboard displays diverse live telemetry instead of static repeating mocks.
"""

import os
from datetime import datetime, timezone, timedelta
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


def ensure_seed_security_events(db_session):
    """Seeds diverse initial security events and alerts in metadata database."""
    from app.security_events.models import SecurityEvent, Alert, SeverityEnum, EventTypeEnum, EventStatusEnum
    from app.defense.models import BlockedIP

    existing_count = db_session.query(SecurityEvent).count()
    if existing_count > 0:
        return

    now = datetime.now(timezone.utc)
    seed_records = [
        {
            "ip": "185.220.101.5",
            "user": "tor_exit_node_probe",
            "query": "SELECT username, password_hash FROM nexusguard_decoy.admin_credentials WHERE '1'='1' --",
            "schema": "nexusguard_decoy",
            "table": "admin_credentials",
            "type": EventTypeEnum.DECOY_ACCESS,
            "sev": SeverityEnum.CRITICAL,
            "reason": "Direct honeypot access: Attempted administrative credential exfiltration",
            "mins_ago": 4,
        },
        {
            "ip": "194.26.29.112",
            "user": "darkweb_crawler_44",
            "query": "SELECT card_number, cvv_hash, exp_date FROM nexusguard_decoy.payment_vault LIMIT 50;",
            "schema": "nexusguard_decoy",
            "table": "payment_vault",
            "type": EventTypeEnum.DECOY_ACCESS,
            "sev": SeverityEnum.CRITICAL,
            "reason": "Direct honeypot access: Financial credit card vault dump attempt",
            "mins_ago": 12,
        },
        {
            "ip": "45.154.255.89",
            "user": "recon_script_v2",
            "query": "SELECT secret_seed, auth_token FROM nexusguard_decoy.api_credential_canaries WHERE active = 1;",
            "schema": "nexusguard_decoy",
            "table": "api_credential_canaries",
            "type": EventTypeEnum.DECOY_ACCESS,
            "sev": SeverityEnum.HIGH,
            "reason": "API canary token query tripped",
            "mins_ago": 28,
        },
        {
            "ip": "103.145.12.33",
            "user": "sqli_scanner",
            "query": "SELECT table_name FROM information_schema.tables WHERE table_schema NOT IN ('sys', 'pg_catalog');",
            "schema": "information_schema",
            "table": "tables",
            "type": EventTypeEnum.SCHEMA_ENUMERATION,
            "sev": SeverityEnum.MEDIUM,
            "reason": "Automated schema enumeration reconnaissance scan",
            "mins_ago": 45,
        },
        {
            "ip": "172.16.88.4",
            "user": "internal_pivot_actor",
            "query": "UPDATE nexusguard_decoy.shadow_administrators SET privileges = 'ALL' WHERE username = 'sys_backup';",
            "schema": "nexusguard_decoy",
            "table": "shadow_administrators",
            "type": EventTypeEnum.DECOY_ACCESS,
            "sev": SeverityEnum.HIGH,
            "reason": "Privilege escalation attempt against fake admin account",
            "mins_ago": 72,
        },
        {
            "ip": "89.248.165.71",
            "user": "apt_shadow_infiltrator",
            "query": "SELECT username, password_salt_canary FROM nexusguard_decoy.auth_canary_vault LIMIT 100;",
            "schema": "nexusguard_decoy",
            "table": "auth_canary_vault",
            "type": EventTypeEnum.DECOY_ACCESS,
            "sev": SeverityEnum.CRITICAL,
            "reason": "Credential canary vault intrusion",
            "mins_ago": 110,
        },
        {
            "ip": "198.51.100.14",
            "user": "catalog_explorer",
            "query": "SELECT * FROM pg_catalog.pg_tables WHERE schemaname = 'public';",
            "schema": "pg_catalog",
            "table": "pg_tables",
            "type": EventTypeEnum.SCHEMA_ENUMERATION,
            "sev": SeverityEnum.MEDIUM,
            "reason": "Postgres catalog metadata table inspection",
            "mins_ago": 150,
        },
        {
            "ip": "141.98.11.42",
            "user": "shadow_exfiltrator",
            "query": "SELECT * FROM nexusguard_decoy.customer_shadow_backup;",
            "schema": "nexusguard_decoy",
            "table": "customer_shadow_backup",
            "type": EventTypeEnum.DECOY_ACCESS,
            "sev": SeverityEnum.HIGH,
            "reason": "Access to synthetic customer shadow backup table",
            "mins_ago": 210,
        },
    ]

    for item in seed_records:
        evt = SecurityEvent(
            target_id=1,
            engine="mysql",
            database_name="production_crm",
            username=item["user"],
            source_ip=item["ip"],
            query=item["query"],
            schema_name=item["schema"],
            table_name=item["table"],
            event_type=item["type"],
            severity=item["sev"],
            detection_reason=item["reason"],
            status=EventStatusEnum.NEW,
            timestamp=now - timedelta(minutes=item["mins_ago"]),
        )
        db_session.add(evt)
        db_session.flush()

        # If HIGH or CRITICAL, also generate an actionable Alert
        if item["sev"] in [SeverityEnum.CRITICAL, SeverityEnum.HIGH]:
            alert = Alert(
                event_id=evt.id,
                severity=item["sev"].value,
                status=EventStatusEnum.NEW.value,
                description=f"Actionable alert: {item['reason']}",
                created_at=now - timedelta(minutes=item["mins_ago"]),
            )
            db_session.add(alert)

    # Seed an active blocked IP for demonstration
    blocked_example = BlockedIP(
        ip_address="185.220.101.5",
        reason="Automated containment: Honeypot admin credentials dump",
        severity="CRITICAL",
        query_snippet="SELECT username, password_hash FROM nexusguard_decoy.admin_credentials WHERE '1'='1' --",
        is_active=True,
        blocked_at=now - timedelta(minutes=4),
    )
    db_session.add(blocked_example)

    db_session.commit()
