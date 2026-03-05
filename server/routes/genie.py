"""
Conversational BI endpoint — translates natural language to SQL using Claude,
executes against yousseftko_catalog via the Databricks SQL Statement API,
and returns results with an AI-generated plain-English summary.
"""
from __future__ import annotations
import asyncio
import aiohttp
from fastapi import APIRouter
from pydantic import BaseModel
from ..config import get_oauth_token, get_workspace_host, CATALOG, SERVING_ENDPOINT
from ..llm import get_llm_client

router = APIRouter(prefix="/genie", tags=["genie"])

WAREHOUSE_ID = "d85fb7ed40320552"

TABLE_CONTEXT = f"""
Available tables in the {CATALOG} Unity Catalog:

bronze.customers:
  customer_id (string PK), first_name, last_name, email,
  segment (VIP/Loyal/At-Risk/New/Dormant),
  loyalty_tier (Platinum/Gold/Silver/Bronze), loyalty_points (int),
  ltv (double, lifetime value in $),
  churn_score (double 0-1, higher = more likely to churn),
  favorite_categories (pipe-separated string e.g. "Denim|Activewear"),
  preferred_channel (email/push/sms/in-app), days_since_purchase (int),
  last_purchase_date (date), zip_code, age_group, gender, total_orders (int)

bronze.products:
  product_sku (string PK), name, category (Denim/Activewear/Outerwear/Footwear/Accessories/Basics/Formal/Loungewear),
  brand, price (double), discount_pct (int), rating (double), review_count (int), stock_qty (int),
  tags (pipe-separated)

bronze.clickstream:
  event_id (string), customer_id (string FK), event_type (page_view/product_view/add_to_cart/purchase),
  category, product_sku, timestamp (timestamp — NOT event_timestamp), device, channel, page_dwell_sec

bronze.purchases:
  purchase_id (string PK), customer_id (string FK), product_sku (string FK), category,
  quantity (int), unit_price (double), discount_pct (int), total_amount (double),
  purchase_date (timestamp), channel, status, shipping_state
"""

SYSTEM_PROMPT = f"""You are a Databricks SQL expert for the STRYDE retail analytics platform.
Convert business questions into valid Databricks SQL queries.

{TABLE_CONTEXT}

Rules:
- Always use fully qualified table names like `{CATALOG}.bronze.customers` (NOT bronze_customers)
- Table names are: customers, products, purchases, clickstream (no "bronze_" prefix)
- LIMIT results to 20 rows max
- Return ONLY the raw SQL — no markdown, no triple backticks, no explanation
- Use standard SQL (no UDFs)
- For text searches use ILIKE or LIKE with %wildcards%
- favorite_categories uses pipe | as separator, use LIKE '%Denim%' to filter
- churn_score > 0.5 means high churn risk; days_since_purchase > 30 means dormant shopper
- days_since_purchase is already computed — do not subtract dates
- In clickstream the timestamp column is named `timestamp` (NOT event_timestamp)
- In purchases the amount column is named `total_amount` (NOT amount), and primary key is `purchase_id` (NOT order_id)
"""


class GenieRequest(BaseModel):
    question: str


@router.post("/ask")
async def genie_ask(req: GenieRequest):
    client = get_llm_client()

    # Step 1: Claude generates SQL
    sql_resp = await client.chat.completions.create(
        model=SERVING_ENDPOINT,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": req.question},
        ],
        max_tokens=400,
        temperature=0.05,
    )
    sql = sql_resp.choices[0].message.content.strip()
    # Strip accidental markdown fences
    if sql.startswith("```"):
        lines = sql.split("\n")
        sql = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    sql = sql.strip()

    # Step 2: Execute SQL via Databricks Statement API
    token = get_oauth_token()
    host = get_workspace_host()

    columns: list[str] = []
    rows: list[list] = []
    error_msg: str | None = None

    try:
        async with aiohttp.ClientSession() as session:
            # Submit statement (wait up to 10s inline)
            async with session.post(
                f"{host}/api/2.0/sql/statements",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "statement": sql,
                    "warehouse_id": WAREHOUSE_ID,
                    "catalog": CATALOG,
                    "schema": "bronze",
                    "wait_timeout": "10s",
                    "on_wait_timeout": "CONTINUE",
                },
            ) as resp:
                result = await resp.json()

            stmt_id = result.get("statement_id")
            state = result.get("status", {}).get("state", "")

            # Poll up to 15s if still running
            for _ in range(15):
                if state in ("SUCCEEDED", "FAILED", "CANCELED", "CLOSED"):
                    break
                await asyncio.sleep(1)
                async with session.get(
                    f"{host}/api/2.0/sql/statements/{stmt_id}",
                    headers={"Authorization": f"Bearer {token}"},
                ) as resp:
                    result = await resp.json()
                    state = result.get("status", {}).get("state", "")

            if state != "SUCCEEDED":
                error_msg = result.get("status", {}).get("error", {}).get("message", "Query failed")
            else:
                manifest = result.get("manifest", {})
                columns = [c["name"] for c in manifest.get("schema", {}).get("columns", [])]
                rows = result.get("result", {}).get("data_array", []) or []
    except Exception as e:
        error_msg = str(e)

    # Step 3: AI summary of results
    if error_msg:
        summary = f"The query could not be completed: {error_msg}"
    else:
        count = len(rows)
        explain_resp = await client.chat.completions.create(
            model=SERVING_ENDPOINT,
            messages=[{
                "role": "user",
                "content": (
                    f'Summarize this query result for a retail marketer in 1-2 sentences. '
                    f'Question: "{req.question}". Result: {count} rows returned. '
                    f'Columns: {columns}. First few rows: {rows[:3]}. '
                    f'Be concise and actionable.'
                ),
            }],
            max_tokens=100,
            temperature=0.4,
        )
        summary = explain_resp.choices[0].message.content.strip()

    return {
        "question": req.question,
        "sql": sql,
        "columns": columns,
        "rows": rows[:20],
        "row_count": len(rows),
        "summary": summary,
        "error": error_msg,
    }
