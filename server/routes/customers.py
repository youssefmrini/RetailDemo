from __future__ import annotations
import random
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from .. import spark_client
from ..db import db
from ..databricks_sql import run_sql
from ..config import CATALOG

router = APIRouter(prefix="/customers", tags=["customers"])


class PurchaseRequest(BaseModel):
    amount: float
    points_earned: int
    new_ltv: float
    new_points: int

# Mock fallback data when Spark not available
MOCK_CUSTOMERS = [
    {"customer_id": "CUST_000042", "first_name": "Alex", "last_name": "Chen",
     "email": "user42@shopmind.demo", "segment": "At-Risk", "loyalty_tier": "Silver",
     "loyalty_points": 2340, "ltv": 389.50, "churn_score": 0.72,
     "favorite_categories": "Denim|Activewear|Basics", "preferred_channel": "email",
     "days_since_purchase": 38, "last_purchase_date": "2026-01-26",
     "cc_masked": "****-****-****-4242", "zip_code": "10001", "age_group": "25-34"},
    {"customer_id": "CUST_000001", "first_name": "Jordan", "last_name": "Patel",
     "email": "user1@shopmind.demo", "segment": "VIP", "loyalty_tier": "Platinum",
     "loyalty_points": 42000, "ltv": 12850.00, "churn_score": 0.04,
     "favorite_categories": "Outerwear|Formal|Footwear", "preferred_channel": "in-app",
     "days_since_purchase": 3, "last_purchase_date": "2026-03-02",
     "cc_masked": "****-****-****-1111", "zip_code": "90210", "age_group": "35-44"},
    {"customer_id": "CUST_000200", "first_name": "Taylor", "last_name": "Kim",
     "email": "user200@shopmind.demo", "segment": "Loyal", "loyalty_tier": "Gold",
     "loyalty_points": 8700, "ltv": 1890.25, "churn_score": 0.18,
     "favorite_categories": "Activewear|Swimwear|Accessories", "preferred_channel": "push",
     "days_since_purchase": 12, "last_purchase_date": "2026-02-21",
     "cc_masked": "****-****-****-3333", "zip_code": "60601", "age_group": "18-24"},
    {"customer_id": "CUST_000315", "first_name": "Morgan", "last_name": "Rivera",
     "email": "user315@shopmind.demo", "segment": "At-Risk", "loyalty_tier": "Bronze",
     "loyalty_points": 890, "ltv": 210.00, "churn_score": 0.81,
     "favorite_categories": "Denim|Basics|Footwear", "preferred_channel": "email",
     "days_since_purchase": 62, "last_purchase_date": "2026-01-02",
     "cc_masked": "****-****-****-5577", "zip_code": "77002", "age_group": "18-24"},
    {"customer_id": "CUST_000087", "first_name": "Priya", "last_name": "Sharma",
     "email": "user87@shopmind.demo", "segment": "VIP", "loyalty_tier": "Platinum",
     "loyalty_points": 31500, "ltv": 9420.75, "churn_score": 0.06,
     "favorite_categories": "Formal|Accessories|Outerwear", "preferred_channel": "in-app",
     "days_since_purchase": 7, "last_purchase_date": "2026-02-27",
     "cc_masked": "****-****-****-2288", "zip_code": "10019", "age_group": "35-44"},
    {"customer_id": "CUST_000503", "first_name": "Marcus", "last_name": "Johnson",
     "email": "user503@shopmind.demo", "segment": "Loyal", "loyalty_tier": "Gold",
     "loyalty_points": 11200, "ltv": 2340.00, "churn_score": 0.22,
     "favorite_categories": "Activewear|Denim|Footwear", "preferred_channel": "push",
     "days_since_purchase": 19, "last_purchase_date": "2026-02-14",
     "cc_masked": "****-****-****-9901", "zip_code": "30301", "age_group": "25-34"},
    {"customer_id": "CUST_001024", "first_name": "Sofia", "last_name": "Martinez",
     "email": "user1024@shopmind.demo", "segment": "New", "loyalty_tier": "Bronze",
     "loyalty_points": 350, "ltv": 89.99, "churn_score": 0.41,
     "favorite_categories": "Basics|Loungewear|Accessories", "preferred_channel": "email",
     "days_since_purchase": 5, "last_purchase_date": "2026-02-28",
     "cc_masked": "****-****-****-6643", "zip_code": "98101", "age_group": "18-24"},
    {"customer_id": "CUST_000728", "first_name": "Derek", "last_name": "Thompson",
     "email": "user728@shopmind.demo", "segment": "Dormant", "loyalty_tier": "Silver",
     "loyalty_points": 3100, "ltv": 560.00, "churn_score": 0.88,
     "favorite_categories": "Denim|Outerwear|Formal", "preferred_channel": "sms",
     "days_since_purchase": 91, "last_purchase_date": "2025-12-04",
     "cc_masked": "****-****-****-7712", "zip_code": "85001", "age_group": "45-54"},
    {"customer_id": "CUST_000156", "first_name": "Aisha", "last_name": "Williams",
     "email": "user156@shopmind.demo", "segment": "VIP", "loyalty_tier": "Platinum",
     "loyalty_points": 58000, "ltv": 15600.50, "churn_score": 0.02,
     "favorite_categories": "Activewear|Footwear|Accessories", "preferred_channel": "in-app",
     "days_since_purchase": 1, "last_purchase_date": "2026-03-04",
     "cc_masked": "****-****-****-3344", "zip_code": "94102", "age_group": "25-34"},
    {"customer_id": "CUST_000892", "first_name": "Liam", "last_name": "O'Brien",
     "email": "user892@shopmind.demo", "segment": "At-Risk", "loyalty_tier": "Silver",
     "loyalty_points": 4200, "ltv": 740.00, "churn_score": 0.67,
     "favorite_categories": "Denim|Activewear|Loungewear", "preferred_channel": "email",
     "days_since_purchase": 44, "last_purchase_date": "2026-01-20",
     "cc_masked": "****-****-****-8821", "zip_code": "02101", "age_group": "25-34"},
    {"customer_id": "CUST_000444", "first_name": "Zoe", "last_name": "Park",
     "email": "user444@shopmind.demo", "segment": "Loyal", "loyalty_tier": "Gold",
     "loyalty_points": 7600, "ltv": 1650.00, "churn_score": 0.15,
     "favorite_categories": "Accessories|Basics|Loungewear", "preferred_channel": "push",
     "days_since_purchase": 9, "last_purchase_date": "2026-02-24",
     "cc_masked": "****-****-****-5566", "zip_code": "33101", "age_group": "18-24"},
    {"customer_id": "CUST_000667", "first_name": "Rahul", "last_name": "Gupta",
     "email": "user667@shopmind.demo", "segment": "Dormant", "loyalty_tier": "Bronze",
     "loyalty_points": 1100, "ltv": 195.00, "churn_score": 0.93,
     "favorite_categories": "Formal|Footwear|Basics", "preferred_channel": "email",
     "days_since_purchase": 120, "last_purchase_date": "2025-11-05",
     "cc_masked": "****-****-****-2231", "zip_code": "75201", "age_group": "35-44"},
]


@router.get("/search")
async def search_customers(q: str = "", limit: int = 20):
    results = spark_client.search_customers(q, limit)
    if not results:
        # Filter mock data
        results = [c for c in MOCK_CUSTOMERS
                   if q.lower() in (c["first_name"] + " " + c["last_name"]).lower()
                   or q.lower() in c["customer_id"].lower()
                   or q.lower() == c["segment"].lower()
                   or not q]
    return {"customers": results, "total": len(results)}


@router.get("/{customer_id}")
async def get_customer(customer_id: str):
    profile = spark_client.get_customer_profile(customer_id)
    if not profile:
        # Try mock
        profile = next((c for c in MOCK_CUSTOMERS if c["customer_id"] == customer_id), None)
    if not profile:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Enrich with Lakebase loyalty state
    try:
        state = await db.fetchrow(
            "SELECT loyalty_points, ltv, churn_score, segment FROM loyalty_state WHERE customer_id = $1",
            customer_id
        )
        if state:
            profile["loyalty_points"] = state["loyalty_points"]
            profile["ltv"]            = float(state["ltv"])
            profile["churn_score"]    = float(state["churn_score"])
    except Exception:
        pass

    return profile


@router.post("/{customer_id}/purchase")
async def record_purchase(customer_id: str, req: PurchaseRequest):
    """Record a checkout: update LTV + loyalty points in Lakebase loyalty_state."""
    t0 = time.perf_counter()
    try:
        await db.execute(
            """INSERT INTO loyalty_state (customer_id, loyalty_points, points_balance, ltv)
               VALUES ($1, $2, $2, $3)
               ON CONFLICT (customer_id) DO UPDATE
               SET loyalty_points = $2,
                   points_balance = $2,
                   ltv            = $3""",
            customer_id, req.new_points, req.new_ltv,
        )
        elapsed = round((time.perf_counter() - t0) * 1000, 3)
        return {
            "customer_id": customer_id, "new_ltv": req.new_ltv,
            "new_points": req.new_points, "amount_added": req.amount,
            "source": "lakebase", "latency_ms": elapsed,
        }
    except Exception as e:
        print(f"[customers] purchase record error: {e}")
        return {
            "customer_id": customer_id, "new_ltv": req.new_ltv,
            "new_points": req.new_points, "amount_added": req.amount,
            "source": "mock", "latency_ms": round((time.perf_counter() - t0) * 1000, 3),
        }


@router.get("/{customer_id}/intent")
async def get_customer_intent(customer_id: str):
    intent = spark_client.get_customer_intent(customer_id)
    if not intent:
        # Query clickstream directly from Unity Catalog
        try:
            _, rows = await run_sql(
                f"""SELECT category,
                           COUNT(*) AS event_count,
                           COUNT(CASE WHEN event_type IN ('product_view','add_to_cart') THEN 1 END) AS engaged_count,
                           MAX(CAST(timestamp AS STRING)) AS last_active_ts
                    FROM {CATALOG}.bronze.clickstream
                    WHERE customer_id = '{customer_id}'
                      AND category IS NOT NULL
                    GROUP BY category
                    ORDER BY event_count DESC
                    LIMIT 8""",
                timeout_s=10,
            )
            if rows:
                max_events = max(int(r[1]) for r in rows) or 1
                intent = [
                    {
                        "category": r[0],
                        "event_count": int(r[1]),
                        "intent_score": round(int(r[1]) / max_events * 90 + random.uniform(0, 10), 1),
                        "intent_score_normalized": round(int(r[1]) / max_events, 3),
                        "session_count": max(1, int(r[1]) // 5),
                        "last_active_ts": r[3] or "2026-03-05T00:00:00Z",
                    }
                    for r in rows
                ]
        except Exception as e:
            print(f"[customers] Clickstream intent error: {e}")

    if not intent:
        # Final fallback with plausible data
        categories = ["Denim", "Activewear", "Basics"]
        intent = [
            {"category": cat, "intent_score": round(random.uniform(20, 80), 1),
             "intent_score_normalized": round(random.uniform(0.2, 0.9), 3),
             "event_count": random.randint(3, 25), "session_count": random.randint(1, 5),
             "last_active_ts": "2026-03-05T14:22:00Z"}
            for cat in categories
        ]
    return {"customer_id": customer_id, "intent": intent}


@router.get("/demo-personas")
async def get_demo_personas():
    """Return 3 real customers from Unity Catalog matching archetype profiles for ShopperPortal."""
    personas = []
    archetypes = [
        ("At-Risk", "segment = 'At-Risk' AND churn_score > 0.6 ORDER BY churn_score DESC"),
        ("VIP", "segment = 'VIP' AND loyalty_tier = 'Platinum' ORDER BY ltv DESC"),
        ("Loyal", "segment = 'Loyal' AND loyalty_tier = 'Gold' ORDER BY ltv DESC"),
    ]
    for label, where_order in archetypes:
        try:
            _, rows = await run_sql(
                f"""SELECT customer_id, first_name, last_name, segment, loyalty_tier,
                           loyalty_points, ltv, churn_score, favorite_categories
                    FROM {CATALOG}.bronze.customers
                    WHERE {where_order.split(' ORDER BY ')[0]}
                    ORDER BY {where_order.split(' ORDER BY ')[1]}
                    LIMIT 1""",
                timeout_s=10,
            )
            if rows:
                r = rows[0]
                personas.append({
                    "customer_id": r[0], "name": f"{r[1]} {r[2]}",
                    "segment": r[3], "tier": r[4],
                    "points": int(float(r[5])), "ltv": float(r[6]),
                    "churn": float(r[7]), "cats": r[8] or "Denim|Activewear",
                })
        except Exception as e:
            print(f"[customers] Demo persona error ({label}): {e}")

    if len(personas) < 3:
        # Fallback to known mock personas
        fallbacks = [
            {"customer_id": "CUST_000042", "name": "Alex Chen",    "segment": "At-Risk",  "tier": "Silver",   "points": 2340,  "ltv": 389.0,   "churn": 0.72, "cats": "Denim|Activewear|Basics"},
            {"customer_id": "CUST_000001", "name": "Jordan Patel", "segment": "VIP",      "tier": "Platinum", "points": 42000, "ltv": 12850.0, "churn": 0.04, "cats": "Outerwear|Formal|Footwear"},
            {"customer_id": "CUST_000200", "name": "Taylor Kim",   "segment": "Loyal",    "tier": "Gold",     "points": 8700,  "ltv": 1890.0,  "churn": 0.18, "cats": "Activewear|Accessories"},
        ]
        existing_ids = {p["customer_id"] for p in personas}
        for fb in fallbacks:
            if fb["customer_id"] not in existing_ids and len(personas) < 3:
                personas.append(fb)
    return {"personas": personas[:3]}


@router.get("/{customer_id}/session")
async def get_active_session(customer_id: str):
    try:
        row = await db.fetchrow(
            "SELECT * FROM active_sessions WHERE customer_id = $1", customer_id
        )
        if row:
            return dict(row)
    except Exception:
        pass
    return {"customer_id": customer_id, "current_category": None, "page_views": 0}


@router.get("/{customer_id}/offers")
async def get_active_offers(customer_id: str):
    try:
        rows = await db.fetch(
            """SELECT offer_id, offer_code, product_sku, product_name, category,
                      relevance_score, discount_pct, offer_message, expires_at
               FROM personalized_offers
               WHERE customer_id = $1 AND is_active = TRUE
               ORDER BY relevance_score DESC""",
            customer_id
        )
        return {"offers": [dict(r) for r in rows]}
    except Exception:
        return {"offers": []}


@router.get("/{customer_id}/purchases")
async def get_customer_purchases(customer_id: str, limit: int = Query(default=10, le=50)):
    """Recent purchase history for a customer from Unity Catalog."""
    t0 = time.perf_counter()
    try:
        _, rows = await run_sql(
            f"""SELECT
                    p.purchase_id,
                    p.product_sku,
                    pr.name as product_name,
                    pr.brand,
                    pr.category,
                    p.price,
                    p.quantity,
                    p.purchase_date,
                    p.total_amount
                FROM yousseftko_catalog.bronze.purchases p
                LEFT JOIN yousseftko_catalog.bronze.products pr ON p.product_sku = pr.product_sku
                WHERE p.customer_id = '{customer_id}'
                ORDER BY p.purchase_date DESC
                LIMIT {limit}""",
            timeout_s=12
        )
        elapsed = round((time.perf_counter() - t0) * 1000, 3)
        if rows:
            purchases = [
                {
                    "purchase_id": r[0],
                    "product_sku": r[1],
                    "product_name": r[2] or r[1],
                    "brand": r[3] or "Unknown",
                    "category": r[4] or "General",
                    "price": float(r[5]) if r[5] else 0.0,
                    "quantity": int(r[6]) if r[6] else 1,
                    "purchase_date": str(r[7]) if r[7] else "",
                    "total_amount": float(r[8]) if r[8] else 0.0,
                }
                for r in rows
            ]
            return {"customer_id": customer_id, "purchases": purchases, "source": "unity_catalog", "latency_ms": elapsed}
    except Exception as e:
        print(f"[purchases] Error: {e}")
        elapsed = round((time.perf_counter() - t0) * 1000, 3)

    # Fallback mock purchases
    categories = ["Denim", "Activewear", "Outerwear", "Footwear", "Accessories", "Basics", "Formal", "Loungewear"]
    brands = ["UrbanThread", "SwiftGear", "NordLayer", "PaceCore", "Knitworks", "Foundry", "Stridewell", "SoftHome"]
    products = [
        ("Slim Taper Raw Selvedge", "Denim", 189.99),
        ("CloudFlex Performance Tee", "Activewear", 79.99),
        ("Alpine Shield Parka", "Outerwear", 349.99),
        ("Street Runner Pro", "Footwear", 129.99),
        ("Merino Knit Beanie", "Accessories", 44.99),
        ("Essential Crew Tee 3-Pack", "Basics", 59.99),
        ("Oxford Stretch Blazer", "Formal", 279.99),
        ("Bamboo Comfort Set", "Loungewear", 119.99),
    ]
    mock: list[dict] = []
    elapsed = round((time.perf_counter() - t0) * 1000, 3)
    for i in range(min(limit, 8)):
        name, cat, price = random.choice(products)
        qty = random.randint(1, 3)
        days_ago = random.randint(1, 180)
        purchase_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        mock.append({
            "purchase_id": f"PUR_{customer_id[:6]}_{i:03d}",
            "product_sku": f"SKU_{cat[:3].upper()}{i+1:03d}",
            "product_name": name,
            "brand": random.choice(brands),
            "category": cat,
            "price": round(price * random.uniform(0.8, 1.0), 2),
            "quantity": qty,
            "purchase_date": purchase_date,
            "total_amount": round(price * qty * random.uniform(0.8, 1.0), 2),
        })
    mock.sort(key=lambda x: x["purchase_date"], reverse=True)
    return {"customer_id": customer_id, "purchases": mock, "source": "mock", "latency_ms": elapsed}
