from __future__ import annotations
import asyncio
from openai import AsyncOpenAI
from .config import get_oauth_token, get_workspace_host, SERVING_ENDPOINT

_client: AsyncOpenAI | None = None


def get_llm_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        host = get_workspace_host()
        token = get_oauth_token()
        _client = AsyncOpenAI(api_key=token, base_url=f"{host}/serving-endpoints")
    return _client


async def style_assistant(customer_interests: list[str], recent_category: str) -> str:
    client = get_llm_client()
    prompt = f"""You are a senior copywriter for a premium fashion retailer. A shopper browsing {recent_category} has shown strong interest in: {', '.join(customer_interests[:3])}.

Write a single, elegant offer message (1-2 short sentences maximum). Rules:
- NO emojis, NO exclamation marks, NO casual openers like "Hey" or "Hi there"
- Tone: confident, editorial, like Nordstrom or Net-a-Porter
- Mention the category naturally, hint at scarcity or exclusivity
- End with quiet urgency, not pushy hype
- Output ONLY the message text, no quotes, no prefix"""

    response = await client.chat.completions.create(
        model=SERVING_ENDPOINT,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=80,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip().strip('"').strip("'")


async def genie_explain(customer_data: dict) -> str:
    client = get_llm_client()
    prompt = f"""You are ShopMind's loyalty analyst. Explain in 2 sentences why this customer is receiving a personalized offer right now, based on their data:

- Segment: {customer_data.get('segment')}
- Days since last purchase: {customer_data.get('days_since_purchase')}
- Current browsing category: {customer_data.get('current_category', 'Unknown')}
- Churn risk score: {customer_data.get('churn_score', 0):.0%}
- LTV: ${customer_data.get('ltv', 0):,.0f}

Be specific and data-driven. Start with "Based on your behavior..."."""

    response = await client.chat.completions.create(
        model=SERVING_ENDPOINT,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=120,
        temperature=0.5,
    )
    return response.choices[0].message.content


async def style_and_explain(
    customer_interests: list[str],
    recent_category: str,
    customer_data: dict,
) -> tuple[str, str]:
    """Run style_assistant and genie_explain in parallel."""
    return await asyncio.gather(
        style_assistant(customer_interests, recent_category),
        genie_explain(customer_data),
    )
