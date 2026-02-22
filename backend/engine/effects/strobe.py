from __future__ import annotations

from engine.effects.utils import hex_to_rgb


def render(
    params: dict,
    elapsed_sec: float,
    pixel_count: int,
) -> list[tuple[int, int, int]]:
    color = hex_to_rgb(params.get("color", "#ffffff"))
    rate = float(params.get("rate", 8.0))
    duty_cycle = float(params.get("dutyCycle", 0.5))
    offset = float(params.get("offsetSec", 0.0))
    adjusted = max(0.0, elapsed_sec - offset)

    period = 1.0 / rate if rate > 0 else 1.0
    phase = (adjusted % period) / period
    pixel = color if phase < duty_cycle else (0, 0, 0)
    return [pixel] * pixel_count
