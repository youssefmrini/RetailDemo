import random
import string
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .. import spark_client
from ..db import db
from ..llm import style_and_explain
from ..agent import style_agent

router = APIRouter(prefix="/offers", tags=["offers"])


class GenerateOfferRequest(BaseModel):
    customer_id: str
    category: str
    customer_data: dict = {}


class SessionUpdateRequest(BaseModel):
    customer_id: str
    category: str
    device: str = "web"


def _offer_code():
    return "SM-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


@router.post("/generate")
async def generate_offer(req: GenerateOfferRequest):
    """
    Core demo endpoint: AI-generates a personalized offer for a customer
    browsing a specific category. Writes result to Lakebase instantly.
    """
    # 1. Get product recommendations from Spark/Delta
    products = spark_client.get_product_recommendations(req.category, limit=5)
    if not products:
        # Mock products
        products = [
            {"product_sku": f"SKU_{req.category[:3].upper()}001",
             "name": f"Premium {req.category} Essential",
             "category": req.category, "brand": "UrbanThread",
             "price": round(random.uniform(49.99, 199.99), 2),
             "discount_pct": random.choice([15, 20, 25, 30]),
             "rating": round(random.uniform(4.0, 5.0), 1),
             "tags": "trending|bestseller"}
        ]

    top_product = products[0]
    interests = req.customer_data.get("favorite_categories", req.category).split("|")

    # 2. AI message + explanation in parallel
    try:
        offer_message, explanation = await style_and_explain(
            interests, req.category, {**req.customer_data, "current_category": req.category}
        )
    except Exception:
        offer_message = f"We picked this {req.category} piece just for you — trending right now and matching your style perfectly."
        explanation = f"Based on your behavior, you've shown strong interest in {req.category} recently."

    # 4. Write offer to Lakebase (sub-second)
    offer_code = _offer_code()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    relevance  = round(random.uniform(0.75, 0.99), 3)

    try:
        await db.execute(
            """INSERT INTO personalized_offers
               (customer_id, offer_code, product_sku, product_name, category,
                relevance_score, discount_pct, offer_message, expires_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
               ON CONFLICT (customer_id, offer_code) DO NOTHING""",
            req.customer_id, offer_code,
            top_product["product_sku"], top_product["name"],
            req.category, relevance,
            top_product.get("discount_pct", 20),
            offer_message, expires_at
        )
    except Exception as e:
        print(f"[offers] Lakebase write error: {e}")

    return {
        "offer_code":    offer_code,
        "product":       top_product,
        "offer_message": offer_message,
        "explanation":   explanation,
        "relevance":     relevance,
        "discount_pct":  top_product.get("discount_pct", 20),
        "expires_at":    expires_at.isoformat(),
    }


@router.post("/session")
async def update_session(req: SessionUpdateRequest):
    """Update active browsing session in Lakebase — real-time intent tracking."""
    try:
        await db.execute(
            """INSERT INTO active_sessions (customer_id, current_category, device, page_views, updated_at)
               VALUES ($1, $2, $3, 1, NOW())
               ON CONFLICT (customer_id) DO UPDATE
               SET current_category = $2,
                   device           = $3,
                   page_views       = active_sessions.page_views + 1,
                   updated_at       = NOW()""",
            req.customer_id, req.category, req.device
        )
    except Exception as e:
        print(f"[offers] Session update error: {e}")
    return {"status": "ok", "category": req.category}


@router.delete("/{customer_id}")
async def clear_offers(customer_id: str):
    try:
        await db.execute(
            "UPDATE personalized_offers SET is_active = FALSE WHERE customer_id = $1",
            customer_id
        )
    except Exception:
        pass
    return {"status": "cleared"}


@router.post("/agent")
async def agent_offer(req: GenerateOfferRequest):
    """
    Full agentic offer: Claude uses tools (intent lookup, product catalog,
    peer signals) before writing the personalized message. Slower but richer.
    """
    result = await style_agent(req.customer_id, req.customer_data, req.category)

    offer_code = _offer_code()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    relevance  = round(random.uniform(0.82, 0.99), 3)

    products = result.get("products_considered", [])
    top_product = products[0] if products else {
        "product_sku": f"SKU_{req.category[:3].upper()}001",
        "name": f"Premium {req.category} Essential",
        "category": req.category, "brand": "UrbanThread",
        "price": round(random.uniform(49.99, 199.99), 2),
        "discount_pct": 20,
    }

    try:
        await db.execute(
            """INSERT INTO personalized_offers
               (customer_id, offer_code, product_sku, product_name, category,
                relevance_score, discount_pct, offer_message, expires_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
               ON CONFLICT (customer_id, offer_code) DO NOTHING""",
            req.customer_id, offer_code,
            top_product.get("product_sku", offer_code),
            top_product.get("name", top_product.get("product_name", f"{req.category} Pick")),
            req.category, relevance,
            top_product.get("discount_pct", 20),
            result["offer_message"], expires_at
        )
    except Exception as e:
        print(f"[agent] Lakebase write error: {e}")

    return {
        "offer_code":        offer_code,
        "product":           top_product,
        "offer_message":     result["offer_message"],
        "explanation":       result["explanation"],
        "reasoning_steps":   result["reasoning_steps"],
        "relevance":         relevance,
        "discount_pct":      top_product.get("discount_pct", 20),
        "expires_at":        expires_at.isoformat(),
        "agent_mode":        True,
    }
