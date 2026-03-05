# Databricks notebook source
# ShopMind - Lakeflow Spark Declarative Pipeline
# Bronze → Silver with real-time Intent Score calculation

# COMMAND ----------
# MAGIC %pip install dlt

# COMMAND ----------
import dlt
from pyspark.sql import functions as F
from pyspark.sql.types import *
from datetime import datetime, timedelta

VOLUME_PATH = "/Volumes/yousseftko_catalog/raw/source_files"

# ── BRONZE LAYER ─────────────────────────────────────────────────────────────

@dlt.table(
    name="bronze_clickstream",
    comment="Raw clickstream events from Volume - append-only",
    table_properties={"quality": "bronze", "pipelines.autoOptimize.managed": "true"}
)
def bronze_clickstream():
    return (
        spark.readStream.format("cloudFiles")
        .option("cloudFiles.format", "csv")
        .option("cloudFiles.schemaLocation", f"{VOLUME_PATH}/_schema/clickstream")
        .option("header", "true")
        .option("inferSchema", "true")
        .load(f"{VOLUME_PATH}/clickstream_events.csv")
        .withColumn("_ingest_ts", F.current_timestamp())
        .withColumn("_source_file", F.input_file_name())
    )

@dlt.table(
    name="bronze_customers",
    comment="Raw customer profiles from Volume",
    table_properties={"quality": "bronze"}
)
def bronze_customers():
    return (
        spark.read.format("csv")
        .option("header", "true")
        .option("inferSchema", "true")
        .load(f"{VOLUME_PATH}/customer_profiles.csv")
        .withColumn("_ingest_ts", F.current_timestamp())
    )

@dlt.table(
    name="bronze_products",
    comment="Raw products catalog from Volume",
    table_properties={"quality": "bronze"}
)
def bronze_products():
    return (
        spark.read.format("csv")
        .option("header", "true")
        .option("inferSchema", "true")
        .load(f"{VOLUME_PATH}/products_catalog.csv")
        .withColumn("_ingest_ts", F.current_timestamp())
    )

@dlt.table(
    name="bronze_purchases",
    comment="Raw purchase history from Volume",
    table_properties={"quality": "bronze"}
)
def bronze_purchases():
    return (
        spark.read.format("csv")
        .option("header", "true")
        .option("inferSchema", "true")
        .load(f"{VOLUME_PATH}/purchase_history.csv")
        .withColumn("_ingest_ts", F.current_timestamp())
    )

# ── SILVER LAYER ─────────────────────────────────────────────────────────────

@dlt.table(
    name="silver_customer_intent",
    comment="Customer category intent scores — last 48h clickstream aggregated",
    table_properties={"quality": "silver", "delta.enableChangeDataFeed": "true"}
)
def silver_customer_intent():
    """
    Joins clickstream with products to derive per-customer category intent.
    Intent score = weighted sum of events in last 48h:
      page_view=1, product_view=2, wishlist=3, add_to_cart=4, checkout_start=5
    """
    event_weights = F.when(F.col("e.event_type") == "page_view", 1) \
                     .when(F.col("e.event_type") == "product_view", 2) \
                     .when(F.col("e.event_type") == "wishlist", 3) \
                     .when(F.col("e.event_type") == "add_to_cart", 4) \
                     .when(F.col("e.event_type") == "checkout_start", 5) \
                     .otherwise(1)

    cutoff = F.date_sub(F.current_timestamp().cast("date"), 2)  # last 48h

    return (
        dlt.read_stream("bronze_clickstream").alias("e")
        .join(dlt.read("bronze_products").alias("p"), "product_sku", "left")
        .where(F.col("e.timestamp") >= cutoff)
        .withColumn("event_weight", event_weights)
        .groupBy("e.customer_id", "e.category")
        .agg(
            F.sum("event_weight").alias("intent_score"),
            F.count("*").alias("event_count"),
            F.max("e.timestamp").alias("last_active_ts"),
            F.countDistinct("e.session_id").alias("session_count"),
        )
        .withColumn("intent_score_normalized",
            F.round(F.col("intent_score") / F.lit(50.0), 3))  # normalize 0-1
        .withColumn("computed_at", F.current_timestamp())
    )

@dlt.table(
    name="silver_customer_golden_record",
    comment="Customer Golden Record — joined profile with latest purchase and intent",
    table_properties={"quality": "silver", "delta.enableChangeDataFeed": "true"}
)
@dlt.expect_or_drop("valid_customer_id", "customer_id IS NOT NULL")
@dlt.expect("valid_ltv", "ltv >= 0")
def silver_customer_golden_record():
    customers = dlt.read("bronze_customers")
    purchases = dlt.read("bronze_purchases")

    latest_purchase = (
        purchases
        .groupBy("customer_id")
        .agg(
            F.max("purchase_date").alias("last_purchase_ts"),
            F.sum("total_amount").alias("total_spend"),
            F.count("*").alias("total_orders"),
            F.countDistinct("category").alias("categories_purchased"),
        )
    )

    return (
        customers
        .join(latest_purchase, "customer_id", "left")
        # Drop raw CC — enforce PII policy at table level
        .drop("cc_raw_RESTRICTED")
        .withColumn("updated_at", F.current_timestamp())
    )

# ── GOLD LAYER ───────────────────────────────────────────────────────────────

@dlt.table(
    name="gold_top_intent_customers",
    comment="High-value customers with strong recent browsing intent — ready for campaign targeting",
    table_properties={"quality": "gold"}
)
def gold_top_intent_customers():
    """
    The Genie-queryable table: top customers by intent who haven't bought recently.
    Powers the demo query: 'top 10% LTV customers who browsed denim but haven't bought in 30 days'
    """
    intent = dlt.read("silver_customer_intent")
    golden = dlt.read("silver_customer_golden_record")

    top_intent = (
        intent
        .where(F.col("intent_score") > 5)
        .withColumn("intent_rank",
            F.dense_rank().over(
                __import__("pyspark.sql.window", fromlist=["Window"])
                .Window.partitionBy("category").orderBy(F.desc("intent_score"))
            )
        )
    )

    return (
        golden.alias("g")
        .join(top_intent.alias("i"), "customer_id", "inner")
        .where(F.col("g.days_since_purchase") >= 30)
        .select(
            "g.customer_id", "g.segment", "g.loyalty_tier", "g.ltv",
            "g.churn_score", "g.days_since_purchase", "g.preferred_channel",
            "i.category", "i.intent_score", "i.intent_score_normalized",
            "i.last_active_ts", "i.session_count",
        )
        .withColumn("campaign_priority",
            F.when((F.col("g.ltv") > 2500) & (F.col("i.intent_score") > 20), "HIGH")
             .when(F.col("g.ltv") > 500, "MEDIUM")
             .otherwise("LOW")
        )
    )
