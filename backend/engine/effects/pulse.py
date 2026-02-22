from __future__ import annotations

import math

from engine.effects.utils import hex_to_rgb, lerp_color


def render(
    params: dict,
    elapsed_sec: float,
    pixel_count: int,
) -> list[tuple[int, int, int]]:
    color = hex_to_rgb(params.get("color", "#ffffff"))
    bg = hex_to_rgb(params.get("backgroundColor", "#000000"))
    speed = float(params.get("speed", 1.0))
    min_intensity = float(params.get("minIntensity", 0.1))
    max_intensity = float(params.get("maxIntensity", 1.0))
    offset = float(params.get("offsetSec", 0.0))
    adjusted = max(0.0, elapsed_sec - offset)

    t = 0.5 - 0.5 * math.cos(adjusted * speed * 2 * math.pi)
    intensity = min_intensity + t * (max_intensity - min_intensity)
    pixel = lerp_color(bg, color, intensity)
    return [pixel] * pixel_count
