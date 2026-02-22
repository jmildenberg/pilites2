from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from config import Settings
from engine.hardware import MockHardware
from models import Channel, Cue, Effect, Play, PixelRange, Region
from storage import Storage


@pytest.fixture
def tmp_storage(tmp_path: Path) -> Storage:
    s = Storage(tmp_path)
    s.create_dirs()
    return s


@pytest.fixture
def sample_channel() -> Channel:
    return Channel(
        id="ch-1",
        name="Main Strand",
        gpioPin=18,
        ledCount=100,
        ledType="ws281x",
        colorOrder="RGB",
    )


@pytest.fixture
def sample_play() -> Play:
    return Play(
        id="play-1",
        name="Test Play",
        regions=[
            Region(
                id="r-1",
                name="Stage Left",
                channelId="ch-1",
                ranges=[PixelRange(start=0, end=49)],
            ),
            Region(
                id="r-2",
                name="Stage Right",
                channelId="ch-1",
                ranges=[PixelRange(start=50, end=99)],
            ),
        ],
        cues=[
            Cue(
                id="cue-1",
                name="Intro",
                effectsByRegion={
                    "r-1": Effect(
                        id="e-1", type="static_color", params={"color": "#ff0000"}
                    ),
                    "r-2": Effect(
                        id="e-2", type="fade_in", params={"color": "#0000ff", "durationSec": 2.0}
                    ),
                },
            ),
            Cue(id="cue-2", name="Outro", effectsByRegion={}),
        ],
    )


@pytest.fixture
def client(tmp_path: Path, sample_channel: Channel, sample_play: Play) -> TestClient:
    from main import app

    storage = Storage(tmp_path)
    storage.create_dirs()
    storage.save_channels([sample_channel])
    storage.save_play(sample_play)

    settings = Settings(
        data_dir=tmp_path,
        mock_hardware=True,
        fps_target=30,
        hardware_test_timeout_sec=30,
    )

    app.state.storage = storage
    app.state.settings = settings
    app.state.hardware = MockHardware()

    return TestClient(app, raise_server_exceptions=True)
