# Region Schema

## Purpose

Defines a named region of pixels within a play, mapped to a channel and ranges of pixels.

## Fields

- `id`: Unique identifier for the region.
- `name`: Human-readable name.
- `channelId`: The channel this region belongs to.
- `ranges`: One or more pixel ranges. Ranges are **0-indexed** — `start: 0` is the first pixel on the channel.

## Example

```json
{
  "id": "region-stage-left",
  "name": "Stage Left",
  "channelId": "channel-1",
  "ranges": [
    { "start": 0, "end": 149 }
  ]
}
```

## JSON Schema

See [region.schema.json](region.schema.json).
