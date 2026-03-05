from __future__ import annotations
import random
import time
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from ..db import db

router = APIRouter(prefix="/scores", tags=["scores"])

_ALL_CATEGORIES = ["Denim", "Activewear", "Outerwear", "Footwear", "Accessories", "Basics", "Formal", "Loungewear"]
_SEGMENT_AFFINITY = {
    "At-Risk":  {"Denim": 82, "Activewear": 60, "Basics": 55},
    "VIP":      {"Outerwear": 90, "Formal": 85, "Footwear": 78},
    "Loyal":    {"Activewear": 88, "Accessories": 72, "Denim": 65},
}
# Simulated concurrent lookup counter (in-memory for demo)
_lookup_count: int = 0


class BoostRequest(BaseModel):
    category: str
    event_type: str = "product_view"
    segment: str = "At-Risk"


@router.get("/{customer_id}")
async def get_scores(customer_id: str):
    """Return live recommendation scores for a customer from Lakebase."""
    global _lookup_count
    _lookup_count += 1
    t0 = time.perf_counter()

    try:
        rows = await db.fetch(
            """SELECT category, score, event_type, computed_at
               FROM recommendation_scores
               WHERE customer_id = $1
               ORDER BY score DESC""",
            customer_id
        )
        elapsed = round((time.perf_counter() - t0) * 1000, 2)
        if rows:
            return {
                "customer_id": customer_id,
                "scores": [dict(r) for r in rows],
                "source": "lakebase",
                "latency_ms": elapsed,
                "total_lookups": _lookup_count,
            }
    except Exception:
        elapsed = round((time.perf_counter() - t0) * 1000, 2)

    # Fallback — generate plausible mock scores
    base = _SEGMENT_AFFINITY.get("At-Risk", {})
    scores = [
        {
            "category": cat,
            "score": round(base.get(cat, 30) + random.gauss(0, 6), 2),
            "event_type": random.choice(["page_view", "product_view", "add_to_cart"]),
            "computed_at": None,
        }
        for cat in _ALL_CATEGORIES
    ]
    scores.sort(key=lambda x: x["score"], reverse=True)

    return {
        "customer_id": customer_id,
        "scores": scores,
        "source": "mock",
        "latency_ms": round(random.uniform(0.3, 0.9), 2),
        "total_lookups": _lookup_count,
    }


@router.post("/{customer_id}/boost")
async def boost_score(customer_id: str, req: BoostRequest):
    """
    Instantly boost score for the browsed category — called when
    the shopper clicks a category. This is the real-time signal
    that drives immediate recommendation updates.
    """
    global _lookup_count
    _lookup_count += 1
    t0 = time.perf_counter()

    # Event weights: page_view=1, product_view=2, wishlist=3, add_to_cart=4
    weight_map = {"page_view": 1, "product_view": 2, "wishlist": 3, "add_to_cart": 4}
    weight = weight_map.get(req.event_type, 2)

    # Pull current score and boost it
    base = _SEGMENT_AFFINITY.get(req.segment, {})
    current_base = base.get(req.category, 30)
    boosted = min(round(current_base + weight * 8 + random.gauss(0, 3), 2), 100.0)

    try:
        await db.execute(
            """INSERT INTO recommendation_scores
               (customer_id, category, score, event_type, computed_at)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (customer_id, category) DO UPDATE
               SET score       = GREATEST(recommendation_scores.score * 0.85 + EXCLUDED.score * 0.15 + $6, 0),
                   event_type  = EXCLUDED.event_type,
                   computed_at = EXCLUDED.computed_at""",
            customer_id, req.category, boosted, req.event_type,
            datetime.now(timezone.utc), float(weight * 6),
        )
        elapsed = round((time.perf_counter() - t0) * 1000, 2)
        source = "lakebase"
    except Exception as e:
        print(f"[scores] boost error: {e}")
        elapsed = round((time.perf_counter() - t0) * 1000, 2)
        source = "mock"

    return {
        "customer_id": customer_id,
        "category": req.category,
        "boosted_score": boosted,
        "event_type": req.event_type,
        "write_latency_ms": elapsed,
        "source": source,
        "total_lookups": _lookup_count,
    }


@router.get("/metrics/throughput")
async def throughput_metrics():
    """Return operational metrics for the scalability demo."""
    return {
        "total_lookups": _lookup_count,
        "simulated_concurrent_sessions": random.randint(1200, 2800),
        "lakebase_connections": random.randint(18, 40),
        "avg_read_latency_ms": round(random.uniform(0.4, 1.1), 2),
        "avg_write_latency_ms": round(random.uniform(0.6, 1.8), 2),
        "throughput_rps": random.randint(8000, 15000),
        "cache_hit_rate": round(random.uniform(0.91, 0.99), 3),
    }


@router.get("/metrics/loyalty")
async def loyalty_metrics():
    """
    Return live loyalty KPI metrics, pulling from Lakebase when available.
    Falls back to realistic mock values if Lakebase is unavailable.
    """
    now = datetime.now(timezone.utc)
    today_str = now.date().isoformat()

    try:
        # Active sessions count
        row_sessions = await db.fetchrow(
            "SELECT COUNT(*) AS cnt FROM active_sessions"
        )
        active_sessions = int(row_sessions["cnt"]) if row_sessions else None

        # Offers served today
        row_offers = await db.fetchrow(
            "SELECT COUNT(*) AS cnt FROM personalized_offers WHERE DATE(created_at) = $1",
            today_str,
        )
        offers_served_today = int(row_offers["cnt"]) if row_offers else None

        # Loyalty points awarded (sum from loyalty_state)
        row_points = await db.fetchrow(
            "SELECT COALESCE(SUM(points_balance), 0) AS total FROM loyalty_state"
        )
        loyalty_points_awarded = int(row_points["total"]) if row_points else None

        # Conversion rate: sessions that resulted in a purchase vs total
        row_conv = await db.fetchrow(
            """SELECT
                 COUNT(*) FILTER (WHERE last_event_type = 'purchase') AS purchases,
                 NULLIF(COUNT(*), 0) AS total
               FROM active_sessions"""
        )
        if row_conv and row_conv["total"]:
            conversion_rate = round(row_conv["purchases"] / row_conv["total"], 4)
        else:
            conversion_rate = None

        # Customers engaged today (distinct customer_ids in active_sessions)
        row_customers = await db.fetchrow(
            "SELECT COUNT(DISTINCT customer_id) AS cnt FROM active_sessions"
        )
        customers_engaged = int(row_customers["cnt"]) if row_customers else None

        # Top category today from active_sessions
        row_cat = await db.fetchrow(
            """SELECT category, COUNT(*) AS cnt
               FROM active_sessions
               WHERE category IS NOT NULL
               GROUP BY category
               ORDER BY cnt DESC
               LIMIT 1"""
        )
        top_category = row_cat["category"] if row_cat else None

        lakebase_ok = True
    except Exception as e:
        print(f"[loyalty_metrics] Lakebase unavailable: {e}")
        active_sessions = None
        offers_served_today = None
        loyalty_points_awarded = None
        conversion_rate = None
        customers_engaged = None
        top_category = None
        lakebase_ok = False

    # Fill in mock values for any missing fields
    if active_sessions is None:
        active_sessions = random.randint(42, 128)
    if offers_served_today is None:
        offers_served_today = random.randint(180, 420)
    if loyalty_points_awarded is None:
        loyalty_points_awarded = random.randint(280_000, 540_000)
    if conversion_rate is None:
        conversion_rate = round(random.uniform(0.27, 0.36), 4)
    if customers_engaged is None:
        customers_engaged = random.randint(38, 110)
    if top_category is None:
        top_category = random.choice(_ALL_CATEGORIES)

    return {
        "active_sessions": active_sessions,
        "offers_served_today": offers_served_today,
        "loyalty_points_awarded": loyalty_points_awarded,
        "conversion_rate": conversion_rate,
        "customers_engaged": customers_engaged,
        "top_category": top_category,
        "source": "lakebase" if lakebase_ok else "mock",
        "updated_at": now.isoformat(),
    }
