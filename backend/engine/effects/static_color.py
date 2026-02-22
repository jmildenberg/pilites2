from __future__ import annotations

import random

from engine.effects.utils import hex_to_rgb, scale_color


def render(
    params: dict,
    elapsed_sec: float,
    pixel_count: int,
    rng: random.Random,
) -> list[tuple[int, int, int]]:
    color = hex_to_rgb(params.get("color", "#ffffff"))
    intensity = float(params.get("intensity", 1.0))
    pixel = scale_color(color, intensity)
    return [pixel] * pixel_count
