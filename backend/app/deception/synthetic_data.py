"""
Synthetic Data Generation Engine for NexusGuard.
Uses Faker with intelligent column-name pattern inference, strict referential integrity tracking,
and topological parent-first data synthesis.
"""

from datetime import datetime, date, timezone
from decimal import Decimal
import logging
import random
import re
from typing import Any, Callable
import uuid
from faker import Faker
from app.schema_intelligence.normalization import ColumnMetadata, FullSchemaSnapshot, TableMetadata
from app.deception.dependency import DeferredConstraint

logger = logging.getLogger(__name__)


class ColumnInferenceEngine:
    """Infers the most appropriate Faker provider based on column name patterns and data types."""

    def __init__(self, fake: Faker):
        self.fake = fake
        # Ordered list of (regex_pattern, generator_function)
        self.patterns: list[tuple[re.Pattern, Callable[[ColumnMetadata], Any]]] = [
            # Names
            (re.compile(r"^(first_?name|fname)$", re.I), lambda c: self.fake.first_name()),
            (re.compile(r"^(last_?name|lname|surname)$", re.I), lambda c: self.fake.last_name()),
            (re.compile(r"^(full_?name|customer_?name|client_?name|employee_?name|user_?name|name)$", re.I), lambda c: self.fake.name()),
            (re.compile(r"^(user_?name|login|handle)$", re.I), lambda c: self.fake.user_name()),
            
            # Contact info
            (re.compile(r"(email|e_mail)", re.I), lambda c: self.fake.ascii_safe_email()),
            (re.compile(r"(phone|mobile|cell|telephone|fax)", re.I), lambda c: self.fake.phone_number()),
            
            # Geographic / Address
            (re.compile(r"(street_?address|address|addr|street)", re.I), lambda c: self.fake.street_address()),
            (re.compile(r"^city$", re.I), lambda c: self.fake.city()),
            (re.compile(r"^(state|province|region)$", re.I), lambda c: self.fake.state()),
            (re.compile(r"^(zip|postal_?code|zip_?code)$", re.I), lambda c: self.fake.zipcode()),
            (re.compile(r"^country$", re.I), lambda c: self.fake.country()),
            
            # Corporate / Employment
            (re.compile(r"(company|organization|org_?name|employer)", re.I), lambda c: self.fake.company()),
            (re.compile(r"(department|dept)", re.I), lambda c: self.fake.random_element(["Engineering", "Sales", "Marketing", "Finance", "HR", "Support", "Legal"])),
            (re.compile(r"(job_?title|role|position|title)", re.I), lambda c: self.fake.job()),
            
            # Financial
            (re.compile(r"(price|amount|total|salary|balance|cost|payment|fee|rate)", re.I), lambda c: Decimal(str(round(random.uniform(10.0, 5000.0), 2)))),
            
            # Quantities / Metrics
            (re.compile(r"(quantity|qty|count|units|inventory|stock)", re.I), lambda c: random.randint(1, 100)),
            (re.compile(r"(rating|score)", re.I), lambda c: Decimal(str(round(random.uniform(1.0, 5.0), 1)))),
            
            # Status / Enums
            (re.compile(r"(order_?status)", re.I), lambda c: self.fake.random_element(["PENDING", "PROCESSING", "COMPLETED", "CANCELLED", "SHIPPED"])),
            (re.compile(r"(payment_?status)", re.I), lambda c: self.fake.random_element(["SUCCESS", "PENDING", "FAILED", "REFUNDED"])),
            (re.compile(r"(status|state)", re.I), lambda c: self.fake.random_element(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"])),
            
            # Temporal
            (re.compile(r"(created_?at|updated_?at|timestamp|registered_?at)", re.I), lambda c: self.fake.date_time_between(start_date="-1y", end_date="now")),
            (re.compile(r"(birth_?date|dob)", re.I), lambda c: self.fake.date_of_birth(minimum_age=20, maximum_age=65)),
            (re.compile(r"(hire_?date|start_?date)", re.I), lambda c: self.fake.date_between(start_date="-5y", end_date="today")),
            (re.compile(r"(order_?date|payment_?date|date)", re.I), lambda c: self.fake.date_this_year()),
            
            # Web / Network
            (re.compile(r"(ip_?address|ip|client_?ip)", re.I), lambda c: self.fake.ipv4()),
            (re.compile(r"(url|website|link)", re.I), lambda c: self.fake.url()),
            (re.compile(r"(domain)", re.I), lambda c: self.fake.domain_name()),
            
            # Identifiers
            (re.compile(r"(uuid|guid)", re.I), lambda c: str(uuid.uuid4())),
            (re.compile(r"(ssn|social_?security)", re.I), lambda c: self.fake.ssn()),
            (re.compile(r"(sku|product_?code)", re.I), lambda c: f"SKU-{random.randint(1000, 9999)}"),
            
            # Text / Content
            (re.compile(r"(description|desc|notes|comment|bio|summary|body)", re.I), lambda c: self.fake.sentence(nb_words=8)),
        ]

    def infer_value(self, column: ColumnMetadata) -> Any:
        """Infer and generate a realistic synthetic value for a column."""
        col_name = column.name

        # 1. Match against specific column name regex patterns
        for pattern, generator in self.patterns:
            if pattern.search(col_name):
                val = generator(column)
                # Ensure length limits are respected for string values
                if isinstance(val, str) and column.max_length and len(val) > column.max_length:
                    return val[:column.max_length]
                return val

        # 2. Type-based generation fallback
        dt = column.data_type.upper()

        if "INT" in dt:
            if "SMALLINT" in dt:
                return random.randint(1, 32000)
            return random.randint(1, 100000)
        elif "BOOLEAN" in dt or "BOOL" in dt:
            return random.choice([True, False])
        elif "DECIMAL" in dt or "NUMERIC" in dt or "DOUBLE" in dt or "FLOAT" in dt:
            scale = column.numeric_scale or 2
            return Decimal(str(round(random.uniform(5.0, 999.0), scale)))
        elif "TIMESTAMP" in dt or "DATETIME" in dt:
            return self.fake.date_time_this_year()
        elif "DATE" in dt:
            return self.fake.date_this_year()
        elif "TIME" in dt:
            return self.fake.time()
        elif "UUID" in dt:
            return str(uuid.uuid4())
        elif "JSON" in dt:
            return {"metadata": self.fake.word(), "generated": True, "level": random.randint(1, 5)}
        elif "TEXT" in dt:
            return self.fake.paragraph(nb_sentences=2)
        else:
            # Default string
            max_len = column.max_length or 50
            val = self.fake.word().capitalize()
            return val[:max_len]


class SyntheticDataEngine:
    """Generates complete, referentially consistent synthetic datasets across an entire database schema."""

    def __init__(
        self,
        snapshot: FullSchemaSnapshot,
        rows_per_table: int = 50,
        seed: int | None = None,
    ):
        self.snapshot = snapshot
        self.rows_per_table = rows_per_table
        self.fake = Faker()
        if seed is not None:
            self.fake.seed_instance(seed)
            random.seed(seed)
        self.inference = ColumnInferenceEngine(self.fake)

        # Registry to track generated PKs: { "schema.table": { "pk_col": [val1, val2, ...] } }
        self.pk_registry: dict[str, dict[str, list[Any]]] = {}

    def _find_table_metadata(self, table_key: str) -> TableMetadata | None:
        for schema in self.snapshot.schemas:
            for table in schema.tables:
                if f"{schema.schema_name}.{table.table_name}" == table_key:
                    return table
                if table.table_name == table_key:
                    return table
        return None

    def generate_table_data(
        self,
        table_meta: TableMetadata,
        deferred_fks: list[DeferredConstraint],
    ) -> list[dict[str, Any]]:
        """Generate synthetic rows for a single table with foreign key resolution."""
        table_key = f"{table_meta.schema_name}.{table_meta.table_name}"
        rows: list[dict[str, Any]] = []

        # Initialize PK tracking for this table
        self.pk_registry[table_key] = {}
        for pk_col in table_meta.primary_keys:
            self.pk_registry[table_key][pk_col] = []

        # Index FK columns for quick lookup: { "source_col": fk_metadata }
        fk_map: dict[str, Any] = {}
        deferred_fk_cols: set[str] = set()

        for fk in table_meta.foreign_keys:
            for s_col in fk.source_columns:
                fk_map[s_col] = fk

        for def_fk in deferred_fks:
            if def_fk.source_table == table_key:
                for col in def_fk.source_columns:
                    deferred_fk_cols.add(col)

        # Starting ID offset for synthetic rows (prevents clash with typical production IDs)
        START_ID = 10001

        for row_idx in range(self.rows_per_table):
            row_dict: dict[str, Any] = {}

            # First handle Primary Keys
            for pk_col in table_meta.primary_keys:
                col_meta = next((c for c in table_meta.columns if c.name == pk_col), None)
                if col_meta and "INT" in col_meta.data_type.upper():
                    pk_val = START_ID + row_idx
                elif col_meta and "UUID" in col_meta.data_type.upper():
                    pk_val = str(uuid.uuid4())
                else:
                    pk_val = f"SYNTH-{START_ID + row_idx}"
                row_dict[pk_col] = pk_val
                self.pk_registry[table_key][pk_col].append(pk_val)

            # Handle Remaining Columns
            for col in table_meta.columns:
                col_name = col.name
                if col_name in row_dict:
                    continue  # Already generated as PK

                # Check if this column is a deferred Foreign Key
                if col_name in deferred_fk_cols:
                    row_dict[col_name] = None
                    continue

                # Check if this column is a Foreign Key
                if col_name in fk_map:
                    fk = fk_map[col_name]
                    target_key = f"{fk.target_schema}.{fk.target_table}"
                    # Check if target PKs are available
                    target_pks = self.pk_registry.get(target_key, {})
                    target_col = fk.target_columns[0] if fk.target_columns else "id"
                    available_ids = target_pks.get(target_col, [])

                    if available_ids:
                        row_dict[col_name] = random.choice(available_ids)
                    else:
                        # Fallback if parent table has no records or wasn't tracked
                        row_dict[col_name] = random.randint(START_ID, START_ID + self.rows_per_table - 1)
                    continue

                # Regular Column Generation
                if col.nullable and random.random() < 0.08:  # 8% chance of NULL for nullable columns
                    row_dict[col_name] = None
                else:
                    row_dict[col_name] = self.inference.infer_value(col)

            rows.append(row_dict)

        return rows

    def generate_all(
        self,
        insertion_order: list[str],
        deferred_constraints: list[DeferredConstraint] | None = None,
    ) -> dict[str, list[dict[str, Any]]]:
        """
        Generate synthetic rows across all tables in insertion order.
        Executes a secondary resolution pass for deferred cyclic foreign keys.
        """
        deferred_fks = deferred_constraints or []
        generated_dataset: dict[str, list[dict[str, Any]]] = {}

        # 1. Pass: Generate table data parent-first
        for table_key in insertion_order:
            table_meta = self._find_table_metadata(table_key)
            if not table_meta:
                continue
            rows = self.generate_table_data(table_meta, deferred_fks)
            generated_dataset[table_key] = rows

        # 2. Secondary Pass: Resolve deferred foreign keys
        for def_fk in deferred_fks:
            source_key = def_fk.source_table
            target_key = def_fk.target_table
            if source_key not in generated_dataset:
                continue

            target_pks = self.pk_registry.get(target_key, {})
            target_col = def_fk.target_columns[0] if def_fk.target_columns else "id"
            available_ids = target_pks.get(target_col, [])

            if available_ids:
                source_col = def_fk.source_columns[0]
                for row in generated_dataset[source_key]:
                    row[source_col] = random.choice(available_ids)
                logger.info("Resolved deferred cyclic FK %s.%s -> %s.%s", source_key, source_col, target_key, target_col)

        return generated_dataset
