"""AI Shopping Assistant — uses Claude with context about the customer and product catalog."""
from __future__ import annotations
import random
from fastapi import APIRouter
from pydantic import BaseModel
from ..llm import get_llm_client
from ..config import SERVING_ENDPOINT

router = APIRouter(prefix="/chat", tags=["chat"])

from .products import _MOCK_PRODUCTS
from .customers import MOCK_CUSTOMERS


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    customer_id: str
    messages: list[ChatMessage]
    customer_data: dict = {}


def _build_product_summary() -> str:
    lines: list[str] = []
    for category, products in _MOCK_PRODUCTS.items():
        names = ", ".join(
            f"{p['name']} (${p['price']:.0f})" for p in products[:3]
        )
        lines.append(f"  {category}: {names}")
    return "\n".join(lines)


def _build_system_prompt(customer: dict, churn_score: float) -> str:
    name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or "Valued Customer"
    segment = customer.get("segment", "Unknown")
    tier = customer.get("loyalty_tier", "Bronze")
    ltv = customer.get("ltv", 0)
    points = customer.get("loyalty_points", 0)
    cats = customer.get("favorite_categories", "Denim|Activewear").replace("|", ", ")
    churn_pct = round(churn_score * 100)

    product_summary = _build_product_summary()

    return f"""You are STRYDE's AI Shopping Assistant. You help customers find the perfect items from our catalog.

Customer Profile:
- Name: {name}
- Segment: {segment} | Tier: {tier}
- LTV: ${ltv:,.0f} | Loyalty Points: {points:,}
- Favorite Categories: {cats}
- Churn Risk: {churn_pct}%

Available Catalog (categories: Denim, Activewear, Outerwear, Footwear, Accessories, Basics, Formal, Loungewear):
{product_summary}

Guidelines:
- Recommend specific products by name with prices
- If the customer shows interest in a product, proactively offer a 10-20% discount with a unique promo code (format: CHAT[XXXX] where XXXX is 4 digits)
- High-churn customers (churn risk above 60%) should receive better discounts (up to 25%)
- Reference their favorite categories and past behavior
- Keep responses concise (2-4 sentences max)
- Never use emojis or exclamation marks
- Be editorial and confident, like a personal stylist"""


@router.post("/message")
async def chat_message(req: ChatRequest):
    # Resolve customer data: use provided data or look up from mock
    customer = dict(req.customer_data) if req.customer_data else {}
    if not customer:
        customer = next(
            (c for c in MOCK_CUSTOMERS if c["customer_id"] == req.customer_id),
            {"first_name": "Valued", "last_name": "Customer", "segment": "Loyal",
             "loyalty_tier": "Silver", "ltv": 500, "loyalty_points": 1000,
             "favorite_categories": "Denim|Activewear", "churn_score": 0.3},
        )

    churn_score = float(customer.get("churn_score", 0.3))
    system_prompt = _build_system_prompt(customer, churn_score)

    messages = [{"role": "system", "content": system_prompt}]
    for msg in req.messages:
        messages.append({"role": msg.role, "content": msg.content})

    client = get_llm_client()
    response = await client.chat.completions.create(
        model=SERVING_ENDPOINT,
        messages=messages,
        max_tokens=120,
        temperature=0.7,
    )

    reply = response.choices[0].message.content.strip()
    return {"reply": reply, "customer_id": req.customer_id}
