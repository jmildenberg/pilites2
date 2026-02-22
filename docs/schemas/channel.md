# Channel Schema

## Purpose

Defines a hardware output channel for a strand of LEDs. The GPIO pin determines the PWM channel.

## Fields

- `id`: Unique identifier for the channel.
- `name`: Human-readable name.
- `gpioPin`: GPIO pin used for PWM output.
- `ledCount`: Number of LEDs on the strand.
- `ledType`: LED protocol/type.
- `colorOrder`: Pixel color order. Valid values: `RGB`, `GRB`, `RGBW`, `GRBW`.

## Example

```json
{
  "id": "channel-1",
  "name": "Main Strand",
  "gpioPin": 18,
  "ledCount": 600,
  "ledType": "ws281x",
  "colorOrder": "RGB"
}
```

## JSON Schema

See [channel.schema.json](channel.schema.json).
