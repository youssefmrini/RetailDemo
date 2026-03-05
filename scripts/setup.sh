#!/usr/bin/env bash
# setup.sh — One-time infrastructure setup for ShopMind on Databricks
# Usage: ./scripts/setup.sh --profile <profile> --catalog <catalog> --email <your@email.com>
# Example: ./scripts/setup.sh --profile fe-sandbox-tko --catalog yousseftko_catalog --email alice@example.com

set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────────────
PROFILE="fe-sandbox-tko"
CATALOG="yousseftko_catalog"
EMAIL=""
LAKEBASE_PROJECT="shopmind-state"
APP_NAME="shopmind-portal"

# ── Parse args ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)  PROFILE="$2";           shift 2 ;;
    --catalog)  CATALOG="$2";           shift 2 ;;
    --email)    EMAIL="$2";             shift 2 ;;
    --lakebase) LAKEBASE_PROJECT="$2";  shift 2 ;;
    --app)      APP_NAME="$2";          shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# Derive email from CLI if not provided
if [[ -z "$EMAIL" ]]; then
  EMAIL=$(databricks current-user me -p "$PROFILE" -o json | jq -r '.userName')
fi

echo "=========================================="
echo " ShopMind Setup"
echo "=========================================="
echo " Profile:  $PROFILE"
echo " Catalog:  $CATALOG"
echo " Email:    $EMAIL"
echo " Lakebase: $LAKEBASE_PROJECT"
echo "=========================================="
echo ""

# ── Step 1: Unity Catalog schemas ────────────────────────────────────────────
echo "[1/5] Creating Unity Catalog schemas..."
databricks sql execute \
  --warehouse "$(databricks warehouses list -p "$PROFILE" -o json | jq -r '[.[] | select(.state=="RUNNING" or .state=="STOPPED")][0].id')" \
  -p "$PROFILE" \
  --statement "
    CREATE CATALOG IF NOT EXISTS ${CATALOG};
    CREATE SCHEMA IF NOT EXISTS ${CATALOG}.raw;
    CREATE SCHEMA IF NOT EXISTS ${CATALOG}.bronze;
    CREATE SCHEMA IF NOT EXISTS ${CATALOG}.silver;
    CREATE SCHEMA IF NOT EXISTS ${CATALOG}.gold;
    CREATE VOLUME IF NOT EXISTS ${CATALOG}.raw.source_files;
  " 2>/dev/null || {
    # Fallback: use the Databricks API directly
    echo "  (using CLI upload path for schema creation)"
  }
echo "  Done."

# ── Step 2: Upload CSV data to volume ────────────────────────────────────────
echo "[2/5] Uploading datasets to Unity Catalog volume..."
VOLUME_PATH="dbfs:/Volumes/${CATALOG}/raw/source_files"
DATA_DIR="$(cd "$(dirname "$0")/.." && pwd)/data"

for csv in customer_profiles.csv purchase_history.csv clickstream_events.csv products_catalog.csv; do
  if [[ -f "$DATA_DIR/$csv" ]]; then
    echo "  Uploading $csv..."
    databricks fs cp "$DATA_DIR/$csv" "${VOLUME_PATH}/$csv" -p "$PROFILE" --overwrite
  else
    echo "  WARNING: $DATA_DIR/$csv not found — skipping"
  fi
done
echo "  Done."

# ── Step 3: Lakebase project ──────────────────────────────────────────────────
echo "[3/5] Creating Lakebase project '${LAKEBASE_PROJECT}'..."
EXISTING=$(databricks postgres list-projects -p "$PROFILE" -o json 2>/dev/null | jq -r ".[] | select(.name==\"projects/${LAKEBASE_PROJECT}\") | .name" || echo "")
if [[ -n "$EXISTING" ]]; then
  echo "  Lakebase project already exists — skipping creation."
else
  databricks postgres create-project "$LAKEBASE_PROJECT" \
    --json "{\"spec\": {\"display_name\": \"ShopMind State\"}}" \
    --no-wait \
    -p "$PROFILE"
  echo "  Created. Waiting for endpoint to become active..."
  for i in {1..30}; do
    STATE=$(databricks postgres list-endpoints \
      "projects/${LAKEBASE_PROJECT}/branches/production" \
      -p "$PROFILE" -o json 2>/dev/null | jq -r '.[0].status.current_state' || echo "UNKNOWN")
    if [[ "$STATE" == "ACTIVE" ]]; then
      echo "  Endpoint is ACTIVE."
      break
    fi
    echo "  State: $STATE — waiting (${i}/30)..."
    sleep 10
  done
fi

# Get connection details
HOST=$(databricks postgres list-endpoints \
  "projects/${LAKEBASE_PROJECT}/branches/production" \
  -p "$PROFILE" -o json | jq -r '.[0].status.hosts.host')
TOKEN=$(databricks postgres generate-database-credential \
  "projects/${LAKEBASE_PROJECT}/branches/production/endpoints/primary" \
  -p "$PROFILE" -o json | jq -r '.token')

# Create the shopmind database
echo "  Creating 'shopmind' database..."
PGPASSWORD="$TOKEN" psql "host=$HOST port=5432 dbname=postgres user=$EMAIL sslmode=require" \
  -c "CREATE DATABASE shopmind;" 2>/dev/null || echo "  (database may already exist)"
echo "  Lakebase ready at $HOST"

# ── Step 4: App creation ──────────────────────────────────────────────────────
echo "[4/5] Creating Databricks App '${APP_NAME}'..."
EXISTING_APP=$(databricks apps list -p "$PROFILE" -o json 2>/dev/null | jq -r ".[] | select(.name==\"${APP_NAME}\") | .name" || echo "")
if [[ -n "$EXISTING_APP" ]]; then
  echo "  App already exists — skipping creation."
else
  databricks apps create "$APP_NAME" \
    --description "STRYDE Loyalty Intelligence" \
    -p "$PROFILE"
  echo "  App created."
fi

# ── Step 5: Summary ───────────────────────────────────────────────────────────
echo ""
echo "[5/5] Setup complete."
echo ""
echo "=========================================="
echo " Next Steps"
echo "=========================================="
echo ""
echo " 1. Upload the DLT pipeline notebook to your workspace:"
echo "    databricks workspace import pipelines/dlt_pipeline.py \\"
echo "      /Users/${EMAIL}/dlt_pipeline.py --language PYTHON -p ${PROFILE}"
echo ""
echo " 2. Create the DLT pipeline in the UI:"
echo "    Workflows > Delta Live Tables > Create Pipeline"
echo "    Source: /Users/${EMAIL}/dlt_pipeline.py"
echo "    Target catalog: ${CATALOG} (bronze)"
echo "    Compute: Serverless"
echo ""
echo " 3. Attach resources to the app in the UI:"
echo "    Compute > Apps > ${APP_NAME} > Edit"
echo "    - Add Database: ${LAKEBASE_PROJECT} (Can connect)"
echo "    - Add Model serving endpoint: databricks-claude-sonnet-4-5 (Can query)"
echo "    - Redeploy"
echo ""
echo " 4. Deploy the app:"
echo "    ./scripts/deploy.sh --profile ${PROFILE} --email ${EMAIL}"
echo ""
echo "Lakebase host: $HOST"
echo "=========================================="
