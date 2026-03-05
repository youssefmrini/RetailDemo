"""
ShopMind Mock Data Generator — Scale Edition
10,000 customers · 2,000 products · 50,000 events · ~30,000 purchases
"""

import csv, random, hashlib, os
from datetime import datetime, timedelta, timezone

random.seed(42)
NOW = datetime.now(timezone.utc)

def fake_id(prefix, n): return f"{prefix}_{str(n).zfill(6)}"
def mask_cc(cc): return f"****-****-****-{cc[-4:]}"

CATEGORIES  = ["Denim","Activewear","Outerwear","Footwear","Accessories","Basics","Formal","Swimwear","Loungewear","Sportswear"]
CHANNELS    = ["email","push","sms","in-app","web"]
EVENT_TYPES = ["page_view","product_view","add_to_cart","wishlist","search","checkout_start","purchase"]
ADJECTIVES  = ["Premium","Classic","Urban","Sport","Slim","Relaxed","Vintage","Tech","Elevated","Essential"]
COLORS      = ["Black","Navy","Grey","White","Olive","Burgundy","Camel","Cobalt","Cream","Terracotta"]
BRANDS      = ["UrbanThread","PeakWear","LuxLine","CoreBasics","DriftCo","NeoFit","Atelier","Foundry","Arc","Meridian"]
FIRST_NAMES = ["Alex","Jordan","Taylor","Morgan","Casey","Riley","Drew","Quinn","Avery","Blake",
               "Sage","River","Rowan","Skylar","Harper","Finley","Emery","Reese","Logan","Parker",
               "Cameron","Kendall","Peyton","Alexis","Dylan","Jamie","Jessie","Kerry","Lee","Pat"]
LAST_NAMES  = ["Chen","Patel","Kim","Smith","Nguyen","Garcia","Okafor","Singh","Mueller","Rossi",
               "Williams","Johnson","Brown","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas",
               "Jackson","White","Harris","Martin","Thompson","Robinson","Clark","Lewis","Lee","Walker"]
AGE_GROUPS  = ["18-24","25-34","35-44","45-54","55+"]
STATES      = ["CA","NY","TX","FL","IL","WA","CO","GA","AZ","NC","MA","OH","MI","VA","NJ"]

# ── 1. customer_profiles (10,000) ─────────────────────────────────────────────

print("Generating 10,000 customers...")
customers = []
for i in range(1, 10001):
    is_vip    = i <= 1000
    is_loyal  = 1001 <= i <= 3500
    is_atrisk = 3501 <= i <= 5000
    is_new    = 5001 <= i <= 6500
    # rest = dormant

    if is_vip:    segment, tier, ltv_range, churn_range, days_range = "VIP",     "Platinum", (2500,15000), (0.01,0.15), (1,10)
    elif is_loyal:  segment, tier, ltv_range, churn_range, days_range = "Loyal",   "Gold",     (500,2499),  (0.10,0.40), (5,45)
    elif is_atrisk: segment, tier, ltv_range, churn_range, days_range = "At-Risk", "Silver",   (50,499),    (0.50,0.95), (30,180)
    elif is_new:    segment, tier, ltv_range, churn_range, days_range = "New",     "Bronze",   (10,200),    (0.20,0.60), (1,30)
    else:           segment, tier, ltv_range, churn_range, days_range = "Dormant", "Bronze",   (10,300),    (0.60,0.99), (90,365)

    days_since = random.randint(*days_range)
    fav_cats   = random.sample(CATEGORIES, k=random.randint(2,4))
    raw_cc     = f"4{''.join([str(random.randint(0,9)) for _ in range(15)])}"
    pts_base   = {"Platinum":(5000,50000),"Gold":(1000,9999),"Silver":(100,999),"Bronze":(0,99)}[tier]

    customers.append({
        "customer_id":          fake_id("CUST", i),
        "first_name":           random.choice(FIRST_NAMES),
        "last_name":            random.choice(LAST_NAMES),
        "email":                f"user{i}@shopmind.demo",
        "segment":              segment,
        "loyalty_tier":         tier,
        "loyalty_points":       random.randint(*pts_base),
        "ltv":                  round(random.uniform(*ltv_range), 2),
        "churn_score":          round(random.uniform(*churn_range), 3),
        "favorite_categories":  "|".join(fav_cats),
        "preferred_channel":    random.choice(CHANNELS),
        "days_since_purchase":  days_since,
        "last_purchase_date":   (NOW - timedelta(days=days_since)).strftime("%Y-%m-%d"),
        "account_created_date": (NOW - timedelta(days=random.randint(30,1800))).strftime("%Y-%m-%d"),
        "cc_last4":             raw_cc[-4:],
        "cc_masked":            mask_cc(raw_cc),
        "cc_raw_RESTRICTED":    raw_cc,
        "zip_code":             f"{random.randint(10000,99999)}",
        "state":                random.choice(STATES),
        "age_group":            random.choice(AGE_GROUPS),
        "gender":               random.choice(["M","F","NB","U"]),
        "total_orders":         random.randint(0, 50) if not is_atrisk else random.randint(1, 8),
    })

# ── 2. products_catalog (2,000) ───────────────────────────────────────────────

print("Generating 2,000 products...")
products = []
for i in range(1, 2001):
    cat   = CATEGORIES[(i-1) % len(CATEGORIES)]
    adj   = random.choice(ADJECTIVES)
    color = random.choice(COLORS)
    price = round(random.uniform(19.99, 449.99), 2)
    tags  = random.sample(["sustainable","trending","bestseller","limited","casual","premium","athletic","workwear","new-arrival","collab"], k=random.randint(1,4))
    products.append({
        "product_sku":    fake_id("SKU", i),
        "name":           f"{adj} {color} {cat}",
        "category":       cat,
        "subcategory":    random.choice(["Men's","Women's","Unisex","Kids"]),
        "brand":          random.choice(BRANDS),
        "price":          price,
        "discount_pct":   random.choice([0,0,0,0,5,10,15,20,25,30,40]),
        "stock_qty":      random.randint(0, 1000),
        "rating":         round(random.uniform(2.5, 5.0), 1),
        "review_count":   random.randint(0, 5000),
        "is_new_arrival": str(random.random() < 0.12),
        "tags":           "|".join(tags),
        "color":          color,
        "size_range":     random.choice(["XS-3XL","XS-XL","S-XXL","6-14"]),
        "description":    f"A {adj.lower()} {color.lower()} piece from our {cat} collection. Crafted for comfort and style.",
        "image_url":      f"https://shopmind.demo/images/{fake_id('SKU',i)}.jpg",
        "collection":     random.choice(["Spring 2026","Fall 2025","Summer 2025","Winter 2025","Capsule"]),
    })

# ── 3. clickstream_events (50,000) ────────────────────────────────────────────

print("Generating 50,000 clickstream events...")
events   = []
weights  = [8 if c["segment"]=="VIP" else 5 if c["segment"]=="Loyal" else 3 if c["segment"]=="At-Risk" else 2 if c["segment"]=="New" else 1 for c in customers]
prod_by_cat = {}
for p in products:
    prod_by_cat.setdefault(p["category"], []).append(p)

for i in range(1, 50001):
    cust = random.choices(customers, weights=weights, k=1)[0]
    # At-Risk browse denim heavily (demo story)
    if cust["segment"] == "At-Risk" and random.random() < 0.50:
        cat  = "Denim"
        prod = random.choice(prod_by_cat["Denim"])
    else:
        cat  = random.choice(cust["favorite_categories"].split("|"))
        prod = random.choice(prod_by_cat.get(cat, products))

    ts = NOW - timedelta(hours=random.randint(0,167), minutes=random.randint(0,59), seconds=random.randint(0,59))
    sid = hashlib.md5(f"{cust['customer_id']}{ts.strftime('%Y%m%d%H')}".encode()).hexdigest()[:12]

    events.append({
        "event_id":       fake_id("EVT", i),
        "session_id":     sid,
        "customer_id":    cust["customer_id"],
        "product_sku":    prod["product_sku"],
        "category":       prod["category"],
        "event_type":     random.choices(EVENT_TYPES, weights=[30,25,15,10,10,5,5], k=1)[0],
        "timestamp":      ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "device":         random.choices(["mobile","desktop","tablet"], weights=[55,35,10], k=1)[0],
        "channel":        random.choice(["web","app","email_click","social"]),
        "page_dwell_sec": random.randint(3, 480),
        "referrer":       random.choice(["direct","google","instagram","email","tiktok","pinterest"]),
        "search_query":   random.choice(["","","","","slim fit jeans","black denim","athletic shorts","running shoes","summer dress","casual jacket"]),
    })

# ── 4. purchase_history ───────────────────────────────────────────────────────

print("Generating purchases...")
purchases   = []
purchase_id = 1
for c in customers:
    n = (random.randint(10,40) if c["segment"]=="VIP" else
         random.randint(3,15)  if c["segment"]=="Loyal" else
         random.randint(0,5)   if c["segment"]=="At-Risk" else
         random.randint(0,3)   if c["segment"]=="New" else
         random.randint(0,2))
    for _ in range(n):
        prod = random.choice(products)
        qty  = random.randint(1,4)
        ts   = NOW - timedelta(days=random.randint(0,730), hours=random.randint(0,23))
        purchases.append({
            "purchase_id":   fake_id("ORD", purchase_id),
            "customer_id":   c["customer_id"],
            "product_sku":   prod["product_sku"],
            "category":      prod["category"],
            "quantity":      qty,
            "unit_price":    prod["price"],
            "discount_pct":  prod["discount_pct"],
            "total_amount":  round(qty * prod["price"] * (1 - prod["discount_pct"]/100), 2),
            "purchase_date": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "channel":       c["preferred_channel"],
            "status":        random.choices(["delivered","returned","processing","cancelled"], weights=[80,10,7,3], k=1)[0],
            "shipping_state": c["state"],
        })
        purchase_id += 1

# ── write ─────────────────────────────────────────────────────────────────────

OUT = os.path.join(os.path.dirname(__file__), "mock_data")
os.makedirs(OUT, exist_ok=True)

def write_csv(filename, rows):
    path = os.path.join(OUT, filename)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"  {filename}: {len(rows):,} rows → {os.path.getsize(path)/1024/1024:.1f} MB")

write_csv("customer_profiles.csv",  customers)
write_csv("products_catalog.csv",   products)
write_csv("clickstream_events.csv", events)
write_csv("purchase_history.csv",   purchases)
print("Done.")
