# Rendering Engine Design

## Overview

The rendering engine is the core of the PiLites backend. It drives a frame loop that computes pixel colors for each active cue and distributes the output to WebSocket clients and (in live mode) the physical hardware.

## Frame Loop

The frame loop runs as a background task at the configured FPS target. On each tick:

1. Compute `elapsed_sec` — seconds since the current cue started.
2. Initialize channel buffers: one array of black pixels per channel, sized to `ledCount`.
3. For each region with an effect in the current cue:
   - Resolve the region's pixel indices from its `channelId` and `ranges`.
   - Call the effect's render function with `elapsed_sec` and the pixel count.
   - Write the returned colors into the channel buffer at the region's pixel positions.
4. Broadcast the channel buffers as a `frame` WebSocket message.
5. In live mode, write the channel buffers to the hardware.

Regions not assigned an effect in the current cue remain black.

## Effect Interface

Each effect type is a Python function or class with the following contract:

```python
def render(
    params: dict,
    elapsed_sec: float,
    pixel_count: int,
    rng: random.Random,
) -> list[tuple[int, int, int]]:
    ...
```

- `params`: The effect's parameter dict from the play definition.
- `elapsed_sec`: Seconds since the cue started, adjusted for `offsetSec` (see below).
- `pixel_count`: Number of pixels in the region.
- `rng`: A seeded `random.Random` instance for effects that require randomness.
- Returns a list of `(r, g, b)` tuples, one per pixel, each value 0–255.

Effects must be deterministic given the same inputs. Stateful effects (lightning, twinkle) use the provided `rng` rather than global random state.

## offsetSec

Many effects accept an `offsetSec` parameter. The engine applies it before calling render:

```python
adjusted_elapsed = max(0.0, elapsed_sec - offset_sec)
```

Before the offset has elapsed, `adjusted_elapsed` is `0.0` and the effect renders its initial frame.

## Random Number Generation

For effects that use randomness (lightning, twinkle), the engine creates a `random.Random` instance seeded from the effect's `id`. This ensures the same effect renders the same random sequence each time a cue starts, which is important for preview repeatability.

## Color Format

Effects produce colors as RGB tuples `(r, g, b)`, each value 0–255. The rendering engine converts these before handing off to each output target — clients receive data ready to use, with no further conversion required.

- **Internal**: RGB tuples `(r, g, b)`.
- **WebSocket output**: The engine converts each tuple to a hex string `"#rrggbb"` before broadcasting. The UI can use these values directly.
- **Hardware output**: The engine reorders the bytes into the channel's configured `colorOrder` (e.g., GRB for common WS2812B strands) before writing. The hardware driver has no knowledge of color order.

## Overlapping Regions

Overlapping pixel ranges are rejected at write time (see API reference). The rendering engine can assume all region ranges within a play are non-overlapping.

## Preview Mode

Preview works the same as live mode. The frame loop runs from the first cue and runs each cue indefinitely until the operator calls `POST /preview/next` to advance. There is no automatic progression. When the operator stops the preview via `POST /preview/stop`, the server sends a `done` WebSocket message and ends the stream.

## Live Mode

In live mode the frame loop runs the current cue indefinitely. The cue does not advance automatically. The operator calls `POST /live/next` to move to the next cue, at which point:

- The frame loop resets `elapsed_sec` to `0`.
- Any per-cue RNG instances are re-seeded.
- A `status` WebSocket message is sent.

When the last cue is reached, `/live/next` has no effect (the play does not loop).

### Blackout

Blackout overrides the normal frame output with all-black pixels on all channels. The frame loop continues running but output is suppressed. Calling `/live/next` clears the blackout and advances.

## Hardware Output

Hardware output uses the `rpi_ws281x` library and runs only on Raspberry Pi with GPIO access (requires the process to run as root). In development/mock mode, hardware output is skipped and only WebSocket output is produced.

Each channel maps to a PWM output:

| GPIO Pin | PWM Channel |
|----------|-------------|
| 12 or 18 | 0           |
| 13 or 19 | 1           |

The channel buffer is written to the hardware strip after color order conversion on each frame.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `FPS_TARGET` | `30` | Target frames per second. |
| `MOCK_HARDWARE` | `false` | Skip hardware output when `true`. |
| `DATA_DIR` | `/var/lib/pilites` | Base path for stored data. |
| `HARDWARE_TEST_TIMEOUT_SEC` | `30` | Seconds before a hardware test signal auto-clears. |
