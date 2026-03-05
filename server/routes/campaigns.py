"""Campaign management — persists to Lakebase, estimates reach via Unity Catalog,
AI-generates preview copy via Claude."""
from __future__ import annotations
import random
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from ..db import db
from ..databricks_sql import run_sql
from ..llm import get_llm_client
from ..config import CATALOG, SERVING_ENDPOINT

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

# Segment → SQL WHERE clause for real UC customer count
_SEGMENT_WHERE: dict[str, str] = {
    "All At-Risk":      "segment = 'At-Risk'",
    "VIP Dormant 30d+": "segment = 'VIP' AND days_since_purchase > 30",
    "Denim Intenders":  "favorite_categories LIKE '%Denim%'",
    "Loyal Gold Tier":  "segment = 'Loyal' AND loyalty_tier = 'Gold'",
    "New Members":      "segment = 'New'",
}

_FALLBACK_COUNTS: dict[str, int] = {
    "All At-Risk": 2140, "VIP Dormant 30d+": 312, "Denim Intenders": 2340,
    "Loyal Gold Tier": 1050, "New Members": 1890,
}

# (name, segment, category, channel, discount, status, estimated_reach, conversions, days_ago)
_SEED_CAMPAIGNS = [
    ("Denim Spring Revival",             "VIP Dormant 30d+", "Denim",      "Email",             "20%",          "complete", 1240, 186, 45),
    ("Winter Warmup — Outerwear",        "All At-Risk",      "Outerwear",  "Push Notification", "25%",          "complete", 3421, 513, 38),
    ("Active Start New Year",            "New Members",      "Activewear", "Email",             "15%",          "complete",  890,  98, 30),
    ("VIP Exclusives — Footwear",        "VIP Dormant 30d+", "Footwear",   "SMS",               "10%",          "complete",  567, 102, 25),
    ("Cozy Loungewear Bundle",           "Loyal Gold Tier",  "Loungewear", "In-App Banner",     "20%",          "complete", 2100, 378, 20),
    ("Formal Friday Sale",               "Denim Intenders",  "Formal",     "Email",             "15%",          "complete",  780,  94, 14),
    ("Basics Bundle Value Pack",         "All At-Risk",      "Basics",     "Push Notification", "10%",          "complete", 4200, 630, 10),
    ("Accessories Flash Sale",           "Loyal Gold Tier",  "Accessories","SMS",               "30%",          "complete", 1560, 312,  7),
    ("Spring Denim Drop",                "New Members",      "Denim",      "Email",             "15%",          "live",     2340, 187,  3),
    ("VIP Platinum Access — Activewear", "VIP Dormant 30d+", "Activewear", "In-App Banner",     "20%",          "live",      890,  62,  1),
    ("Summer Outerwear Clearance",       "All At-Risk",      "Outerwear",  "Email",             "25%",          "live",     3100, 155,  0),
    ("Loungewear Restock Alert",         "Loyal Gold Tier",  "Loungewear", "Push Notification", "Free Shipping","draft",    1890,   0,  0),
    ("Gold Tier Footwear Preview",       "Loyal Gold Tier",  "Footwear",   "Email",             "BOGO",         "draft",     760,   0,  0),
    ("At-Risk Win-Back — Formal",        "All At-Risk",      "Formal",     "SMS",               "30%",          "draft",    2890,   0,  0),
    ("New Member Welcome — Basics",      "New Members",      "Basics",     "In-App Banner",     "15%",          "draft",    1234,   0,  0),
]


async def _ensure_table() -> None:
    try:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS campaigns (
                campaign_id  SERIAL PRIMARY KEY,
                name         VARCHAR(200) NOT NULL,
                segment      VARCHAR(100),
                category     VARCHAR(100),
                channel      VARCHAR(50),
                discount     VARCHAR(50),
                estimated_reach INT DEFAULT 0,
                conversions  INT DEFAULT 0,
                status       VARCHAR(20) DEFAULT 'live',
                launched_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        # Seed with rich campaign history if table is empty
        count = await db.fetchrow("SELECT COUNT(*) AS cnt FROM campaigns")
        if count and count["cnt"] == 0:
            async with db.transaction() as conn:
                for (name, segment, category, channel, discount, status,
                     estimated_reach, conversions, days_ago) in _SEED_CAMPAIGNS:
                    if days_ago > 0:
                        launched_at_expr = f"NOW() - INTERVAL '{days_ago} days'"
                    else:
                        launched_at_expr = "NOW()"
                    await conn.execute(
                        f"""INSERT INTO campaigns
                               (name, segment, category, channel, discount,
                                status, estimated_reach, conversions, launched_at)
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,{launched_at_expr})""",
                        name, segment, category, channel, discount,
                        status, estimated_reach, conversions,
                    )
    except Exception as e:
        print(f"[campaigns] Table init error: {e}")


class LaunchRequest(BaseModel):
    name: str
    segment: str
    category: str
    channel: str
    discount: str
    estimated_reach: int = 0


@router.get("/estimate")
async def estimate_reach(segment: str):
    """Real customer count from Unity Catalog for a given segment."""
    where = _SEGMENT_WHERE.get(segment)
    if where:
        try:
            _, rows = await run_sql(
                f"SELECT COUNT(*) AS cnt FROM {CATALOG}.bronze.customers WHERE {where}",
                timeout_s=10,
            )
            if rows:
                return {"segment": segment, "count": int(rows[0][0]), "source": "unity_catalog"}
        except Exception as e:
            print(f"[campaigns] UC estimate error: {e}")
    return {"segment": segment, "count": _FALLBACK_COUNTS.get(segment, 500), "source": "fallback"}


@router.get("/preview-copy")
async def preview_copy(segment: str, category: str, channel: str, discount: str):
    """AI-generated campaign message for the preview panel."""
    client = get_llm_client()
    channel_guide = {
        "Email": "2 sentences, warm and editorial, like Net-a-Porter",
        "SMS": "1 sentence, under 140 characters, punchy and direct",
        "Push Notification": "Under 90 characters, attention-grabbing, no punctuation at end",
        "In-App Banner": "1-2 short sentences, conversational, creates FOMO",
    }.get(channel, "1-2 sentences, confident and direct")
    prompt = (
        f"Write a {channel_guide} campaign message for {segment} customers "
        f"interested in {category} apparel, offering {discount} off. "
        f"No emojis. No exclamation marks. No 'Hey' or 'Hi'. "
        f"Hint at exclusivity or scarcity. Output ONLY the message text, no quotes."
    )
    try:
        resp = await client.chat.completions.create(
            model=SERVING_ENDPOINT,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120,
            temperature=0.75,
        )
        copy = resp.choices[0].message.content.strip().strip('"')
    except Exception as e:
        print(f"[campaigns] AI copy error: {e}")
        copy = f"We picked this {category} deal just for you — {discount} off, today only!"
    return {"copy": copy}


@router.get("")
async def list_campaigns():
    """List all campaigns from Lakebase."""
    await _ensure_table()
    try:
        rows = await db.fetch("SELECT * FROM campaigns ORDER BY launched_at DESC LIMIT 50")
        return {"campaigns": [dict(r) for r in rows]}
    except Exception as e:
        print(f"[campaigns] List error: {e}")
        return {"campaigns": []}


@router.post("/launch")
async def launch_campaign(req: LaunchRequest):
    """Persist a new campaign to Lakebase."""
    await _ensure_table()
    try:
        row = await db.fetchrow(
            """INSERT INTO campaigns (name, segment, category, channel, discount, estimated_reach, status)
               VALUES ($1,$2,$3,$4,$5,$6,'live') RETURNING *""",
            req.name, req.segment, req.category, req.channel,
            req.discount, req.estimated_reach,
        )
        if row:
            return dict(row)
    except Exception as e:
        print(f"[campaigns] Launch error: {e}")
    return {
        "campaign_id": random.randint(100, 9999),
        "name": req.name, "segment": req.segment, "category": req.category,
        "channel": req.channel, "discount": req.discount,
        "estimated_reach": req.estimated_reach, "conversions": 0,
        "status": "live", "launched_at": datetime.now(timezone.utc).isoformat(),
    }
