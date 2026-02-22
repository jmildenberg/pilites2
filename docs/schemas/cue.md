# Cue Schema

## Purpose

Defines a single effect per region for a period of time. Cues run indefinitely in live mode until the operator advances manually.

## Fields

- `id`: Unique identifier for the cue.
- `name`: Human-readable name.
- `effectsByRegion`: Map of `regionId` to a single effect. Each region may have at most one effect per cue.

## Example

```json
{
  "id": "cue-1",
  "name": "Intro",
  "effectsByRegion": {
    "region-stage-left": { "id": "effect-1", "type": "color_wash", "params": { "color": "#0044ff" } },
    "region-center": { "id": "effect-2", "type": "fade_in", "params": { "durationSec": 1.5, "color": "#ffffff" } }
  }
}
```

## JSON Schema

See [cue.schema.json](cue.schema.json).
