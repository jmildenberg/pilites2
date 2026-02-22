# PiLites MVP

## Goal

Deliver a minimal, reliable system for live theatre control on Raspberry Pi that lets operators configure channels, build plays with regions and cues, preview effects, and run a performance in live mode.

## Non-Goals

- Multi-device sync or timecode integration
- Advanced network provisioning or AP management
- Complex permissioning or multi-user workflows
- High-fidelity 3D visualizers

## Core User Flows

1. Configure hardware channels (type, count, pixel order, GPIO pin).
2. Create a play with named regions that map to theatre layout.
3. Create cues that assign effects to regions.
4. Preview cues in a design mode.
5. Enter live mode and step through cue order.
6. Export or import a play.
7. Backup or restore a play.
8. Use a region test signal to identify physical light locations.
9. Trigger a global blackout or stop during live mode.

## MVP Features

- Channel configuration UI with GPIO pin selection and validation
- Play editor with regions and cue list
- Region test signal for locating lights on a strand
- Effects engine with a small starter set and an extensible effect model
- Preview mode with frame rendering in UI
- Live mode cue progression and status display
- Global blackout and stop controls in live mode
- Per-play export/import and backup/restore
- Systemd service to run backend with PWM access

## Effects (MVP Set)

- Chase
- Fade In
- Fade Out
- Color wash
- Static color
- Gradient
- Strobe
- Rainbow
- Lightning
- Pulse
- Twinkle

## Data Model (Draft)

- Channel
  - id, name, gpioPin, ledCount, ledType, colorOrder
- Region
  - id, name, channelId, ranges (0-indexed pixel ranges)
- Effect
  - id, type, params
- Cue
  - id, name, effectsByRegion (map of regionId to a single effect)
- Play
  - id, name, regions, cues (cue order is playback order)

GPIO pin selection determines the PWM channel for a given channel definition.

The backend persisted model is the source of truth for play definitions.
Effects should be modeled in a way that allows new effect types to be added without changing existing play data.
Effects are defined in code and evolve through application releases, not via live schema changes.
Each region in a cue has exactly one effect. Cues run indefinitely in live mode until the operator manually advances.

## API Sketch

- GET /health
- GET /channels, POST /channels (upsert by id)
- POST /channels/{id}/test/white, POST /channels/{id}/test/off
- POST /plays/{id}/regions/{regionId}/test
- GET /plays, POST /plays
- GET /plays/{id}, PUT /plays/{id}, DELETE /plays/{id}
- GET /preview/status, POST /preview
- POST /preview/next, POST /preview/stop
- WS /preview/stream
- GET /live/status, POST /live/start
- POST /live/next
- POST /live/stop
- POST /live/blackout
- WS /live/stream
- POST /plays/{id}/export
- GET /plays/{id}/export/{filename}
- POST /plays/import/upload
- POST /plays/{id}/import
- GET /plays/{id}/backups
- POST /plays/{id}/backup
- POST /plays/{id}/restore

## UI Screens (MVP)

- Hardware setup (channels)
- Play editor (regions, cues)
- Hardware test (all-off, all-white, per-region test)
- Preview mode
- Live mode
- Per-play import/export and backup/restore

## Rendering to UI

Frame rendering and live status updates are streamed to the UI over WebSockets for low-latency, bidirectional communication.

## Performance Targets

- 30 FPS with up to 1000 LEDs per PWM channel
- 60 FPS with up to 500 LEDs per PWM channel

## Hardware Targets

- Raspberry Pi Zero W and Zero 2 W
- WS281x-compatible LEDs
- PWM channels 0 and 1 (GPIO 12/18 and 13/19)

## Deployment

- FastAPI backend installed on the Pi
- systemd service running as root for PWM access
- Frontend hosted by the backend or static server

## Storage

Play and configuration data are stored as JSON files on disk during MVP.

## Risks and Unknowns

- Final config schema may evolve
- LED timing constraints may change with effect complexity
- Preview performance on low-power hardware

## MVP Milestones

1. Backend skeleton with channel config and rendering stub
2. Basic effects engine with preview output
3. Play editor and cue ordering
4. Live mode cue progression
5. Export/import and backup/restore
