from __future__ import annotations

import colorsys
import random

from engine.effects.utils import scale_color


def render(
    params: dict,
    elapsed_sec: float,
    pixel_count: int,
    rng: random.Random,
) -> list[tuple[int, int, int]]:
    speed = float(params.get("speed", 1.0))
    direction = params.get("direction", "forward")
    intensity = float(params.get("intensity", 1.0))
    offset = float(params.get("offsetSec", 0.0))
    adjusted = max(0.0, elapsed_sec - offset)

    scroll = adjusted * speed * 0.1
    pixels = []
    for i in range(pixel_count):
        t = i / max(pixel_count, 1)
        if direction == "reverse":
            hue = (1.0 - t + scroll) % 1.0
        else:
            hue = (t + scroll) % 1.0
        r, g, b = colorsys.hsv_to_rgb(hue, 1.0, 1.0)
        raw = (int(r * 255), int(g * 255), int(b * 255))
        pixels.append(scale_color(raw, intensity))
    return pixels
