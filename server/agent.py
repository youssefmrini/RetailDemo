"""
Style Assistant Agent — uses Claude tool-use to look up customer data
and generate deeply personalized recommendations.
"""
from __future__ import annotations
import json
from openai import AsyncOpenAI
from . import spark_client
from .config import get_oauth_token, get_workspace_host, SERVING_ENDPOINT

# ---------------------------------------------------------------------------
# Tool definitions (OpenAI function-calling format, supported by Databricks)
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_customer_intent",
            "description": "Returns the top browsing intent categories for a customer based on recent clickstream data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string", "description": "The CUST_XXXXXX identifier"}
                },
                "required": ["customer_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_product_recommendations",
            "description": "Returns top-rated in-stock products for a given category.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Product category e.g. Denim, Activewear"},
                    "limit": {"type": "integer", "description": "Max products to return (default 3)", "default": 3}
                },
                "required": ["category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_similar_high_value_customers",
            "description": "Finds similar high-LTV customers in the same segment who recently purchased, to inform personalization.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Category to filter by"},
                    "limit": {"type": "integer", "description": "Max customers (default 5)", "default": 5}
                },
                "required": ["category"]
            }
        }
    }
]


def _call_tool(name: str, args: dict) -> str:
    """Execute a tool call and return the result as a JSON string."""
    if name == "get_customer_intent":
        result = spark_client.get_customer_intent(args["customer_id"])
        if not result:
            result = [
                {"category": "Denim", "intent_score": 38.5, "event_count": 12},
                {"category": "Activewear", "intent_score": 22.1, "event_count": 6},
            ]
        return json.dumps(result)

    elif name == "get_product_recommendations":
        result = spark_client.get_product_recommendations(args["category"], args.get("limit", 3))
        if not result:
            result = [
                {"name": f"Premium {args['category']} Essential", "brand": "UrbanThread",
                 "price": 89.99, "discount_pct": 20, "rating": 4.7, "tags": "trending|bestseller"}
            ]
        return json.dumps(result)

    elif name == "get_similar_high_value_customers":
        result = spark_client.get_top_intent_customers(args["category"], args.get("limit", 5))
        if result:
            # Only return aggregate signals, not PII
            summary = {
                "avg_ltv": round(sum(c.get("ltv", 0) for c in result) / len(result), 2),
                "avg_days_since_purchase": round(sum(c.get("days_since_purchase", 30) for c in result) / len(result)),
                "count": len(result),
                "top_segment": max(set(c.get("segment", "") for c in result),
                                   key=lambda s: sum(1 for c in result if c.get("segment") == s))
            }
        else:
            summary = {"avg_ltv": 1240, "avg_days_since_purchase": 35, "count": 5, "top_segment": "At-Risk"}
        return json.dumps(summary)

    return json.dumps({"error": f"Unknown tool: {name}"})


async def style_agent(
    customer_id: str,
    customer_data: dict,
    category: str,
) -> dict:
    """
    Agentic style assistant that:
    1. Uses tools to gather customer intent, product data, and peer signals
    2. Generates a personalized recommendation with reasoning
    Returns: {offer_message, explanation, reasoning_steps, products_considered}
    """
    client = AsyncOpenAI(
        api_key=get_oauth_token(),
        base_url=f"{get_workspace_host()}/serving-endpoints"
    )

    system_prompt = """You are STRYDE's AI Style Assistant — an expert at hyper-personalized fashion recommendations.

You have access to tools to look up:
- Customer browsing intent (what they've been clicking on)
- Product catalog (top-rated items in any category)
- Peer signals (what similar high-value customers buy)

Use ALL available tools to gather context before writing the offer. Then produce:
1. A warm, personal offer message (2-3 sentences, conversational, not salesy)
2. A data-driven explanation of WHY this offer fits this customer

Always ground your recommendation in the data you retrieved."""

    user_message = f"""Create a personalized offer for this customer:
- Customer ID: {customer_id}
- Segment: {customer_data.get('segment', 'Unknown')}
- Loyalty Tier: {customer_data.get('loyalty_tier', 'Unknown')}
- Days since last purchase: {customer_data.get('days_since_purchase', 30)}
- Churn risk: {customer_data.get('churn_score', 0.5):.0%}
- LTV: ${customer_data.get('ltv', 500):,.0f}
- Favorite categories: {customer_data.get('favorite_categories', category)}
- Currently browsing: {category}

Use your tools to gather intent data, product options, and peer signals, then craft the perfect offer."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]

    reasoning_steps = []
    products_considered = []

    # Agentic loop — let the model call tools until it's done
    for _ in range(5):  # max 5 iterations
        response = await client.chat.completions.create(
            model=SERVING_ENDPOINT,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            max_tokens=600,
            temperature=0.7,
        )

        msg = response.choices[0].message

        # Handle dict vs object (Databricks returns dicts)
        if isinstance(msg, dict):
            content = msg.get("content")
            tool_calls_raw = msg.get("tool_calls")
            finish_reason = response.choices[0].finish_reason if hasattr(response.choices[0], 'finish_reason') else msg.get("finish_reason")
        else:
            content = msg.content
            tool_calls_raw = msg.tool_calls
            finish_reason = response.choices[0].finish_reason

        # Append assistant message
        if isinstance(msg, dict):
            messages.append({"role": "assistant", "content": content, "tool_calls": tool_calls_raw})
        else:
            messages.append(msg)

        if not tool_calls_raw:
            # Model is done — extract offer from content
            break

        # Execute tool calls
        for tc in tool_calls_raw:
            if isinstance(tc, dict):
                tc_id = tc.get("id", "")
                fn_name = tc.get("function", {}).get("name", "")
                fn_args_str = tc.get("function", {}).get("arguments", "{}")
            else:
                tc_id = tc.id
                fn_name = tc.function.name
                fn_args_str = tc.function.arguments

            try:
                fn_args = json.loads(fn_args_str)
            except Exception:
                fn_args = {}

            reasoning_steps.append(f"Called {fn_name}({json.dumps(fn_args)})")
            tool_result = _call_tool(fn_name, fn_args)

            if fn_name == "get_product_recommendations":
                try:
                    products_considered = json.loads(tool_result)
                except Exception:
                    pass

            messages.append({
                "role": "tool",
                "tool_call_id": tc_id,
                "content": tool_result,
            })

    # Extract final answer from last assistant message
    final_content = ""
    for m in reversed(messages):
        if isinstance(m, dict):
            role = m.get("role")
            c = m.get("content")
        else:
            role = getattr(m, "role", None)
            c = getattr(m, "content", None)
        if role == "assistant" and c:
            final_content = c
            break

    # Parse offer_message vs explanation from the final response
    lines = [l.strip() for l in (final_content or "").split("\n") if l.strip()]
    offer_message = ""
    explanation = ""

    for i, line in enumerate(lines):
        low = line.lower()
        if any(kw in low for kw in ["offer:", "message:", "dear", "hey", "hi", "we noticed", "you love", "we picked"]):
            offer_message = line.lstrip("Offer: Message: ").strip()
        elif any(kw in low for kw in ["explanation:", "because", "based on", "data shows", "your behavior"]):
            explanation = line.lstrip("Explanation: ").strip()

    if not offer_message and lines:
        offer_message = lines[0]
    if not explanation and len(lines) > 1:
        explanation = lines[-1]

    return {
        "offer_message": offer_message or f"We picked the best {category} deals just for you — curated from your browsing history!",
        "explanation": explanation or f"Based on your behavior, you've shown strong {category} interest recently.",
        "reasoning_steps": reasoning_steps,
        "products_considered": products_considered[:3],
    }
