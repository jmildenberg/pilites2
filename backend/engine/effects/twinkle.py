from __future__ import annotations

import random

from engine.effects.utils import hex_to_rgb, lerp_color


def render(
    params: dict,
    elapsed_sec: float,
    pixel_count: int,
    rng: random.Random,
) -> list[tuple[int, int, int]]:
    color = hex_to_rgb(params.get("color", "#ffffff"))
    bg = hex_to_rgb(params.get("backgroundColor", "#000000"))
    density = float(params.get("density", 0.3))
    speed = float(params.get("speed", 1.0))
    offset = float(params.get("offsetSec", 0.0))
    adjusted = max(0.0, elapsed_sec - offset)

    time_slot = int(adjusted * speed * 4)
    pixels = []
    for i in range(pixel_count):
        slot_rng = random.Random(hash((i, time_slot)))
        if slot_rng.random() < density:
            brightness = slot_rng.random()
            pixels.append(lerp_color(bg, color, brightness))
        else:
            pixels.append(bg)
    return pixels
