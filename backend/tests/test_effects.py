from __future__ import annotations

import random

import pytest

from engine.effects.chase import render as chase
from engine.effects.color_wash import render as color_wash
from engine.effects.fade_in import render as fade_in
from engine.effects.fade_out import render as fade_out
from engine.effects.gradient import render as gradient
from engine.effects.lightning import render as lightning
from engine.effects.pulse import render as pulse
from engine.effects.rainbow import render as rainbow
from engine.effects.static_color import render as static_color
from engine.effects.strobe import render as strobe
from engine.effects.twinkle import render as twinkle


def rng() -> random.Random:
    return random.Random(42)


PIXEL_COUNT = 50


def assert_valid_output(pixels: list, expected_count: int = PIXEL_COUNT) -> None:
    assert len(pixels) == expected_count, f"Expected {expected_count} pixels, got {len(pixels)}"
    for p in pixels:
        assert len(p) == 3, f"Pixel must be RGB tuple: {p}"
        for ch in p:
            assert 0 <= ch <= 255, f"Channel value out of range: {ch}"


class TestFadeIn:
    def test_at_zero_is_black(self) -> None:
        pixels = fade_in({"color": "#ffffff", "durationSec": 1.0}, 0.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)
        assert all(p == (0, 0, 0) for p in pixels)

    def test_at_full_duration_is_full_color(self) -> None:
        pixels = fade_in({"color": "#ffffff", "durationSec": 1.0}, 1.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)
        assert all(p == (255, 255, 255) for p in pixels)

    def test_past_duration_holds(self) -> None:
        p1 = fade_in({"color": "#ff0000", "durationSec": 1.0}, 1.0, PIXEL_COUNT, rng())
        p2 = fade_in({"color": "#ff0000", "durationSec": 1.0}, 5.0, PIXEL_COUNT, rng())
        assert p1 == p2

    def test_offset_delays_start(self) -> None:
        pixels = fade_in(
            {"color": "#ffffff", "durationSec": 1.0, "offsetSec": 2.0}, 1.0, PIXEL_COUNT, rng()
        )
        assert all(p == (0, 0, 0) for p in pixels)


class TestFadeOut:
    def test_at_zero_is_full_color(self) -> None:
        pixels = fade_out({"fromColor": "#ffffff", "durationSec": 1.0}, 0.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)
        assert all(p == (255, 255, 255) for p in pixels)

    def test_at_full_duration_is_black(self) -> None:
        pixels = fade_out({"fromColor": "#ffffff", "durationSec": 1.0}, 1.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)
        assert all(p == (0, 0, 0) for p in pixels)

    def test_past_duration_holds_black(self) -> None:
        p1 = fade_out({"fromColor": "#ffffff", "durationSec": 1.0}, 1.0, PIXEL_COUNT, rng())
        p2 = fade_out({"fromColor": "#ffffff", "durationSec": 1.0}, 99.0, PIXEL_COUNT, rng())
        assert p1 == p2


class TestStaticColor:
    def test_all_pixels_same_color(self) -> None:
        pixels = static_color({"color": "#ff0000", "intensity": 1.0}, 0.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)
        assert all(p == (255, 0, 0) for p in pixels)

    def test_intensity_scales_color(self) -> None:
        pixels = static_color({"color": "#ffffff", "intensity": 0.5}, 0.0, PIXEL_COUNT, rng())
        assert all(p[0] == 127 for p in pixels)

    def test_zero_intensity_is_black(self) -> None:
        pixels = static_color({"color": "#ffffff", "intensity": 0.0}, 0.0, PIXEL_COUNT, rng())
        assert all(p == (0, 0, 0) for p in pixels)


class TestColorWash:
    def test_output_length(self) -> None:
        pixels = color_wash({"color": "#ffffff"}, 1.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)

    def test_varies_over_time(self) -> None:
        p1 = color_wash({"color": "#ffffff", "speed": 1.0}, 0.0, PIXEL_COUNT, rng())
        p2 = color_wash({"color": "#ffffff", "speed": 1.0}, 0.25, PIXEL_COUNT, rng())
        assert p1 != p2  # should differ as intensity oscillates


class TestGradient:
    def test_start_pixel_is_start_color(self) -> None:
        pixels = gradient(
            {"startColor": "#ff0000", "endColor": "#0000ff"}, 0.0, PIXEL_COUNT, rng()
        )
        assert_valid_output(pixels)
        assert pixels[0] == (255, 0, 0)

    def test_end_pixel_is_end_color(self) -> None:
        pixels = gradient(
            {"startColor": "#ff0000", "endColor": "#0000ff"}, 0.0, PIXEL_COUNT, rng()
        )
        assert pixels[-1] == (0, 0, 255)

    def test_reverse_flips_order(self) -> None:
        fwd = gradient(
            {"startColor": "#ff0000", "endColor": "#0000ff", "direction": "forward"},
            0.0, PIXEL_COUNT, rng(),
        )
        rev = gradient(
            {"startColor": "#ff0000", "endColor": "#0000ff", "direction": "reverse"},
            0.0, PIXEL_COUNT, rng(),
        )
        assert fwd[0] == rev[-1]


class TestStrobe:
    def test_on_during_duty(self) -> None:
        pixels = strobe({"color": "#ffffff", "rate": 1.0, "dutyCycle": 1.0}, 0.5, PIXEL_COUNT, rng())
        assert all(p == (255, 255, 255) for p in pixels)

    def test_off_outside_duty(self) -> None:
        pixels = strobe({"color": "#ffffff", "rate": 1.0, "dutyCycle": 0.0}, 0.5, PIXEL_COUNT, rng())
        assert all(p == (0, 0, 0) for p in pixels)

    def test_output_length(self) -> None:
        pixels = strobe({}, 0.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)


class TestRainbow:
    def test_output_length(self) -> None:
        pixels = rainbow({}, 0.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)

    def test_pixels_vary_across_strip(self) -> None:
        pixels = rainbow({"intensity": 1.0}, 0.0, PIXEL_COUNT, rng())
        assert len(set(pixels)) > 1  # multiple distinct colors


class TestChase:
    def test_output_length(self) -> None:
        pixels = chase({}, 0.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)

    def test_window_moves_over_time(self) -> None:
        p1 = chase({"speed": 1.0}, 0.0, PIXEL_COUNT, rng())
        p2 = chase({"speed": 1.0}, 0.5, PIXEL_COUNT, rng())
        assert p1 != p2


class TestPulse:
    def test_output_length(self) -> None:
        pixels = pulse({}, 0.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)

    def test_all_same_color(self) -> None:
        pixels = pulse({"color": "#ff0000"}, 0.0, PIXEL_COUNT, rng())
        assert len(set(pixels)) == 1


class TestLightning:
    def test_output_length(self) -> None:
        pixels = lightning({}, 0.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)

    def test_deterministic(self) -> None:
        params = {"flashColor": "#ffffff", "strikeRate": 60.0}
        p1 = lightning(params, 1.5, PIXEL_COUNT, rng())
        p2 = lightning(params, 1.5, PIXEL_COUNT, rng())
        assert p1 == p2


class TestTwinkle:
    def test_output_length(self) -> None:
        pixels = twinkle({}, 0.0, PIXEL_COUNT, rng())
        assert_valid_output(pixels)

    def test_varies_across_pixels(self) -> None:
        pixels = twinkle({"density": 0.5}, 0.0, PIXEL_COUNT, rng())
        assert len(set(pixels)) > 1

    def test_deterministic(self) -> None:
        params = {"density": 0.3, "speed": 1.0}
        p1 = twinkle(params, 1.0, PIXEL_COUNT, rng())
        p2 = twinkle(params, 1.0, PIXEL_COUNT, rng())
        assert p1 == p2
