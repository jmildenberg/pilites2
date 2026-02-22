# Data Storage Layout

## Purpose

PiLites stores its source-of-truth data as JSON files on disk. This keeps the MVP simple and portable while supporting export, import, backup, and restore.

## Base Path

A single base directory is used for all stored data. The default location is:

- `/var/lib/pilites`

The base path should be configurable by the service.

## Directory Layout

```text
/var/lib/pilites
  channels.json
  plays/
    play-<id>.json
  backups/
    plays/
      play-<id>/
        play-<id>-<timestamp>.json
  exports/
    plays/
      play-<id>-<timestamp>.json
  imports/
    plays/
      play-<id>-<timestamp>.json
```

## File Responsibilities

- `channels.json`: List of channel definitions.
- `plays/`: One file per play, stored as JSON.
- `backups/plays/`: Per-play backups for versioning and rollback.
- `exports/`: Per-play exports for moving between systems.
- `imports/`: Staged per-play imports before applying to storage.

## JSON Format

- `channels.json` matches [channel.schema.json](schemas/channel.schema.json).
- Each `plays/play-<id>.json` matches [play.schema.json](schemas/play.schema.json).
- Related schemas are documented in [docs/schemas/README.md](schemas/README.md).

## Backup and Restore

- Backups are stored per play for versioning and rollback.
- Restoring a play replaces only that play's file.

## Notes

- Writes should be atomic where possible (write to temp then replace).
- Play IDs should be stable so live mode references remain valid.
