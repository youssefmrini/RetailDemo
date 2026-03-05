# ShopMind — Makefile
# Usage:
#   make setup   PROFILE=fe-sandbox-tko CATALOG=yousseftko_catalog EMAIL=you@example.com
#   make deploy  PROFILE=fe-sandbox-tko EMAIL=you@example.com
#   make logs    PROFILE=fe-sandbox-tko

PROFILE   ?= fe-sandbox-tko
CATALOG   ?= yousseftko_catalog
EMAIL     ?=
APP       ?= shopmind-portal
LAKEBASE  ?= shopmind-state

.PHONY: setup deploy logs help

help:
	@echo ""
	@echo "ShopMind Makefile"
	@echo "-----------------"
	@echo "  make setup   PROFILE=<profile> CATALOG=<catalog> [EMAIL=<email>]"
	@echo "               One-time: creates UC schemas, uploads CSV data, creates Lakebase,"
	@echo "               and creates the Databricks App."
	@echo ""
	@echo "  make deploy  PROFILE=<profile> [EMAIL=<email>]"
	@echo "               Build frontend, sync files, and deploy the app."
	@echo ""
	@echo "  make logs    PROFILE=<profile>"
	@echo "               Print the live app logs URL."
	@echo ""
	@echo "Example:"
	@echo "  make setup  PROFILE=fe-sandbox-tko CATALOG=yousseftko_catalog"
	@echo "  make deploy PROFILE=fe-sandbox-tko"
	@echo ""

setup:
	@chmod +x scripts/setup.sh
	@if [ -n "$(EMAIL)" ]; then \
	  ./scripts/setup.sh --profile $(PROFILE) --catalog $(CATALOG) --email $(EMAIL) --lakebase $(LAKEBASE) --app $(APP); \
	else \
	  ./scripts/setup.sh --profile $(PROFILE) --catalog $(CATALOG) --lakebase $(LAKEBASE) --app $(APP); \
	fi

deploy:
	@chmod +x scripts/deploy.sh
	@if [ -n "$(EMAIL)" ]; then \
	  ./scripts/deploy.sh --profile $(PROFILE) --email $(EMAIL) --app $(APP); \
	else \
	  ./scripts/deploy.sh --profile $(PROFILE) --app $(APP); \
	fi

logs:
	@APP_URL=$$(databricks apps get $(APP) -p $(PROFILE) -o json 2>/dev/null | jq -r '.url // ""'); \
	if [ -n "$$APP_URL" ]; then \
	  echo "Logs: $$APP_URL/logz"; \
	else \
	  echo "App not found or not yet deployed."; \
	fi
