#!/usr/bin/env bash
# deploy.sh — Build frontend and deploy ShopMind to Databricks Apps
# Usage: ./scripts/deploy.sh --profile <profile> --email <your@email.com>
# Example: ./scripts/deploy.sh --profile fe-sandbox-tko --email alice@example.com

set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────────────
PROFILE="fe-sandbox-tko"
EMAIL=""
APP_NAME="shopmind-portal"
WORKSPACE_PATH=""  # derived from EMAIL if empty

# ── Parse args ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)        PROFILE="$2";        shift 2 ;;
    --email)          EMAIL="$2";          shift 2 ;;
    --app)            APP_NAME="$2";       shift 2 ;;
    --workspace-path) WORKSPACE_PATH="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# Derive email and workspace path from CLI if not provided
if [[ -z "$EMAIL" ]]; then
  EMAIL=$(databricks current-user me -p "$PROFILE" -o json | jq -r '.userName')
fi
if [[ -z "$WORKSPACE_PATH" ]]; then
  WORKSPACE_PATH="/Workspace/Users/${EMAIL}/${APP_NAME}"
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=========================================="
echo " ShopMind Deploy"
echo "=========================================="
echo " Profile:   $PROFILE"
echo " App:       $APP_NAME"
echo " Email:     $EMAIL"
echo " Workspace: $WORKSPACE_PATH"
echo "=========================================="
echo ""

# ── Step 1: Build frontend ───────────────────────────────────────────────────
echo "[1/3] Building React frontend..."
cd "$REPO_ROOT/frontend"
npm install --silent
npm run build
echo "  Build complete — $(du -sh dist | cut -f1) in frontend/dist"
cd "$REPO_ROOT"

# ── Step 2: Sync to workspace ────────────────────────────────────────────────
echo "[2/3] Syncing files to Databricks workspace..."
TMPDIR=$(mktemp -d)
DEST="$TMPDIR/$APP_NAME"

rsync -a "$REPO_ROOT/" "$DEST/" \
  --exclude node_modules \
  --exclude .venv \
  --exclude __pycache__ \
  --exclude .git \
  --exclude "frontend/src" \
  --exclude "frontend/public" \
  --exclude "frontend/node_modules" \
  --exclude "scripts" \
  --exclude "data" \
  --exclude "pipelines" \
  --exclude ".DS_Store" \
  --exclude "*.egg-info"

databricks workspace import-dir "$DEST" "$WORKSPACE_PATH" \
  --overwrite \
  -p "$PROFILE"

rm -rf "$TMPDIR"
echo "  Sync complete."

# ── Step 3: Deploy app ───────────────────────────────────────────────────────
echo "[3/3] Deploying app '${APP_NAME}'..."
databricks apps deploy "$APP_NAME" \
  --source-code-path "$WORKSPACE_PATH" \
  -p "$PROFILE"
echo "  Deploy triggered."

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
APP_URL=$(databricks apps get "$APP_NAME" -p "$PROFILE" -o json 2>/dev/null | jq -r '.url // "pending"')
echo "=========================================="
echo " Deploy complete"
echo " App URL: ${APP_URL}"
echo " Logs:    ${APP_URL}/logz"
echo "=========================================="
