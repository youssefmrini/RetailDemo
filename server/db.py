from __future__ import annotations
import os
import asyncio
import asyncpg
from contextlib import asynccontextmanager
from typing import Optional
from .config import get_oauth_token, get_workspace_client

LAKEBASE_HOST = os.environ.get("PGHOST", "ep-jolly-glade-d2trik6s.database.us-east-1.cloud.databricks.com")
LAKEBASE_DB   = os.environ.get("PGDATABASE", "shopmind")
LAKEBASE_PORT = int(os.environ.get("PGPORT", "5432"))
LAKEBASE_USER = os.environ.get("PGUSER", "")

# Refresh every 50 min — OAuth tokens expire after ~60 min
_TOKEN_REFRESH_INTERVAL = 50 * 60


def _resolve_user() -> str:
    """Return PGUSER if set, otherwise derive from workspace client."""
    if LAKEBASE_USER:
        return LAKEBASE_USER
    try:
        return get_workspace_client().current_user.me().user_name
    except Exception:
        return ""


class DatabasePool:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None
        self._refresh_task: Optional[asyncio.Task] = None

    async def get_pool(self) -> asyncpg.Pool:
        if self._pool is None:
            token = get_oauth_token()
            user = _resolve_user()
            self._pool = await asyncpg.create_pool(
                host=LAKEBASE_HOST,
                port=LAKEBASE_PORT,
                database=LAKEBASE_DB,
                user=user,
                password=token,
                ssl="require",
                min_size=2,
                max_size=10,
            )
            if self._refresh_task is None or self._refresh_task.done():
                self._refresh_task = asyncio.create_task(self._auto_refresh())
        return self._pool

    @asynccontextmanager
    async def transaction(self):
        """Async context manager that acquires a connection and starts a transaction."""
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                yield conn

    async def _auto_refresh(self):
        """Periodically rebuild pool so the OAuth token stays valid."""
        while True:
            await asyncio.sleep(_TOKEN_REFRESH_INTERVAL)
            await self.refresh()

    async def refresh(self):
        if self._pool:
            await self._pool.close()
            self._pool = None
        await self.get_pool()

    async def fetchrow(self, query: str, *args):
        pool = await self.get_pool()
        return await pool.fetchrow(query, *args)

    async def fetch(self, query: str, *args):
        pool = await self.get_pool()
        return await pool.fetch(query, *args)

    async def execute(self, query: str, *args):
        pool = await self.get_pool()
        return await pool.execute(query, *args)


db = DatabasePool()
