# Play Schema

## Purpose

Defines a play with regions and cues.

## Fields

- `id`: Unique identifier for the play.
- `name`: Human-readable name.
- `regions`: List of regions within the play.
- `cues`: List of cues within the play. The order in this list is the playback order.

## Example

```json
{
  "id": "play-1",
  "name": "Main Stage",
  "regions": [
    { "id": "region-stage-left", "name": "Stage Left", "channelId": "channel-1", "ranges": [{ "start": 0, "end": 149 }] }
  ],
  "cues": [
    { "id": "cue-1", "name": "Intro", "effectsByRegion": { "region-stage-left": { "id": "effect-1", "type": "fade_in", "params": { "durationSec": 1.2, "color": "#ffffff" } } } }
  ]
}
```

## JSON Schema

See [play.schema.json](play.schema.json).
