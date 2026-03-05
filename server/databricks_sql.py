"""Thin async wrapper around the Databricks SQL Statement API."""
from __future__ import annotations
import asyncio
import aiohttp
from .config import get_oauth_token, get_workspace_host

WAREHOUSE_ID = "d85fb7ed40320552"


async def run_sql(
    sql: str,
    catalog: str = "yousseftko_catalog",
    schema: str = "bronze",
    timeout_s: int = 12,
) -> tuple[list[str], list[list]]:
    """Execute SQL and return (columns, rows). Raises RuntimeError on failure."""
    token = get_oauth_token()
    host = get_workspace_host()

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{host}/api/2.0/sql/statements",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "statement": sql,
                "warehouse_id": WAREHOUSE_ID,
                "catalog": catalog,
                "schema": schema,
                "wait_timeout": f"{timeout_s}s",
                "on_wait_timeout": "CONTINUE",
            },
        ) as resp:
            result = await resp.json()

        stmt_id = result.get("statement_id")
        state = result.get("status", {}).get("state", "")

        for _ in range(15):
            if state in ("SUCCEEDED", "FAILED", "CANCELED", "CLOSED"):
                break
            await asyncio.sleep(1)
            async with session.get(
                f"{host}/api/2.0/sql/statements/{stmt_id}",
                headers={"Authorization": f"Bearer {token}"},
            ) as resp:
                result = await resp.json()
                state = result.get("status", {}).get("state", "")

    if state != "SUCCEEDED":
        error = result.get("status", {}).get("error", {}).get("message", "Query failed")
        raise RuntimeError(error)

    manifest = result.get("manifest", {})
    columns = [c["name"] for c in manifest.get("schema", {}).get("columns", [])]
    rows = result.get("result", {}).get("data_array", []) or []
    return columns, rows
