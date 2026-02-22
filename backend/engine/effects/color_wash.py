from __future__ import annotations

import math

from engine.effects.utils import hex_to_rgb, scale_color


def render(
    params: dict,
    elapsed_sec: float,
    pixel_count: int,
) -> list[tuple[int, int, int]]:
    color = hex_to_rgb(params.get("color", "#ffffff"))
    intensity = float(params.get("intensity", 1.0))
    speed = float(params.get("speed", 1.0))
    mod = 0.85 + 0.15 * math.sin(elapsed_sec * speed * 2 * math.pi)
    pixel = scale_color(color, intensity * mod)
    return [pixel] * pixel_count
