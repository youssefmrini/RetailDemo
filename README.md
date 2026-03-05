# STRYDE Retail Intelligence — ShopMind Demo

A full-stack Databricks loyalty intelligence demo app for a fictional sportswear retailer (STRYDE). Demonstrates real-time customer intent scoring, AI-powered offer generation, Unity Catalog governance, and Lakebase persistence.

**Live app:** https://shopmind-portal-7474652128591661.aws.databricksapps.com

---

## Architecture

```
CSV files (data/)
      │
      ▼
Unity Catalog Volume (yousseftko_catalog.raw.source_files)
      │
      ▼
DLT Pipeline (pipelines/dlt_pipeline.py)
      ├── Bronze: raw customers, products, purchases, clickstream
      ├── Silver: customer intent scores, golden record
      └── Gold:   top intent customers (campaign targeting)
      │
      ▼
FastAPI Backend (server/)          Claude Sonnet (offer gen, copy, NL-to-SQL)
      │
      ├── Unity Catalog queries    (live customer data, segment counts)
      ├── Lakebase Postgres        (offers, campaigns, session state)
      └── React Frontend (frontend/src/)
```

**Stack:** Databricks Apps · FastAPI · React + Vite + Tailwind · Lakebase (asyncpg) · DLT · Unity Catalog · Claude Sonnet 4.5

---

## Repository Layout

```
shopmind-portal/
├── app.py                  # FastAPI app entry point
├── app.yaml                # Databricks App config
├── requirements.txt        # Python dependencies
├── server/                 # Backend
│   ├── config.py           # Auth + workspace client
│   ├── db.py               # Lakebase asyncpg pool
│   ├── llm.py              # Claude Sonnet client
│   ├── databricks_sql.py   # Unity Catalog SQL runner
│   └── routes/             # API endpoints
│       ├── customers.py    # Customer search + profiles
│       ├── campaigns.py    # Campaign CRUD + AI copy
│       ├── offers.py       # Claude offer generation
│       ├── analytics.py    # KPIs + intent tables
│       └── genie.py        # NL-to-SQL
├── frontend/               # React app
│   └── src/
│       ├── pages/          # Dashboard, Customers, Campaigns, Analytics, Portal
│       └── components/     # DemoGuide, ChatWidget, Toast, Skeleton
├── pipelines/
│   ├── dlt_pipeline.py     # DLT Bronze → Silver → Gold
│   └── generate_mock_data.py  # Synthetic data generator
└── data/                   # Source datasets
    ├── customer_profiles.csv   (10,000 rows)
    ├── purchase_history.csv    (56,734 rows)
    ├── clickstream_events.csv  (50,000 rows)
    └── products_catalog.csv    (2,000 rows)
```

---

## Deployment Guide

### Prerequisites

- Databricks workspace with serverless compute enabled
- Databricks CLI v0.285.0+ authenticated: `databricks auth login --host <workspace-url> --profile <profile>`
- Node.js 18+ and npm
- Python 3.9+

---

### Step 1 — Set up Unity Catalog

Create the catalog and schemas:

```sql
CREATE CATALOG IF NOT EXISTS <your_catalog>;
CREATE SCHEMA IF NOT EXISTS <your_catalog>.raw;
CREATE SCHEMA IF NOT EXISTS <your_catalog>.bronze;
CREATE SCHEMA IF NOT EXISTS <your_catalog>.silver;
CREATE SCHEMA IF NOT EXISTS <your_catalog>.gold;
```

Create the source volume:

```sql
CREATE VOLUME IF NOT EXISTS <your_catalog>.raw.source_files;
```

Upload the four CSV files from `data/` to the volume:

```bash
databricks fs cp data/customer_profiles.csv   dbfs:/Volumes/<catalog>/raw/source_files/customer_profiles.csv   -p <profile>
databricks fs cp data/purchase_history.csv    dbfs:/Volumes/<catalog>/raw/source_files/purchase_history.csv    -p <profile>
databricks fs cp data/clickstream_events.csv  dbfs:/Volumes/<catalog>/raw/source_files/clickstream_events.csv  -p <profile>
databricks fs cp data/products_catalog.csv    dbfs:/Volumes/<catalog>/raw/source_files/products_catalog.csv    -p <profile>
```

---

### Step 2 — Create and Run the DLT Pipeline

1. Upload `pipelines/dlt_pipeline.py` to your Databricks workspace as a notebook
2. Go to **Workflows > Delta Live Tables > Create Pipeline**
3. Set the pipeline source to the uploaded notebook
4. Set the target catalog and schema to `<your_catalog>.bronze` (DLT will create bronze/silver/gold tables)
5. Set compute to **Serverless**
6. Update `VOLUME_PATH` in `dlt_pipeline.py` to match your volume path
7. Click **Start** — the pipeline creates all tables across bronze, silver, and gold schemas

Tables created:
- `bronze.customers`, `bronze.products`, `bronze.purchases`, `bronze.clickstream`
- `silver.customer_intent`, `silver.customer_golden_record`
- `gold.top_intent_customers`

---

### Step 3 — Create Lakebase Database

```bash
# Create Lakebase project
databricks postgres create-project shopmind-state \
  --json '{"spec": {"display_name": "ShopMind State"}}' \
  -p <profile>

# Get connection details
HOST=$(databricks postgres list-endpoints projects/shopmind-state/branches/production \
  -p <profile> -o json | jq -r '.[0].status.hosts.host')
TOKEN=$(databricks postgres generate-database-credential \
  projects/shopmind-state/branches/production/endpoints/primary \
  -p <profile> -o json | jq -r '.token')
EMAIL=$(databricks current-user me -p <profile> -o json | jq -r '.userName')

# Create database and tables
PGPASSWORD=$TOKEN psql "host=$HOST port=5432 dbname=postgres user=$EMAIL sslmode=require" \
  -c "CREATE DATABASE shopmind;"
```

The app auto-creates tables (`campaigns`, `personalized_offers`, `active_sessions`, `loyalty_state`) on first startup.

---

### Step 4 — Configure the App

Edit `server/config.py` to set your catalog name:

```python
CATALOG = os.environ.get("DATABRICKS_CATALOG", "<your_catalog>")
```

Edit `server/db.py` to set your Lakebase host:

```python
LAKEBASE_HOST = os.environ.get("PGHOST", "<your-lakebase-host>")
LAKEBASE_DB   = os.environ.get("PGDATABASE", "shopmind")
```

Edit `frontend/src/constants.ts` to set your workspace URL and Lakeview dashboard ID:

```ts
export const WORKSPACE = 'https://<your-workspace>.cloud.databricks.com'
export const DASHBOARD_ID = '<your-dashboard-id>'
```

---

### Step 5 — Build Frontend

```bash
cd frontend
npm install
npm run build
```

---

### Step 6 — Deploy to Databricks Apps

```bash
# Create the app
databricks apps create shopmind-portal \
  --description "STRYDE Loyalty Intelligence" \
  -p <profile>

# Sync files (exclude build artifacts and dependencies)
TMPDIR=$(mktemp -d) && DEST="$TMPDIR/shopmind-portal"
rsync -a . "$DEST/" \
  --exclude node_modules --exclude .venv --exclude __pycache__ \
  --exclude .git --exclude "frontend/src" --exclude "frontend/public" \
  --exclude "frontend/node_modules"

databricks workspace import-dir "$DEST" \
  "/Workspace/Users/<your-email>/shopmind-portal" \
  --overwrite -p <profile>

# Deploy
databricks apps deploy shopmind-portal \
  --source-code-path "/Workspace/Users/<your-email>/shopmind-portal" \
  -p <profile>
```

---

### Step 7 — Add Resources to the App

In the Databricks UI: **Compute > Apps > shopmind-portal > Edit**

1. Add **Database** resource → select your Lakebase project → Permission: `Can connect`
   - This auto-injects `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` as env vars
2. Add **Model serving endpoint** → select `databricks-claude-sonnet-4-5` → Permission: `Can query`
3. Click **Redeploy** to pick up the new environment variables

---

### Local Development

```bash
# Backend
export DATABRICKS_PROFILE=<profile>
pip install -r requirements.txt
uvicorn app:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev   # proxies /api/* to localhost:8000
```

---

## Data Schema

### customer_profiles.csv
| Column | Type | Description |
|--------|------|-------------|
| customer_id | string | Primary key (CUST_XXXXXX) |
| segment | string | VIP / Loyal / At-Risk / Dormant / New |
| loyalty_tier | string | Platinum / Gold / Silver / Bronze |
| ltv | float | Lifetime value in USD |
| churn_score | float | 0–1 churn probability |
| favorite_categories | string | Pipe-separated category list |
| days_since_purchase | int | Days since last order |

### purchase_history.csv
| Column | Type | Description |
|--------|------|-------------|
| purchase_id | string | Order ID |
| customer_id | string | FK to customer_profiles |
| product_sku | string | FK to products_catalog |
| total_amount | float | Order total after discount |
| purchase_date | timestamp | ISO 8601 |

### clickstream_events.csv
| Column | Type | Description |
|--------|------|-------------|
| event_id | string | Unique event ID |
| customer_id | string | FK to customer_profiles |
| event_type | string | page_view / product_view / add_to_cart / etc. |
| category | string | Product category browsed |
| timestamp | timestamp | ISO 8601 |

### products_catalog.csv
| Column | Type | Description |
|--------|------|-------------|
| product_sku | string | Primary key (SKU_XXXXXX) |
| category | string | One of 10 apparel categories |
| price | float | List price |
| brand | string | Brand name |

---

## Key Demo Flows

1. **Churn Prevention** — Dashboard shows Alex Chen (72% churn risk). Navigate to his profile, generate a Denim offer via Claude, watch churn score drop 8-15%.
2. **Campaign Builder** — Build a targeted campaign: segment → Claude writes copy → Unity Catalog counts audience live → launch with cinematic modal.
3. **Genie AI** — Ask "Which 10 customers have the highest churn risk?" in natural language → Claude generates SQL → Unity Catalog returns live results.
4. **Unity Catalog Governance** — On any customer profile, toggle Marketing ↔ SFO view to see column masking in action (8 PII columns restricted for Marketing role).
5. **Shopper Portal** — Switch to Alex Chen's view; offers generated on the admin side appear here in real time via Lakebase.

---

## Regenerating Synthetic Data

```bash
cd pipelines
python generate_mock_data.py
# Outputs CSV files to ./mock_data/
# Re-upload to Unity Catalog Volume and re-run DLT pipeline
```
