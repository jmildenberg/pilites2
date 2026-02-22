from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect

from engine.broadcaster import preview_broadcaster
from engine.session import preview_session
from models import OkResponse, PreviewStatus, StartPreviewRequest

router = APIRouter(tags=["preview"])


@router.get("/preview/status", response_model=PreviewStatus)
def get_preview_status() -> PreviewStatus:
    return preview_session.status()


@router.post("/preview", response_model=OkResponse)
async def start_preview(body: StartPreviewRequest, request: Request) -> OkResponse:
    storage = request.app.state.storage
    settings = request.app.state.settings

    play = storage.load_play(body.playId)
    if play is None:
        raise HTTPException(status_code=404, detail=f"Play '{body.playId}' not found.")
    if not play.cues:
        raise HTTPException(status_code=400, detail="Play has no cues.")

    channels = storage.load_channels()

    # Clear any active hardware test signals before starting
    from routers.channels import clear_all_test_signals
    clear_all_test_signals(request.app.state.hardware, channels)

    await preview_session.start(play, channels, settings.fps_target, preview_broadcaster)
    return OkResponse()


@router.post("/preview/next", response_model=OkResponse)
async def preview_next() -> OkResponse:
    if not preview_session.is_running:
        raise HTTPException(status_code=409, detail="No preview session is running.")
    preview_session.advance()
    return OkResponse()


@router.post("/preview/stop", response_model=OkResponse)
async def preview_stop() -> OkResponse:
    await preview_session.stop()
    return OkResponse()


@router.websocket("/preview/stream")
async def preview_stream(ws: WebSocket) -> None:
    await ws.accept()
    preview_broadcaster.connect(ws)
    try:
        while True:
            # Server-to-client only; just keep the connection alive
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        preview_broadcaster.disconnect(ws)
