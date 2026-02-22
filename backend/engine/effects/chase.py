from __future__ import annotations

from engine.effects.utils import hex_to_rgb


def render(
    params: dict,
    elapsed_sec: float,
    pixel_count: int,
) -> list[tuple[int, int, int]]:
    color = hex_to_rgb(params.get("color", "#ffffff"))
    bg = hex_to_rgb(params.get("backgroundColor", "#000000"))
    speed = float(params.get("speed", 1.0))
    direction = params.get("direction", "forward")
    offset = float(params.get("offsetSec", 0.0))
    adjusted = max(0.0, elapsed_sec - offset)

    window = max(1, pixel_count // 10)
    travel = adjusted * speed * pixel_count / 4.0
    if direction == "reverse":
        travel = -travel
    head = int(travel) % pixel_count

    pixels = []
    for i in range(pixel_count):
        dist = (i - head) % pixel_count
        pixels.append(color if dist < window else bg)
    return pixels
