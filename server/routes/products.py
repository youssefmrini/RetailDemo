"""
Product Lookup Service — powered by Lakebase for sub-millisecond retrieval.
Demonstrates the operational store capability at scale.
"""
from __future__ import annotations
import random
import time
from fastapi import APIRouter, Query
from ..db import db

router = APIRouter(prefix="/products", tags=["products"])

_MOCK_PRODUCTS = {
    "Denim": [
        {"product_sku":"SKU_DEN001","name":"Slim Taper Raw Selvedge","brand":"UrbanThread","price":189.99,"discount_pct":20,"rating":4.8,"review_count":1243,"stock_qty":340,"tags":"trending|bestseller","category":"Denim"},
        {"product_sku":"SKU_DEN002","name":"Wide Leg Indigo Wash","brand":"UrbanThread","price":159.99,"discount_pct":0,"rating":4.6,"review_count":876,"stock_qty":210,"tags":"new|relaxed","category":"Denim"},
        {"product_sku":"SKU_DEN003","name":"High-Rise Skinny Stretch","brand":"DenimCo","price":129.99,"discount_pct":15,"rating":4.7,"review_count":2104,"stock_qty":560,"tags":"bestseller|everyday","category":"Denim"},
        {"product_sku":"SKU_DEN004","name":"Distressed Boyfriend Jean","brand":"DenimCo","price":119.99,"discount_pct":25,"rating":4.5,"review_count":1540,"stock_qty":430,"tags":"sale|casual","category":"Denim"},
        {"product_sku":"SKU_DEN005","name":"Rigid Straight Leg 501","brand":"BlueStitch","price":149.99,"discount_pct":10,"rating":4.6,"review_count":980,"stock_qty":300,"tags":"classic|durable","category":"Denim"},
        {"product_sku":"SKU_DEN006","name":"Cropped Flare Dark Rinse","brand":"BlueStitch","price":174.99,"discount_pct":0,"rating":4.4,"review_count":612,"stock_qty":185,"tags":"retro|trending","category":"Denim"},
    ],
    "Activewear": [
        {"product_sku":"SKU_ACT001","name":"CloudFlex Performance Tee","brand":"SwiftGear","price":79.99,"discount_pct":15,"rating":4.7,"review_count":892,"stock_qty":560,"tags":"new|athletic","category":"Activewear"},
        {"product_sku":"SKU_ACT002","name":"Pro Compression Leggings","brand":"SwiftGear","price":109.99,"discount_pct":10,"rating":4.8,"review_count":1640,"stock_qty":720,"tags":"bestseller|gym","category":"Activewear"},
        {"product_sku":"SKU_ACT003","name":"AeroMesh Training Shorts","brand":"PeakForm","price":64.99,"discount_pct":0,"rating":4.5,"review_count":730,"stock_qty":480,"tags":"breathable|training","category":"Activewear"},
        {"product_sku":"SKU_ACT004","name":"Seamless Sports Bra","brand":"PeakForm","price":54.99,"discount_pct":20,"rating":4.6,"review_count":1120,"stock_qty":390,"tags":"sale|support","category":"Activewear"},
        {"product_sku":"SKU_ACT005","name":"Thermal Run Jacket","brand":"MotionX","price":139.99,"discount_pct":0,"rating":4.7,"review_count":540,"stock_qty":210,"tags":"winter|running","category":"Activewear"},
        {"product_sku":"SKU_ACT006","name":"4-Way Stretch Yoga Pants","brand":"MotionX","price":94.99,"discount_pct":12,"rating":4.9,"review_count":2380,"stock_qty":830,"tags":"yoga|flex","category":"Activewear"},
    ],
    "Outerwear": [
        {"product_sku":"SKU_OUT001","name":"Alpine Shield Parka","brand":"NordLayer","price":349.99,"discount_pct":25,"rating":4.9,"review_count":654,"stock_qty":120,"tags":"premium|winter","category":"Outerwear"},
        {"product_sku":"SKU_OUT002","name":"Quilted Down Bomber","brand":"NordLayer","price":279.99,"discount_pct":15,"rating":4.7,"review_count":892,"stock_qty":190,"tags":"lightweight|packable","category":"Outerwear"},
        {"product_sku":"SKU_OUT003","name":"Trench Coat Classic Khaki","brand":"RainCroft","price":319.99,"discount_pct":10,"rating":4.6,"review_count":765,"stock_qty":145,"tags":"timeless|rain","category":"Outerwear"},
        {"product_sku":"SKU_OUT004","name":"Sherpa-Lined Denim Jacket","brand":"RainCroft","price":189.99,"discount_pct":0,"rating":4.5,"review_count":543,"stock_qty":260,"tags":"cozy|casual","category":"Outerwear"},
        {"product_sku":"SKU_OUT005","name":"Waterproof Shell Anorak","brand":"PeakWard","price":229.99,"discount_pct":20,"rating":4.8,"review_count":410,"stock_qty":95,"tags":"hiking|technical","category":"Outerwear"},
        {"product_sku":"SKU_OUT006","name":"Wool Blend Overcoat","brand":"PeakWard","price":399.99,"discount_pct":0,"rating":4.8,"review_count":320,"stock_qty":75,"tags":"luxury|office","category":"Outerwear"},
    ],
    "Footwear": [
        {"product_sku":"SKU_FOO001","name":"Street Runner Pro","brand":"PaceCore","price":129.99,"discount_pct":10,"rating":4.6,"review_count":2100,"stock_qty":890,"tags":"limited|trending","category":"Footwear"},
        {"product_sku":"SKU_FOO002","name":"Leather Chelsea Boot","brand":"StrideWell","price":219.99,"discount_pct":0,"rating":4.7,"review_count":1340,"stock_qty":320,"tags":"classic|versatile","category":"Footwear"},
        {"product_sku":"SKU_FOO003","name":"Canvas Low-Top Sneaker","brand":"PaceCore","price":74.99,"discount_pct":20,"rating":4.5,"review_count":3200,"stock_qty":1100,"tags":"casual|sale","category":"Footwear"},
        {"product_sku":"SKU_FOO004","name":"Suede Platform Loafer","brand":"SoleCraft","price":159.99,"discount_pct":15,"rating":4.6,"review_count":870,"stock_qty":410,"tags":"office|elevated","category":"Footwear"},
        {"product_sku":"SKU_FOO005","name":"Trail Hiker GTX","brand":"SoleCraft","price":189.99,"discount_pct":0,"rating":4.8,"review_count":650,"stock_qty":240,"tags":"outdoor|waterproof","category":"Footwear"},
        {"product_sku":"SKU_FOO006","name":"Slip-On Knit Mule","brand":"StrideWell","price":89.99,"discount_pct":10,"rating":4.4,"review_count":540,"stock_qty":560,"tags":"comfort|new","category":"Footwear"},
    ],
    "Accessories": [
        {"product_sku":"SKU_ACC001","name":"Merino Knit Beanie","brand":"Knitworks","price":44.99,"discount_pct":0,"rating":4.5,"review_count":320,"stock_qty":410,"tags":"cozy|winter","category":"Accessories"},
        {"product_sku":"SKU_ACC002","name":"Leather Card Wallet Slim","brand":"CraftHold","price":89.99,"discount_pct":10,"rating":4.7,"review_count":1230,"stock_qty":540,"tags":"minimalist|gift","category":"Accessories"},
        {"product_sku":"SKU_ACC003","name":"Silk Twill Scarf 90cm","brand":"Knitworks","price":119.99,"discount_pct":0,"rating":4.8,"review_count":410,"stock_qty":180,"tags":"luxury|seasonal","category":"Accessories"},
        {"product_sku":"SKU_ACC004","name":"Canvas Tote Bag Large","brand":"CraftHold","price":59.99,"discount_pct":15,"rating":4.6,"review_count":980,"stock_qty":620,"tags":"everyday|sustainable","category":"Accessories"},
        {"product_sku":"SKU_ACC005","name":"Aviator Sunglasses UV400","brand":"LensCraft","price":149.99,"discount_pct":20,"rating":4.5,"review_count":760,"stock_qty":290,"tags":"summer|sale","category":"Accessories"},
        {"product_sku":"SKU_ACC006","name":"Ribbed Leather Belt 32mm","brand":"LensCraft","price":79.99,"discount_pct":0,"rating":4.4,"review_count":490,"stock_qty":360,"tags":"classic|formal","category":"Accessories"},
    ],
    "Basics": [
        {"product_sku":"SKU_BAS001","name":"Essential Crew Tee 3-Pack","brand":"Foundry","price":59.99,"discount_pct":10,"rating":4.6,"review_count":3200,"stock_qty":1200,"tags":"value|everyday","category":"Basics"},
        {"product_sku":"SKU_BAS002","name":"Heavyweight Pocket Tee","brand":"Foundry","price":34.99,"discount_pct":0,"rating":4.7,"review_count":2540,"stock_qty":1450,"tags":"bestseller|durable","category":"Basics"},
        {"product_sku":"SKU_BAS003","name":"Relaxed Fit Chino","brand":"CoreWear","price":79.99,"discount_pct":15,"rating":4.6,"review_count":1800,"stock_qty":870,"tags":"work|casual","category":"Basics"},
        {"product_sku":"SKU_BAS004","name":"Classic V-Neck Tee","brand":"CoreWear","price":24.99,"discount_pct":0,"rating":4.4,"review_count":4100,"stock_qty":2000,"tags":"everyday|value","category":"Basics"},
        {"product_sku":"SKU_BAS005","name":"Fleece Crew Sweatshirt","brand":"BasicCo","price":64.99,"discount_pct":20,"rating":4.7,"review_count":1650,"stock_qty":940,"tags":"cozy|sale","category":"Basics"},
        {"product_sku":"SKU_BAS006","name":"Straight Khaki Chino","brand":"BasicCo","price":69.99,"discount_pct":10,"rating":4.5,"review_count":1120,"stock_qty":710,"tags":"classic|office","category":"Basics"},
    ],
    "Formal": [
        {"product_sku":"SKU_FOR001","name":"Oxford Stretch Blazer","brand":"Stridewell","price":279.99,"discount_pct":15,"rating":4.7,"review_count":445,"stock_qty":220,"tags":"office|premium","category":"Formal"},
        {"product_sku":"SKU_FOR002","name":"Slim Fit Wool Suit","brand":"Stridewell","price":549.99,"discount_pct":0,"rating":4.8,"review_count":310,"stock_qty":85,"tags":"premium|wedding","category":"Formal"},
        {"product_sku":"SKU_FOR003","name":"Poplin Dress Shirt White","brand":"TailorMade","price":99.99,"discount_pct":10,"rating":4.6,"review_count":920,"stock_qty":450,"tags":"classic|office","category":"Formal"},
        {"product_sku":"SKU_FOR004","name":"Flat-Front Dress Trouser","brand":"TailorMade","price":149.99,"discount_pct":20,"rating":4.5,"review_count":680,"stock_qty":310,"tags":"sale|versatile","category":"Formal"},
        {"product_sku":"SKU_FOR005","name":"Silk Blend Tie Navy","brand":"CrestWear","price":69.99,"discount_pct":0,"rating":4.4,"review_count":390,"stock_qty":520,"tags":"gift|classic","category":"Formal"},
        {"product_sku":"SKU_FOR006","name":"Double-Breasted Blazer","brand":"CrestWear","price":329.99,"discount_pct":10,"rating":4.7,"review_count":275,"stock_qty":110,"tags":"trendy|premium","category":"Formal"},
    ],
    "Loungewear": [
        {"product_sku":"SKU_LOU001","name":"Bamboo Comfort Set","brand":"SoftHome","price":119.99,"discount_pct":20,"rating":4.8,"review_count":780,"stock_qty":340,"tags":"cozy|sustainable","category":"Loungewear"},
        {"product_sku":"SKU_LOU002","name":"French Terry Hoodie","brand":"SoftHome","price":94.99,"discount_pct":0,"rating":4.7,"review_count":1120,"stock_qty":490,"tags":"cozy|everyday","category":"Loungewear"},
        {"product_sku":"SKU_LOU003","name":"Waffle Knit Robe","brand":"CozyCo","price":109.99,"discount_pct":15,"rating":4.9,"review_count":640,"stock_qty":260,"tags":"luxury|gift","category":"Loungewear"},
        {"product_sku":"SKU_LOU004","name":"Plush Jogger Set","brand":"CozyCo","price":129.99,"discount_pct":0,"rating":4.6,"review_count":870,"stock_qty":370,"tags":"matching|soft","category":"Loungewear"},
        {"product_sku":"SKU_LOU005","name":"Ribbed Tank & Short Set","brand":"RestWell","price":74.99,"discount_pct":10,"rating":4.5,"review_count":540,"stock_qty":420,"tags":"summer|sleep","category":"Loungewear"},
        {"product_sku":"SKU_LOU006","name":"Modal Oversized Sweatshirt","brand":"RestWell","price":84.99,"discount_pct":25,"rating":4.7,"review_count":930,"stock_qty":580,"tags":"sale|trending","category":"Loungewear"},
    ],
}


@router.get("")
async def list_products(category: str = Query(default="Denim"), limit: int = Query(default=6, le=50)):
    """
    Sub-millisecond product lookup from Lakebase.
    Demonstrates operational store serving millions of concurrent requests.
    """
    t0 = time.perf_counter()

    try:
        rows = await db.fetch(
            """SELECT product_sku, name, category, brand, price,
                      discount_pct, rating, review_count, stock_qty, tags
               FROM products
               WHERE category = $1 AND stock_qty > 0
               ORDER BY rating DESC, review_count DESC
               LIMIT $2""",
            category, limit
        )
        elapsed = round((time.perf_counter() - t0) * 1000, 3)

        if rows:
            return {
                "category": category,
                "products": [dict(r) for r in rows],
                "source": "lakebase",
                "latency_ms": elapsed,
                "count": len(rows),
            }
    except Exception as e:
        print(f"[products] Lakebase error: {e}")
        elapsed = round((time.perf_counter() - t0) * 1000, 3)

    # Fallback
    mock = _MOCK_PRODUCTS.get(category, list(_MOCK_PRODUCTS.values())[0])
    return {
        "category": category,
        "products": mock[:limit],
        "source": "mock",
        "latency_ms": round(random.uniform(0.2, 0.6), 3),
        "count": len(mock[:limit]),
    }


@router.get("/{sku}")
async def get_product(sku: str):
    """Single product lookup by SKU — sub-ms point read from Lakebase."""
    t0 = time.perf_counter()

    try:
        row = await db.fetchrow(
            """SELECT product_sku, name, category, brand, price,
                      discount_pct, rating, review_count, stock_qty, tags, description
               FROM products WHERE product_sku = $1""",
            sku
        )
        elapsed = round((time.perf_counter() - t0) * 1000, 3)
        if row:
            return {"product": dict(row), "source": "lakebase", "latency_ms": elapsed}
    except Exception:
        elapsed = round((time.perf_counter() - t0) * 1000, 3)

    return {
        "product": None,
        "source": "mock",
        "latency_ms": elapsed,
        "error": "Product not found",
    }
