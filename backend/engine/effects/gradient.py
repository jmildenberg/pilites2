from __future__ import annotations

from engine.effects.utils import hex_to_rgb, lerp_color


def render(
    params: dict,
    elapsed_sec: float,
    pixel_count: int,
) -> list[tuple[int, int, int]]:
    start_color = hex_to_rgb(params.get("startColor", "#ffffff"))
    end_color = hex_to_rgb(params.get("endColor", "#000000"))
    direction = params.get("direction", "forward")

    pixels = []
    for i in range(pixel_count):
        t = i / max(pixel_count - 1, 1)
        if direction == "reverse":
            t = 1.0 - t
        pixels.append(lerp_color(start_color, end_color, t))
    return pixels
