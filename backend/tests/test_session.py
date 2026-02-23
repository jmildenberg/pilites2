"""Tests for engine.session._resolve_effect and _build_frame (tracking inheritance)."""
from __future__ import annotations

import pytest

from engine.session import _build_frame, _resolve_effect
from models import Channel, Cue, Effect, Play, PixelRange, Region


# ── Shared fixtures ────────────────────────────────────────────────────────────


@pytest.fixture
def channel() -> Channel:
    return Channel(
        id="ch-1",
        name="Test Strand",
        gpioPin=18,
        ledCount=100,
        ledType="ws281x",
        colorOrder="RGB",
    )


@pytest.fixture
def play_with_tracking() -> Play:
    """
    Two regions on ch-1:
      r-1: pixels 0–49
      r-2: pixels 50–99

    Three cues:
      cue-0: r-1 → static_color red,   r-2 → static_color blue   (both owned)
      cue-1: r-1 → tracking,           r-2 → static_color green   (r-1 inherits red)
      cue-2: r-1 → tracking,           r-2 → tracking              (r-1→red, r-2→green via chain)
    """
    return Play(
        id="play-1",
        name="Test Play",
        regions=[
            Region(
                id="r-1",
                name="Left",
                channelId="ch-1",
                ranges=[PixelRange(start=0, end=49)],
            ),
            Region(
                id="r-2",
                name="Right",
                channelId="ch-1",
                ranges=[PixelRange(start=50, end=99)],
            ),
        ],
        cues=[
            Cue(
                id="cue-0",
                name="Cue 0",
                effectsByRegion={
                    "r-1": Effect(
                        id="e-1",
                        type="static_color",
                        params={"color": "#ff0000", "intensity": 1.0},
                    ),
                    "r-2": Effect(
                        id="e-2",
                        type="static_color",
                        params={"color": "#0000ff", "intensity": 1.0},
                    ),
                },
                trackingRegions=[],
            ),
            Cue(
                id="cue-1",
                name="Cue 1",
                effectsByRegion={
                    "r-2": Effect(
                        id="e-3",
                        type="static_color",
                        params={"color": "#00ff00", "intensity": 1.0},
                    ),
                },
                trackingRegions=["r-1"],
            ),
            Cue(
                id="cue-2",
                name="Cue 2",
                effectsByRegion={},
                trackingRegions=["r-1", "r-2"],
            ),
        ],
    )


# ── _resolve_effect ────────────────────────────────────────────────────────────


class TestResolveEffect:
    def test_returns_own_effect_when_not_tracking(self, play_with_tracking: Play) -> None:
        """Cue 0 owns r-1; resolve should return it directly."""
        effect = _resolve_effect(play_with_tracking, 0, "r-1")
        assert effect is not None
        assert effect.type == "static_color"
        assert effect.params["color"] == "#ff0000"

    def test_walks_back_one_cue(self, play_with_tracking: Play) -> None:
        """Cue 1 tracks r-1; cue 0 owns it (red)."""
        effect = _resolve_effect(play_with_tracking, 1, "r-1")
        assert effect is not None
        assert effect.params["color"] == "#ff0000"

    def test_walks_back_through_chain(self, play_with_tracking: Play) -> None:
        """Cue 2 tracks r-1; cue 1 also tracks r-1; cue 0 owns it (red)."""
        effect = _resolve_effect(play_with_tracking, 2, "r-1")
        assert effect is not None
        assert effect.params["color"] == "#ff0000"

    def test_resolves_to_nearest_owner_not_oldest(self, play_with_tracking: Play) -> None:
        """Cue 2 tracks r-2; cue 1 owns r-2 (green), not cue 0 (blue)."""
        effect = _resolve_effect(play_with_tracking, 2, "r-2")
        assert effect is not None
        assert effect.params["color"] == "#00ff00"

    def test_returns_none_for_unknown_region(self, play_with_tracking: Play) -> None:
        effect = _resolve_effect(play_with_tracking, 0, "r-unknown")
        assert effect is None

    def test_returns_none_when_no_owner_exists_in_chain(self) -> None:
        """All cues track r-1; no owner anywhere → None."""
        play = Play(
            id="p",
            name="P",
            regions=[
                Region(
                    id="r-1",
                    name="R",
                    channelId="ch-1",
                    ranges=[PixelRange(start=0, end=9)],
                )
            ],
            cues=[
                Cue(id="c-0", name="C0", effectsByRegion={}, trackingRegions=["r-1"]),
                Cue(id="c-1", name="C1", effectsByRegion={}, trackingRegions=["r-1"]),
            ],
        )
        effect = _resolve_effect(play, 1, "r-1")
        assert effect is None

    def test_from_cue_index_zero_with_no_effect(self, play_with_tracking: Play) -> None:
        """Resolve from cue 0 for a region not in any effect → None."""
        effect = _resolve_effect(play_with_tracking, 0, "r-2")
        assert effect is not None  # r-2 IS owned in cue-0 (blue)
        assert effect.params["color"] == "#0000ff"


# ── _build_frame ──────────────────────────────────────────────────────────────


class TestBuildFrame:
    def test_frame_has_required_keys(self, play_with_tracking: Play, channel: Channel) -> None:
        frame = _build_frame(play_with_tracking, [channel], 0, 0.0)
        assert frame["type"] == "frame"
        assert "timestamp" in frame
        assert isinstance(frame["timestamp"], float)
        assert "channels" in frame

    def test_channel_pixel_count_matches_led_count(
        self, play_with_tracking: Play, channel: Channel
    ) -> None:
        frame = _build_frame(play_with_tracking, [channel], 0, 0.0)
        assert len(frame["channels"]["ch-1"]) == 100

    def test_pixels_are_hex_strings(self, play_with_tracking: Play, channel: Channel) -> None:
        frame = _build_frame(play_with_tracking, [channel], 0, 0.0)
        for px in frame["channels"]["ch-1"]:
            assert isinstance(px, str)
            assert px.startswith("#")
            assert len(px) == 7

    def test_owned_effects_render_correct_colors(
        self, play_with_tracking: Play, channel: Channel
    ) -> None:
        """Cue 0: r-1 red, r-2 blue."""
        frame = _build_frame(play_with_tracking, [channel], 0, 0.0)
        pixels = frame["channels"]["ch-1"]
        assert pixels[0] == "#ff0000"
        assert pixels[49] == "#ff0000"
        assert pixels[50] == "#0000ff"
        assert pixels[99] == "#0000ff"

    def test_tracking_inherits_one_hop(
        self, play_with_tracking: Play, channel: Channel
    ) -> None:
        """Cue 1: r-1 tracks (→ red), r-2 owned (green)."""
        frame = _build_frame(play_with_tracking, [channel], 1, 0.0)
        pixels = frame["channels"]["ch-1"]
        assert pixels[0] == "#ff0000"   # r-1 inherited red
        assert pixels[49] == "#ff0000"
        assert pixels[50] == "#00ff00"  # r-2 owned green
        assert pixels[99] == "#00ff00"

    def test_tracking_chain_two_hops(
        self, play_with_tracking: Play, channel: Channel
    ) -> None:
        """Cue 2: r-1 tracks→cue1 tracks→cue0 (red); r-2 tracks→cue1 (green)."""
        frame = _build_frame(play_with_tracking, [channel], 2, 0.0)
        pixels = frame["channels"]["ch-1"]
        assert pixels[0] == "#ff0000"   # r-1: two hops back to red
        assert pixels[50] == "#00ff00"  # r-2: one hop back to green

    def test_tracking_on_first_cue_renders_black(self, channel: Channel) -> None:
        """Tracking on cue 0 (nothing before it) → pixels stay black."""
        play = Play(
            id="p",
            name="P",
            regions=[
                Region(
                    id="r-1",
                    name="R",
                    channelId="ch-1",
                    ranges=[PixelRange(start=0, end=9)],
                )
            ],
            cues=[
                Cue(id="c-0", name="C0", effectsByRegion={}, trackingRegions=["r-1"]),
            ],
        )
        frame = _build_frame(play, [channel], 0, 0.0)
        pixels = frame["channels"]["ch-1"]
        assert pixels[0] == "#000000"
        assert pixels[9] == "#000000"

    def test_unassigned_pixels_remain_black(self, channel: Channel) -> None:
        """Pixels outside any region range stay black."""
        play = Play(
            id="p",
            name="P",
            regions=[
                Region(
                    id="r-1",
                    name="R",
                    channelId="ch-1",
                    ranges=[PixelRange(start=10, end=19)],
                )
            ],
            cues=[
                Cue(
                    id="c-0",
                    name="C0",
                    effectsByRegion={
                        "r-1": Effect(
                            id="e-1",
                            type="static_color",
                            params={"color": "#ffffff", "intensity": 1.0},
                        )
                    },
                )
            ],
        )
        frame = _build_frame(play, [channel], 0, 0.0)
        pixels = frame["channels"]["ch-1"]
        assert pixels[0] == "#000000"   # before region
        assert pixels[9] == "#000000"
        assert pixels[10] == "#ffffff"  # inside region
        assert pixels[19] == "#ffffff"
        assert pixels[20] == "#000000"  # after region

    def test_chain_resolves_none_when_all_tracking(self, channel: Channel) -> None:
        """All cues track a region that has never been owned → stays black."""
        play = Play(
            id="p",
            name="P",
            regions=[
                Region(
                    id="r-1",
                    name="R",
                    channelId="ch-1",
                    ranges=[PixelRange(start=0, end=9)],
                )
            ],
            cues=[
                Cue(id="c-0", name="C0", effectsByRegion={}, trackingRegions=["r-1"]),
                Cue(id="c-1", name="C1", effectsByRegion={}, trackingRegions=["r-1"]),
            ],
        )
        frame = _build_frame(play, [channel], 1, 0.0)
        pixels = frame["channels"]["ch-1"]
        assert pixels[0] == "#000000"

    def test_unknown_region_id_in_cue_is_skipped(self, channel: Channel) -> None:
        """An effect for a non-existent region ID doesn't crash or corrupt the frame."""
        play = Play(
            id="p",
            name="P",
            regions=[
                Region(
                    id="r-1",
                    name="R",
                    channelId="ch-1",
                    ranges=[PixelRange(start=0, end=9)],
                )
            ],
            cues=[
                Cue(
                    id="c-0",
                    name="C0",
                    effectsByRegion={
                        "r-ghost": Effect(
                            id="e-x",
                            type="static_color",
                            params={"color": "#ff0000", "intensity": 1.0},
                        ),
                        "r-1": Effect(
                            id="e-1",
                            type="static_color",
                            params={"color": "#00ff00", "intensity": 1.0},
                        ),
                    },
                )
            ],
        )
        frame = _build_frame(play, [channel], 0, 0.0)
        pixels = frame["channels"]["ch-1"]
        assert pixels[0] == "#00ff00"  # r-1 rendered
        assert pixels[10] == "#000000"  # gap after r-1

    def test_multi_range_region_fills_both_ranges(self, channel: Channel) -> None:
        """A region with multiple pixel ranges fills each range."""
        play = Play(
            id="p",
            name="P",
            regions=[
                Region(
                    id="r-1",
                    name="Scattered",
                    channelId="ch-1",
                    ranges=[
                        PixelRange(start=0, end=4),
                        PixelRange(start=20, end=24),
                    ],
                )
            ],
            cues=[
                Cue(
                    id="c-0",
                    name="C0",
                    effectsByRegion={
                        "r-1": Effect(
                            id="e-1",
                            type="static_color",
                            params={"color": "#ffffff", "intensity": 1.0},
                        )
                    },
                )
            ],
        )
        frame = _build_frame(play, [channel], 0, 0.0)
        pixels = frame["channels"]["ch-1"]
        assert all(pixels[i] == "#ffffff" for i in range(0, 5))
        assert all(pixels[i] == "#000000" for i in range(5, 20))
        assert all(pixels[i] == "#ffffff" for i in range(20, 25))
