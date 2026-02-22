import pytest
from pydantic import ValidationError

from models import Channel, Cue, Effect, PixelRange, Play, Region


class TestPixelRange:
    def test_valid_range(self) -> None:
        r = PixelRange(start=0, end=99)
        assert r.start == 0
        assert r.end == 99

    def test_start_equals_end(self) -> None:
        r = PixelRange(start=5, end=5)
        assert r.start == 5

    def test_end_less_than_start_raises(self) -> None:
        with pytest.raises(ValidationError):
            PixelRange(start=10, end=5)

    def test_negative_start_raises(self) -> None:
        with pytest.raises(ValidationError):
            PixelRange(start=-1, end=5)


class TestChannel:
    def test_valid_channel(self) -> None:
        ch = Channel(
            id="ch-1", name="Test", gpioPin=18, ledCount=100, ledType="ws281x", colorOrder="RGB"
        )
        assert ch.id == "ch-1"

    def test_invalid_color_order_raises(self) -> None:
        with pytest.raises(ValidationError):
            Channel(
                id="c", name="T", gpioPin=18, ledCount=10, ledType="ws281x", colorOrder="BGR"
            )

    def test_invalid_gpio_pin_raises(self) -> None:
        with pytest.raises(ValidationError):
            Channel(
                id="c", name="T", gpioPin=17, ledCount=10, ledType="ws281x", colorOrder="RGB"
            )

    def test_zero_led_count_raises(self) -> None:
        with pytest.raises(ValidationError):
            Channel(
                id="c", name="T", gpioPin=18, ledCount=0, ledType="ws281x", colorOrder="RGB"
            )

    def test_valid_gpio_pins(self) -> None:
        for pin in (12, 13, 18, 19):
            ch = Channel(
                id="c", name="T", gpioPin=pin, ledCount=10, ledType="ws281x", colorOrder="RGB"
            )
            assert ch.gpioPin == pin

    def test_valid_color_orders(self) -> None:
        for order in ("RGB", "GRB", "RGBW", "GRBW"):
            ch = Channel(
                id="c", name="T", gpioPin=18, ledCount=10, ledType="ws281x", colorOrder=order
            )
            assert ch.colorOrder == order


class TestRegion:
    def test_overlapping_ranges_raises(self) -> None:
        with pytest.raises(ValidationError):
            Region(
                id="r",
                name="R",
                channelId="ch-1",
                ranges=[PixelRange(start=0, end=50), PixelRange(start=40, end=99)],
            )

    def test_adjacent_ranges_ok(self) -> None:
        r = Region(
            id="r",
            name="R",
            channelId="ch-1",
            ranges=[PixelRange(start=0, end=49), PixelRange(start=50, end=99)],
        )
        assert len(r.ranges) == 2

    def test_single_range_ok(self) -> None:
        r = Region(
            id="r", name="R", channelId="ch-1", ranges=[PixelRange(start=0, end=9)]
        )
        assert len(r.ranges) == 1


class TestPlay:
    def test_empty_play(self) -> None:
        p = Play(id="p", name="Play")
        assert p.regions == []
        assert p.cues == []

    def test_play_with_content(self, sample_play: Play) -> None:
        assert len(sample_play.regions) == 2
        assert len(sample_play.cues) == 1


@pytest.fixture
def sample_play() -> Play:
    return Play(
        id="play-1",
        name="Test",
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
                id="c-1",
                name="Intro",
                effectsByRegion={
                    "r-1": Effect(id="e-1", type="static_color", params={"color": "#ff0000"})
                },
            )
        ],
    )
