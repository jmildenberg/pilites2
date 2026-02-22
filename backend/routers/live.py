from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect

from engine.broadcaster import live_broadcaster
from engine.session import live_session
from models import LiveStatus, OkResponse, StartLiveRequest

router = APIRouter(tags=["live"])


@router.get("/live/status", response_model=LiveStatus)
def get_live_status() -> LiveStatus:
    return live_session.status()


@router.post("/live/start", response_model=OkResponse)
async def start_live(body: StartLiveRequest, request: Request) -> OkResponse:
    if live_session.is_running:
        raise HTTPException(status_code=409, detail="A live session is already running.")

    storage = request.app.state.storage
    settings = request.app.state.settings
    hardware = request.app.state.hardware

    play = storage.load_play(body.playId)
    if play is None:
        raise HTTPException(status_code=404, detail=f"Play '{body.playId}' not found.")
    if not play.cues:
        raise HTTPException(status_code=400, detail="Play has no cues.")

    channels = storage.load_channels()

    # Clear any active hardware test signals
    from routers.channels import clear_all_test_signals
    clear_all_test_signals(hardware, channels)

    await live_session.start(play, channels, settings.fps_target, live_broadcaster, hardware)
    return OkResponse()


@router.post("/live/next", response_model=OkResponse)
async def live_next() -> OkResponse:
    if not live_session.is_running:
        raise HTTPException(status_code=409, detail="No live session is running.")
    await live_session.advance(live_broadcaster)
    return OkResponse()


@router.post("/live/stop", response_model=OkResponse)
async def live_stop(request: Request) -> OkResponse:
    hardware = request.app.state.hardware
    await live_session.stop(live_broadcaster, hardware)
    return OkResponse()


@router.post("/live/blackout", response_model=OkResponse)
async def live_blackout() -> OkResponse:
    if not live_session.is_running:
        raise HTTPException(status_code=409, detail="No live session is running.")
    await live_session.blackout(live_broadcaster)
    return OkResponse()


@router.websocket("/live/stream")
async def live_stream(ws: WebSocket) -> None:
    await ws.accept()
    live_broadcaster.connect(ws)
    # Send current state immediately on connect
    try:
        import json
        status_msg = live_session._status_message()
        await ws.send_text(json.dumps(status_msg))
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        live_broadcaster.disconnect(ws)
