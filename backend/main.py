from __future__ import annotations

import pathlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from engine.hardware import create_hardware
from storage import Storage

# Module-level singletons shared across routers via app.state
storage: Storage
hardware = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global hardware
    s = Storage(settings.data_dir)
    s.create_dirs()
    app.state.storage = s
    app.state.settings = settings

    hw = create_hardware(settings.mock_hardware)
    hardware = hw
    app.state.hardware = hw

    yield

    # Shutdown: stop any running sessions and clean up hardware
    from engine.session import live_session, preview_session
    from engine.broadcaster import live_broadcaster, preview_broadcaster

    await preview_session.stop()
    await live_session.stop(live_broadcaster, hw)
    hw.close()


app = FastAPI(title="PiLites", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import channels, plays, preview, live, data  # noqa: E402

app.include_router(channels.router, prefix="/api")
app.include_router(plays.router, prefix="/api")
app.include_router(preview.router, prefix="/api")
app.include_router(live.router, prefix="/api")
app.include_router(data.router, prefix="/api")

_DIST = pathlib.Path(__file__).parent.parent / "frontend" / "dist"

if _DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    return FileResponse(_DIST / "index.html")
