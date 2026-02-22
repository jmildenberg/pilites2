from __future__ import annotations

import random

from engine.effects.utils import hex_to_rgb, scale_color


def render(
    params: dict,
    elapsed_sec: float,
    pixel_count: int,
    rng: random.Random,
) -> list[tuple[int, int, int]]:
    from_color = hex_to_rgb(params.get("fromColor", "#ffffff"))
    duration = float(params.get("durationSec", 1.0))
    offset = float(params.get("offsetSec", 0.0))
    adjusted = max(0.0, elapsed_sec - offset)
    t = min(adjusted / duration, 1.0) if duration > 0 else 1.0
    pixel = scale_color(from_color, 1.0 - t)
    return [pixel] * pixel_count
