from __future__ import annotations

import random
from typing import Callable

from models import Effect

# Each effect module exposes a `render` function with signature:
#   render(params, elapsed_sec, pixel_count, rng) -> list[tuple[int,int,int]]

from engine.effects import (
    chase,
    color_wash,
    fade_in,
    fade_out,
    gradient,
    lightning,
    pulse,
    rainbow,
    static_color,
    strobe,
    twinkle,
)

EFFECT_REGISTRY: dict[str, Callable] = {
    "chase": chase.render,
    "color_wash": color_wash.render,
    "fade_in": fade_in.render,
    "fade_out": fade_out.render,
    "gradient": gradient.render,
    "lightning": lightning.render,
    "pulse": pulse.render,
    "rainbow": rainbow.render,
    "static_color": static_color.render,
    "strobe": strobe.render,
    "twinkle": twinkle.render,
}


def render_effect(
    effect: Effect,
    elapsed_sec: float,
    pixel_count: int,
    rng: random.Random,
) -> list[tuple[int, int, int]]:
    fn = EFFECT_REGISTRY.get(effect.type)
    if fn is None:
        return [(0, 0, 0)] * pixel_count
    return fn(effect.params, elapsed_sec, pixel_count, rng)
