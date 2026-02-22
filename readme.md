# PiLites

PiLites is a theatre lighting control system that runs as a web application on Raspberry Pi hardware. It is built for live performance use and can drive up to 5400 lights based on configuration.

## Purpose

PiLites provides reliable live control of pixel lighting for theatre productions, with a design workflow that lets lighting designers and technicians build and preview cues before a performance.

Plays and configuration can be backed up and restored, with export and import capabilities for portability between systems.

## Project Status

PiLites is in prototype status. The design goal is stable, effective light output during live performances.

## Definitions

Before we start, here are standard definitions to make the documentation easier to read.

- **Channel** : An independent signal that controls strand(s) of lights.
- **Region** : A named range or set of ranges of pixels (bulbs or nodes on the strand) defined within a play to reflect the theatre layout.
- **Effect** : A lighting effect that is assigned to a region within a cue.
- **Cue** : Defines the effects assigned to a region of lights for a period of time.
- **Play** : An ordered list of cues, with play-specific regions that help operators identify locations in the theatre.

## Audience

PiLites is intended for lighting designers and technicians who need a simple, reliable interface for programming and running pixel-based lighting for theatre.

## Architecture Overview

PiLites is split into a frontend UI for design and control and a backend service for hardware control and rendering.

### Frontend

The PiLites frontend is a React SWC application written in TypeScript. The UI supports hardware configuration (channel setup), show definition, effect preview during design time, and a simplified live mode for cue progression and monitoring.

### Backend

The PiLites backend is a Python FastAPI application that provides APIs for hardware configuration, show definition, and frame rendering to the UI and the lights. It drives the effects engine and streams results back to the UI for live monitoring.

## Hardware Support

- Raspberry Pi Zero W and Raspberry Pi Zero 2 W
- WS281x-compatible pixel lights
- Two distinct PWM channels: 0 (GPIO 12 or 18) and 1 (GPIO 13 or 19)

### Performance Guidance

- Around 1000 lights per channel at 30 FPS
- Around 500 lights per channel at 60 FPS
- Up to 2700 lights per channel at lower FPS

### Power Guidance

- The Raspberry Pi uses its own power supply.
- Light strands require 5V, 12V, or 24V depending on length and count.
- Long runs should use multiple power drops to avoid voltage loss.

## Getting Started

1. Prepare a Raspberry Pi Zero W or Zero 2 W with a supported OS.
2. Wire the WS281x strands to the intended PWM channel(s).
3. Ensure the Pi has proper power and the light strands have adequate power drops.
4. Install PiLites and configure it to run as a root systemd service (required for PWM access).
5. Open the web UI and complete channel configuration.
6. Define a play with named regions and an ordered list of cues, then preview effects.
7. Switch to live mode to run the performance.

## Configuration

Configuration details are still evolving during the prototype phase. This section will be expanded once the application implementation stabilizes.

## Effects Library

Common effects include chase, fade, lightning, fire, color wash, pulse, twinkle, and marquee.

## Contributions

Contributions are welcome. Please open an issue to discuss significant changes before starting work.

## License

MIT
