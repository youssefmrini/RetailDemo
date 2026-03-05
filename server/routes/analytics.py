import random
from fastapi import APIRouter
from .. import spark_client

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Static chart data derived from the 10k dataset for demo reliability
_SEGMENT_DIST = [
    {"segment": "Loyal",   "count": 3820, "color": "#10B981"},
    {"segment": "At-Risk", "count": 2140, "color": "#EF4444"},
    {"segment": "VIP",     "count": 1050, "color": "#F59E0B"},
    {"segment": "New",     "count": 1890, "color": "#6366F1"},
    {"segment": "Dormant", "count": 1100, "color": "#64748B"},
]
_CATEGORY_INTENT = [
    {"category": "Denim",      "intent_score": 84, "customer_count": 2340},
    {"category": "Activewear", "intent_score": 78, "customer_count": 1980},
    {"category": "Outerwear",  "intent_score": 71, "customer_count": 1450},
    {"category": "Footwear",   "intent_score": 68, "customer_count": 1620},
    {"category": "Accessories","intent_score": 62, "customer_count": 1280},
    {"category": "Basics",     "intent_score": 59, "customer_count": 2100},
    {"category": "Formal",     "intent_score": 54, "customer_count": 890},
    {"category": "Loungewear", "intent_score": 49, "customer_count": 1340},
]
_LTV_BUCKETS = [
    {"range": "$0–$250",     "count": 1820},
    {"range": "$250–$500",   "count": 2340},
    {"range": "$500–$1k",    "count": 2890},
    {"range": "$1k–$2.5k",   "count": 1760},
    {"range": "$2.5k–$5k",   "count": 780},
    {"range": "$5k–$10k",    "count": 310},
    {"range": "$10k+",       "count": 100},
]


@router.get("/top-intent")
async def top_intent_customers(category: str = None, limit: int = 50):
    """Genie-style query: high-LTV customers with strong recent browsing intent."""
    results = spark_client.get_top_intent_customers(category, limit)
    if not results:
        results = [
            {"customer_id": f"CUST_{str(i).zfill(6)}", "segment": random.choice(["VIP","Loyal","At-Risk"]),
             "loyalty_tier": random.choice(["Platinum","Gold","Silver"]),
             "ltv": round(random.uniform(200, 12000), 2),
             "churn_score": round(random.uniform(0.1, 0.9), 3),
             "days_since_purchase": random.randint(30, 90),
             "category": category or random.choice(["Denim","Activewear","Outerwear"]),
             "intent_score": round(random.uniform(10, 50), 1),
             "campaign_priority": random.choice(["HIGH","MEDIUM","LOW"])}
            for i in range(1, min(limit, 20) + 1)
        ]
    return {"customers": results, "total": len(results)}


@router.get("/summary")
async def dashboard_summary():
    """KPI summary for the marketer dashboard."""
    return {
        "total_customers":    10000,
        "vip_customers":      1050,
        "at_risk_customers":  2140,
        "avg_ltv":            1247.83,
        "offers_sent_today":  random.randint(80, 200),
        "conversion_rate":    round(random.uniform(0.28, 0.35), 3),
        "active_sessions":    random.randint(40, 120),
        "top_category":       "Denim",
    }


@router.get("/segments")
async def segment_distribution():
    """Customer segment distribution for charts."""
    return {"segments": _SEGMENT_DIST, "total": 10000}


@router.get("/categories")
async def category_intent():
    """Category intent scores and customer counts."""
    # Add small noise to scores to simulate live data
    data = [
        {**d, "intent_score": min(99, d["intent_score"] + random.randint(-2, 2))}
        for d in _CATEGORY_INTENT
    ]
    return {"categories": data}


@router.get("/ltv-buckets")
async def ltv_distribution():
    """LTV distribution buckets for histogram."""
    return {"buckets": _LTV_BUCKETS}
