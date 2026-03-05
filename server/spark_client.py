from __future__ import annotations
"""
Databricks Connect client — reads from Unity Catalog Delta tables.
Falls back to mock data when running outside a Databricks-Connect-enabled env.
"""
import re
from .config import CATALOG

_SAFE_ID = re.compile(r'^[A-Za-z0-9_\-]+$')
_SAFE_CATEGORY = re.compile(r'^[A-Za-z]+$')

def _safe_id(val: str) -> str:
    """Reject IDs with SQL-injection characters."""
    if not _SAFE_ID.match(val):
        raise ValueError(f"Invalid identifier: {val!r}")
    return val

def _safe_str(val: str) -> str:
    """Escape single quotes for LIKE / equality predicates."""
    return val.replace("'", "''")

_spark = None
_spark_failed = False


def _get_spark():
    global _spark, _spark_failed
    if _spark is not None:
        return _spark
    if _spark_failed:
        return None
    try:
        from databricks.connect import DatabricksSession
        import os
        profile = os.environ.get("DATABRICKS_PROFILE", "fe-sandbox-tko")
        if os.environ.get("DATABRICKS_APP_NAME"):
            _spark = DatabricksSession.builder.getOrCreate()
        else:
            _spark = DatabricksSession.builder.profile(profile).getOrCreate()
    except Exception as e:
        print(f"[spark_client] Databricks Connect unavailable: {e}")
        _spark_failed = True
    return _spark


def _spark_to_dicts(df) -> list:
    return [row.asDict() for row in df.collect()]


def get_customer_profile(customer_id: str) -> "dict | None":
    spark = _get_spark()
    if not spark:
        return None
    try:
        cid = _safe_id(customer_id)
        df = spark.sql(f"""
            SELECT customer_id, first_name, last_name, email,
                   segment, loyalty_tier, loyalty_points,
                   ltv, churn_score, favorite_categories,
                   preferred_channel, days_since_purchase,
                   last_purchase_date, cc_masked, zip_code, age_group
            FROM {CATALOG}.bronze.bronze_customers
            WHERE customer_id = '{cid}'
            LIMIT 1
        """)
        rows = _spark_to_dicts(df)
        return rows[0] if rows else None
    except Exception as e:
        print(f"[spark_client] get_customer_profile error: {e}")
        return None


def search_customers(query: str, limit: int = 20) -> list:
    spark = _get_spark()
    if not spark:
        return []
    try:
        q = _safe_str(query)
        lim = max(1, min(int(limit), 200))
        df = spark.sql(f"""
            SELECT customer_id, first_name, last_name, email,
                   segment, loyalty_tier, loyalty_points, ltv, churn_score,
                   days_since_purchase, favorite_categories
            FROM {CATALOG}.bronze.bronze_customers
            WHERE LOWER(first_name || ' ' || last_name) LIKE LOWER('%{q}%')
               OR customer_id LIKE '%{q}%'
               OR segment = '{q}'
            LIMIT {lim}
        """)
        return _spark_to_dicts(df)
    except Exception as e:
        print(f"[spark_client] search_customers error: {e}")
        return []


def get_customer_intent(customer_id: str) -> list:
    spark = _get_spark()
    if not spark:
        return []
    try:
        cid = _safe_id(customer_id)
        df = spark.sql(f"""
            SELECT category, intent_score, intent_score_normalized,
                   event_count, session_count, last_active_ts
            FROM {CATALOG}.silver.silver_customer_intent
            WHERE customer_id = '{cid}'
            ORDER BY intent_score DESC
            LIMIT 5
        """)
        return _spark_to_dicts(df)
    except Exception as e:
        print(f"[spark_client] get_customer_intent error: {e}")
        return []


def get_top_intent_customers(category: str = None, limit: int = 50) -> list:
    spark = _get_spark()
    if not spark:
        return []
    try:
        lim = max(1, min(int(limit), 200))
        where = f"AND category = '{_safe_str(category)}'" if category else ""
        df = spark.sql(f"""
            SELECT customer_id, segment, loyalty_tier, ltv, churn_score,
                   days_since_purchase, category, intent_score,
                   last_active_ts, campaign_priority
            FROM {CATALOG}.bronze.gold_top_intent_customers
            WHERE 1=1 {where}
            ORDER BY ltv DESC, intent_score DESC
            LIMIT {lim}
        """)
        return _spark_to_dicts(df)
    except Exception as e:
        print(f"[spark_client] get_top_intent_customers error: {e}")
        return []


def get_product_recommendations(category: str, limit: int = 5) -> list:
    spark = _get_spark()
    if not spark:
        return []
    try:
        cat = _safe_str(category)
        lim = max(1, min(int(limit), 50))
        df = spark.sql(f"""
            SELECT product_sku, name, category, brand, price,
                   discount_pct, rating, review_count, tags, description
            FROM {CATALOG}.bronze.bronze_products
            WHERE category = '{cat}'
              AND stock_qty > 0
            ORDER BY rating DESC, review_count DESC
            LIMIT {lim}
        """)
        return _spark_to_dicts(df)
    except Exception as e:
        print(f"[spark_client] get_product_recommendations error: {e}")
        return []
