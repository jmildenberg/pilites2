from __future__ import annotations

import asyncio
import logging
import random
import time

from models import Channel, Effect, Play
from engine.effects import render_effect
from engine.effects.utils import rgb_to_hex

logger = logging.getLogger(__name__)


def _build_frame(
    play: Play,
    channels: list[Channel],
    cue_index: int,
    elapsed_sec: float,
    rngs: dict[str, random.Random],
) -> dict:
    # Initialize all-black channel buffers
    buffers: dict[str, list[tuple[int, int, int]]] = {
        ch.id: [(0, 0, 0)] * ch.ledCount for ch in channels
    }

    cue = play.cues[cue_index]
    region_map = {r.id: r for r in play.regions}

    for region_id, effect in cue.effectsByRegion.items():
        region = region_map.get(region_id)
        if region is None:
            continue
        buf = buffers.get(region.channelId)
        if buf is None:
            continue

        pixel_count = sum(r.end - r.start + 1 for r in region.ranges)
        rng = rngs.get(effect.id, random.Random(effect.id))
        pixels = render_effect(effect, elapsed_sec, pixel_count, rng)

        # Write pixels into buffer at the region's ranges
        px_idx = 0
        for pr in region.ranges:
            for buf_idx in range(pr.start, pr.end + 1):
                if px_idx < len(pixels):
                    buf[buf_idx] = pixels[px_idx]
                px_idx += 1

    return {
        "type": "frame",
        "timestamp": time.time(),
        "channels": {
            ch_id: [rgb_to_hex(p) for p in buf]
            for ch_id, buf in buffers.items()
        },
    }


def _init_rngs(play: Play, cue_index: int) -> dict[str, random.Random]:
    cue = play.cues[cue_index]
    return {
        effect.id: random.Random(effect.id)
        for effect in cue.effectsByRegion.values()
    }


# ── Preview Session ────────────────────────────────────────────────────────────


class PreviewSession:
    def __init__(self) -> None:
        self.is_running: bool = False
        self.play_id: str | None = None
        self.cue_index: int = 0
        self._task: asyncio.Task | None = None
        self._rngs: dict[str, random.Random] = {}
        self._cue_start: float = 0.0

    def status(self):
        from models import PreviewStatus
        return PreviewStatus(is_running=self.is_running, playId=self.play_id)

    def advance(self) -> None:
        self.cue_index += 1
        self._cue_start = time.monotonic()
        if hasattr(self, "_play") and self._play:
            self._rngs = _init_rngs(self._play, self.cue_index)

    async def start(self, play: Play, channels: list[Channel], fps: int, broadcaster) -> None:
        await self.stop()
        self.is_running = True
        self.play_id = play.id
        self.cue_index = 0
        self._play = play
        self._cue_start = time.monotonic()
        self._rngs = _init_rngs(play, 0)
        self._task = asyncio.create_task(
            self._run(play, channels, fps, broadcaster)
        )

    async def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.is_running = False
        self._task = None

    async def _run(self, play: Play, channels: list[Channel], fps: int, broadcaster) -> None:
        frame_interval = 1.0 / fps
        try:
            while self.is_running:
                t0 = time.monotonic()
                elapsed = t0 - self._cue_start
                frame = _build_frame(play, channels, self.cue_index, elapsed, self._rngs)
                await broadcaster.broadcast(frame)
                spent = time.monotonic() - t0
                await asyncio.sleep(max(0.0, frame_interval - spent))
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.exception("Preview frame loop error: %s", e)
            await broadcaster.broadcast({"type": "error", "message": str(e)})
        finally:
            self.is_running = False
            await broadcaster.broadcast({"type": "done"})


# ── Live Session ───────────────────────────────────────────────────────────────


class LiveSession:
    def __init__(self) -> None:
        self.is_running: bool = False
        self.play_id: str | None = None
        self.cue_index: int = 0
        self.is_blackout: bool = False
        self._task: asyncio.Task | None = None
        self._rngs: dict[str, random.Random] = {}
        self._cue_start: float = 0.0
        self._play: Play | None = None
        self._channels: list[Channel] = []

    def status(self):
        from models import LiveStatus

        if not self.is_running or self._play is None:
            return LiveStatus(
                isRunning=False,
                playId=None,
                cueId=None,
                cueName=None,
                cueIndex=None,
                isBlackout=False,
            )
        cue = self._play.cues[self.cue_index]
        return LiveStatus(
            isRunning=True,
            playId=self.play_id,
            cueId=cue.id,
            cueName=cue.name,
            cueIndex=self.cue_index,
            isBlackout=self.is_blackout,
        )

    def _status_message(self) -> dict:
        s = self.status()
        return {
            "type": "status",
            "playId": s.playId,
            "cueId": s.cueId,
            "cueName": s.cueName,
            "cueIndex": s.cueIndex,
            "isRunning": s.isRunning,
            "isBlackout": s.isBlackout,
        }

    async def start(
        self,
        play: Play,
        channels: list[Channel],
        fps: int,
        broadcaster,
        hardware,
    ) -> None:
        self.is_running = True
        self.play_id = play.id
        self.cue_index = 0
        self.is_blackout = False
        self._play = play
        self._channels = channels
        self._cue_start = time.monotonic()
        self._rngs = _init_rngs(play, 0)
        await broadcaster.broadcast(self._status_message())
        self._task = asyncio.create_task(
            self._run(play, channels, fps, broadcaster, hardware)
        )

    async def stop(self, broadcaster, hardware) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.is_running = False
        self._task = None
        if hardware and self._channels:
            hardware.all_off(self._channels)
        await broadcaster.broadcast(self._status_message())

    async def advance(self, broadcaster) -> None:
        if not self.is_running or self._play is None:
            return
        if self.cue_index >= len(self._play.cues) - 1:
            return
        self.cue_index += 1
        self.is_blackout = False
        self._cue_start = time.monotonic()
        self._rngs = _init_rngs(self._play, self.cue_index)
        await broadcaster.broadcast(self._status_message())

    async def blackout(self, broadcaster) -> None:
        self.is_blackout = True
        await broadcaster.broadcast(self._status_message())

    async def _run(
        self, play: Play, channels: list[Channel], fps: int, broadcaster, hardware
    ) -> None:
        frame_interval = 1.0 / fps
        black_frame_channels = {ch.id: ["#000000"] * ch.ledCount for ch in channels}

        try:
            while self.is_running:
                t0 = time.monotonic()
                elapsed = t0 - self._cue_start

                if self.is_blackout:
                    frame = {
                        "type": "frame",
                        "timestamp": time.time(),
                        "channels": black_frame_channels,
                    }
                    await broadcaster.broadcast(frame)
                    if hardware:
                        hardware.all_off(channels)
                else:
                    frame = _build_frame(play, channels, self.cue_index, elapsed, self._rngs)
                    await broadcaster.broadcast(frame)
                    if hardware:
                        for ch in channels:
                            buf_hex = frame["channels"].get(ch.id, [])
                            # Convert hex back to RGB for hardware write
                            pixels = [
                                (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))
                                for h in buf_hex
                            ]
                            hardware.write_channel(ch.gpioPin, ch.ledCount, ch.colorOrder, pixels)

                spent = time.monotonic() - t0
                await asyncio.sleep(max(0.0, frame_interval - spent))

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.exception("Live frame loop error: %s", e)
            await broadcaster.broadcast({"type": "error", "message": str(e)})
        finally:
            self.is_running = False


# Module-level singletons
preview_session = PreviewSession()
live_session = LiveSession()
