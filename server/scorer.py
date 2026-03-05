"""
Live Recommendation Scores — simulates a streaming pipeline that computes
real-time affinity scores for active shoppers and stores them in Lakebase
for sub-second frontend retrieval.
"""
from __future__ import annotations
import asyncio
import random
from datetime import datetime, timezone
from .db import db

# Score update interval (seconds) — simulates a micro-batch stream
_SCORE_INTERVAL = 8

# Category affinity weights (mirrors the DLT intent scoring logic)
_EVENT_WEIGHTS = {"page_view": 1, "product_view": 2, "wishlist": 3, "add_to_cart": 4}

# Demo shoppers that always have live scores for the portal
_DEMO_CUSTOMERS = [
    {"id": "CUST_000042", "cats": ["Denim", "Activewear", "Basics"],      "segment": "At-Risk"},
    {"id": "CUST_000001", "cats": ["Outerwear", "Formal", "Footwear"],    "segment": "VIP"},
    {"id": "CUST_000200", "cats": ["Activewear", "Accessories", "Denim"], "segment": "Loyal"},
]

_ALL_CATEGORIES = ["Denim", "Activewear", "Outerwear", "Footwear", "Accessories", "Basics", "Formal", "Loungewear"]


def _compute_score(base_cats: list[str], category: str) -> float:
    """Simulate a real-time affinity score for a category."""
    base = 80.0 if category in base_cats else 20.0
    # Add noise to simulate stream updates
    noise = random.gauss(0, 5)
    trending_boost = random.choice([0, 0, 0, 10, 15])  # occasional trending spike
    return round(min(max(base + noise + trending_boost, 0.0), 100.0), 2)


async def _upsert_scores(customer_id: str, scores: list[dict]):
    """Write scores to Lakebase recommendation_scores table."""
    for s in scores:
        try:
            await db.execute(
                """INSERT INTO recommendation_scores
                   (customer_id, category, score, event_type, computed_at)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (customer_id, category) DO UPDATE
                   SET score = EXCLUDED.score,
                       event_type = EXCLUDED.event_type,
                       computed_at = EXCLUDED.computed_at""",
                customer_id,
                s["category"],
                s["score"],
                s["event_type"],
                datetime.now(timezone.utc),
            )
        except Exception as e:
            print(f"[scorer] write error for {customer_id}/{s['category']}: {e}")


async def _tick():
    """Single scoring tick — compute + write scores for all demo customers."""
    for cust in _DEMO_CUSTOMERS:
        scores = []
        for cat in _ALL_CATEGORIES:
            event_type = random.choice(list(_EVENT_WEIGHTS.keys()))
            score = _compute_score(cust["cats"], cat)
            scores.append({"category": cat, "score": score, "event_type": event_type})
        await _upsert_scores(cust["id"], scores)


async def start_scorer():
    """Background task — runs the scoring loop indefinitely."""
    # Give the DB pool time to initialize before first write
    await asyncio.sleep(5)
    print("[scorer] Live recommendation scorer started")
    while True:
        try:
            await _tick()
        except Exception as e:
            print(f"[scorer] tick error: {e}")
        await asyncio.sleep(_SCORE_INTERVAL)
