import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from server.routes import customers, offers, analytics
from server.routes import scores, products, genie, campaigns, chat
from server.scorer import start_scorer


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start live recommendation scorer in the background
    task = asyncio.create_task(start_scorer())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="STRYDE — Hyper-Personalized Loyalty Portal",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router, prefix="/api")
app.include_router(offers.router,    prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(scores.router,    prefix="/api")
app.include_router(products.router,  prefix="/api")
app.include_router(genie.router,     prefix="/api")
app.include_router(campaigns.router, prefix="/api")
app.include_router(chat.router,     prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "STRYDE", "version": "2.0.0"}


# Serve React SPA
frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(os.path.join(frontend_dist, "index.html"))
