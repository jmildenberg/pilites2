from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from models import OkResponse, Play, PlaySummary

router = APIRouter(tags=["plays"])


# ── Overlap validation ─────────────────────────────────────────────────────────


def _ranges_overlap(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    return a_start <= b_end and b_start <= a_end


def validate_play(play: Play, storage) -> None:
    # Build channel lookup to validate channelIds
    channels = {ch.id: ch for ch in storage.load_channels()}

    for region in play.regions:
        if region.channelId not in channels:
            raise HTTPException(
                status_code=400,
                detail=f"Region '{region.name}' references unknown channel '{region.channelId}'.",
            )

    # Check per-cue cross-region range overlaps on the same channel
    region_map = {r.id: r for r in play.regions}
    for cue in play.cues:
        assigned_regions = [
            region_map[rid]
            for rid in cue.effectsByRegion
            if rid in region_map
        ]
        for i, ra in enumerate(assigned_regions):
            for rb in assigned_regions[i + 1 :]:
                if ra.channelId != rb.channelId:
                    continue
                for rng_a in ra.ranges:
                    for rng_b in rb.ranges:
                        if _ranges_overlap(rng_a.start, rng_a.end, rng_b.start, rng_b.end):
                            raise HTTPException(
                                status_code=400,
                                detail=(
                                    f"Cue '{cue.name}': regions '{ra.name}' and '{rb.name}' "
                                    f"have overlapping pixel ranges on channel '{ra.channelId}'."
                                ),
                            )


# ── Routes ─────────────────────────────────────────────────────────────────────


@router.get("/plays", response_model=list[PlaySummary])
def list_plays(request: Request) -> list[PlaySummary]:
    return request.app.state.storage.list_plays()


@router.post("/plays", response_model=OkResponse, status_code=200)
def create_play(play: Play, request: Request) -> OkResponse:
    storage = request.app.state.storage
    validate_play(play, storage)
    storage.save_play(play)
    return OkResponse()


@router.get("/plays/{play_id}", response_model=Play)
def get_play(play_id: str, request: Request) -> Play:
    play = request.app.state.storage.load_play(play_id)
    if play is None:
        raise HTTPException(status_code=404, detail=f"Play '{play_id}' not found.")
    return play


@router.put("/plays/{play_id}", response_model=OkResponse)
def update_play(play_id: str, play: Play, request: Request) -> OkResponse:
    storage = request.app.state.storage
    if storage.load_play(play_id) is None:
        raise HTTPException(status_code=404, detail=f"Play '{play_id}' not found.")
    # Ensure URL id and body id agree
    play = play.model_copy(update={"id": play_id})
    validate_play(play, storage)
    storage.save_play(play)
    return OkResponse()


@router.delete("/plays/{play_id}", response_model=OkResponse)
def delete_play(play_id: str, request: Request) -> OkResponse:
    if not request.app.state.storage.delete_play(play_id):
        raise HTTPException(status_code=404, detail=f"Play '{play_id}' not found.")
    return OkResponse()


# ── Region test ────────────────────────────────────────────────────────────────


@router.post("/plays/{play_id}/regions/{region_id}/test", response_model=OkResponse)
async def test_region(play_id: str, region_id: str, request: Request) -> OkResponse:
    storage = request.app.state.storage
    play = storage.load_play(play_id)
    if play is None:
        raise HTTPException(status_code=404, detail=f"Play '{play_id}' not found.")

    region = next((r for r in play.regions if r.id == region_id), None)
    if region is None:
        raise HTTPException(status_code=404, detail=f"Region '{region_id}' not found.")

    channels = {ch.id: ch for ch in storage.load_channels()}
    ch = channels.get(region.channelId)
    if ch is None:
        raise HTTPException(
            status_code=400,
            detail=f"Region references unknown channel '{region.channelId}'.",
        )

    hardware = request.app.state.hardware
    timeout = request.app.state.settings.hardware_test_timeout_sec

    pixels = [(0, 0, 0)] * ch.ledCount
    for pr in region.ranges:
        for i in range(pr.start, pr.end + 1):
            if i < len(pixels):
                pixels[i] = (255, 255, 255)

    try:
        if hardware:
            hardware.write_channel(ch.gpioPin, ch.ledCount, ch.colorOrder, pixels)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Schedule auto-clear using the channel router's helper
    from routers.channels import _schedule_auto_clear
    _schedule_auto_clear(ch, hardware, timeout)

    return OkResponse()
