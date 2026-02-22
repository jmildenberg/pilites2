from __future__ import annotations

import math
import random

from engine.effects.utils import hex_to_rgb, lerp_color


def render(
    params: dict,
    elapsed_sec: float,
    pixel_count: int,
    rng: random.Random,
) -> list[tuple[int, int, int]]:
    flash_color = hex_to_rgb(params.get("flashColor", "#ffffff"))
    bg = hex_to_rgb(params.get("backgroundColor", "#000000"))
    intensity = float(params.get("intensity", 1.0))
    strike_rate = float(params.get("strikeRate", 12.0))  # strikes per minute
    decay_sec = float(params.get("decaySec", 0.2))
    offset = float(params.get("offsetSec", 0.0))
    adjusted = max(0.0, elapsed_sec - offset)

    # Determine flash brightness by checking recent time buckets.
    # Each bucket represents one possible strike opportunity (strikeRate per minute).
    strikes_per_sec = strike_rate / 60.0
    current_bucket = int(adjusted * strikes_per_sec)

    brightness = 0.0
    # Look back over the last decay window for any active strikes
    max_lookback = max(1, int(math.ceil(decay_sec * strikes_per_sec)) + 1)
    for bucket in range(max(0, current_bucket - max_lookback), current_bucket + 1):
        bucket_rng = random.Random(hash(str(id(params)) + str(bucket)))
        if bucket_rng.random() < (strikes_per_sec / 30.0):  # probability per bucket
            bucket_start = bucket / strikes_per_sec
            age = adjusted - bucket_start
            if 0 <= age <= decay_sec:
                flash_brightness = intensity * math.exp(-age / (decay_sec * 0.4))
                brightness = max(brightness, flash_brightness)

    pixel = lerp_color(bg, flash_color, brightness)
    return [pixel] * pixel_count
