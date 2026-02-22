from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Request

from models import Channel, OkResponse

router = APIRouter(tags=["channels"])
logger = logging.getLogger(__name__)

# Tracks per-channel hardware test auto-clear timer handles
_test_timers: dict[str, asyncio.TimerHandle] = {}


def clear_all_test_signals(hardware, channels: list[Channel]) -> None:
    """Cancel all test timers and turn off hardware. Called when a session starts."""
    for handle in _test_timers.values():
        handle.cancel()
    _test_timers.clear()
    if hardware:
        hardware.all_off(channels)


def _schedule_auto_clear(channel: Channel, hardware, timeout_sec: int) -> None:
    loop = asyncio.get_running_loop()

    def clear():
        logger.info("Hardware test auto-clear for channel %s", channel.id)
        try:
            if hardware:
                hardware.write_channel(
                    channel.gpioPin,
                    channel.ledCount,
                    channel.colorOrder,
                    [(0, 0, 0)] * channel.ledCount,
                )
        except Exception as e:
            logger.warning("Auto-clear failed: %s", e)
        _test_timers.pop(channel.id, None)

    handle = loop.call_later(timeout_sec, clear)
    if channel.id in _test_timers:
        _test_timers[channel.id].cancel()
    _test_timers[channel.id] = handle


# ── Channels CRUD ──────────────────────────────────────────────────────────────


@router.get("/channels", response_model=list[Channel])
def list_channels(request: Request) -> list[Channel]:
    return request.app.state.storage.load_channels()


@router.post("/channels", response_model=OkResponse)
def upsert_channel(channel: Channel, request: Request) -> OkResponse:
    storage = request.app.state.storage
    channels = storage.load_channels()
    channels = [c for c in channels if c.id != channel.id]
    channels.append(channel)
    storage.save_channels(channels)
    return OkResponse()


# ── Hardware Test ──────────────────────────────────────────────────────────────


def _get_channel(channel_id: str, request: Request) -> Channel:
    channels = request.app.state.storage.load_channels()
    for ch in channels:
        if ch.id == channel_id:
            return ch
    raise HTTPException(status_code=404, detail=f"Channel '{channel_id}' not found.")


@router.post("/channels/{channel_id}/test/white", response_model=OkResponse)
async def test_white(channel_id: str, request: Request) -> OkResponse:
    ch = _get_channel(channel_id, request)
    hardware = request.app.state.hardware
    timeout = request.app.state.settings.hardware_test_timeout_sec
    try:
        if hardware:
            hardware.write_channel(
                ch.gpioPin,
                ch.ledCount,
                ch.colorOrder,
                [(255, 255, 255)] * ch.ledCount,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    _schedule_auto_clear(ch, hardware, timeout)
    return OkResponse()


@router.post("/channels/{channel_id}/test/off", response_model=OkResponse)
async def test_off(channel_id: str, request: Request) -> OkResponse:
    ch = _get_channel(channel_id, request)
    hardware = request.app.state.hardware
    if channel_id in _test_timers:
        _test_timers[channel_id].cancel()
        del _test_timers[channel_id]
    try:
        if hardware:
            hardware.write_channel(
                ch.gpioPin,
                ch.ledCount,
                ch.colorOrder,
                [(0, 0, 0)] * ch.ledCount,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return OkResponse()
