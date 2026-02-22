# Effect Schema

## Purpose

Defines an effect instance applied within a cue. Effects are defined in code and evolve through application releases.

## Fields

- `id`: Unique identifier for the effect instance.
- `type`: Effect type identifier (for example `fade_in`, `color_wash`).
- `params`: Effect parameters defined by the effect type.

## Example

```json
{
  "id": "effect-1",
  "type": "fade_in",
  "params": {
    "durationSec": 1.5,
    "color": "#ffffff",
    "intensity": 1.0
  }
}
```

## JSON Schema

See [effect.schema.json](effect.schema.json).
