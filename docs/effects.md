# Effects Catalog

This catalog lists the MVP effects, their parameters, defaults, and a short visual description. Effects are defined in code and referenced by `type`.

## Chase

**Type**: `chase`

**Description**: A moving highlight that travels along the region over a background color.

Parameters:

- `color` (string, hex) - default `#ffffff`
- `backgroundColor` (string, hex) - default `#000000`
- `speed` (number, 0.1-5.0) - default `1.0`
- `direction` (string, `forward` or `reverse`) - default `forward`
- `offsetSec` (number, seconds) - default `0`

## Fade In

**Type**: `fade_in`

**Description**: Fades from black to the target color over time.

Parameters:

- `color` (string, hex) - default `#ffffff`
- `durationSec` (number, seconds) - default `1.0`
- `offsetSec` (number, seconds) - default `0`

## Fade Out

**Type**: `fade_out`

**Description**: Fades from a specified color to black over time.

Parameters:

- `fromColor` (string, hex) - default `#ffffff`
- `durationSec` (number, seconds) - default `1.0`
- `offsetSec` (number, seconds) - default `0`

## Color Wash

**Type**: `color_wash`

**Description**: A sweeping color fill across the region with gentle animated intensity variation.

Parameters:

- `color` (string, hex) - default `#ffffff`
- `intensity` (number, 0.0-1.0) - default `1.0`
- `speed` (number, 0.1-5.0) - default `1.0`

## Static Color

**Type**: `static_color`

**Description**: A steady, unchanging color fill across the region with no animation.

Parameters:

- `color` (string, hex) - default `#ffffff`
- `intensity` (number, 0.0-1.0) - default `1.0`

## Gradient

**Type**: `gradient`

**Description**: A smooth blend between two colors across the region.

Parameters:

- `startColor` (string, hex) - default `#ffffff`
- `endColor` (string, hex) - default `#000000`
- `direction` (string, `forward` or `reverse`) - default `forward`

## Strobe

**Type**: `strobe`

**Description**: A hard on/off flash at a defined rate.

Parameters:

- `color` (string, hex) - default `#ffffff`
- `rate` (number, flashes per second) - default `8`
- `dutyCycle` (number, 0.0-1.0) - default `0.5`
- `offsetSec` (number, seconds) - default `0`

## Rainbow

**Type**: `rainbow`

**Description**: A cycling rainbow gradient across the region.

Parameters:

- `speed` (number, 0.1-5.0) - default `1.0`
- `direction` (string, `forward` or `reverse`) - default `forward`
- `intensity` (number, 0.0-1.0) - default `1.0`
- `offsetSec` (number, seconds) - default `0`

## Lightning

**Type**: `lightning`

**Description**: Random bright flashes with short decay over a background color.

Parameters:

- `flashColor` (string, hex) - default `#ffffff`
- `backgroundColor` (string, hex) - default `#000000`
- `intensity` (number, 0.0-1.0) - default `1.0`
- `strikeRate` (number, strikes per minute) - default `12`
- `decaySec` (number, seconds) - default `0.2`
- `offsetSec` (number, seconds) - default `0`

## Pulse

**Type**: `pulse`

**Description**: A rhythmic brightness pulse over time on top of a background color.

Parameters:

- `color` (string, hex) - default `#ffffff`
- `backgroundColor` (string, hex) - default `#000000`
- `speed` (number, 0.1-5.0) - default `1.0`
- `minIntensity` (number, 0.0-1.0) - default `0.1`
- `maxIntensity` (number, 0.0-1.0) - default `1.0`
- `offsetSec` (number, seconds) - default `0`

## Twinkle

**Type**: `twinkle`

**Description**: Randomized small brightness changes across pixels over a background color.

Parameters:

- `color` (string, hex) - default `#ffffff`
- `backgroundColor` (string, hex) - default `#000000`
- `density` (number, 0.0-1.0) - default `0.3`
- `speed` (number, 0.1-5.0) - default `1.0`
- `offsetSec` (number, seconds) - default `0`
