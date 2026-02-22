import json
import os
from pathlib import Path

from models import BackupEntry, Channel, Play, PlaySummary


class Storage:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self._plays_dir = data_dir / "plays"
        self._backups_dir = data_dir / "backups" / "plays"
        self._exports_dir = data_dir / "exports" / "plays"
        self._imports_dir = data_dir / "imports" / "plays"
        self._channels_file = data_dir / "channels.json"

    def create_dirs(self) -> None:
        for d in (
            self._plays_dir,
            self._backups_dir,
            self._exports_dir,
            self._imports_dir,
        ):
            d.mkdir(parents=True, exist_ok=True)
        if not self._channels_file.exists():
            self._atomic_write(self._channels_file, [])

    # ── Atomic write helper ────────────────────────────────────────────────────

    def _atomic_write(self, path: Path, data: object) -> None:
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
        os.replace(tmp, path)

    # ── Channels ───────────────────────────────────────────────────────────────

    def load_channels(self) -> list[Channel]:
        raw = json.loads(self._channels_file.read_text(encoding="utf-8"))
        return [Channel.model_validate(c) for c in raw]

    def save_channels(self, channels: list[Channel]) -> None:
        self._atomic_write(
            self._channels_file,
            [c.model_dump() for c in channels],
        )

    # ── Plays ──────────────────────────────────────────────────────────────────

    def _play_path(self, play_id: str) -> Path:
        return self._plays_dir / f"play-{play_id}.json"

    def load_play(self, play_id: str) -> Play | None:
        path = self._play_path(play_id)
        if not path.exists():
            return None
        return Play.model_validate(json.loads(path.read_text(encoding="utf-8")))

    def save_play(self, play: Play) -> None:
        self._atomic_write(self._play_path(play.id), play.model_dump())

    def delete_play(self, play_id: str) -> bool:
        path = self._play_path(play_id)
        if not path.exists():
            return False
        path.unlink()
        return True

    def list_plays(self) -> list[PlaySummary]:
        summaries = []
        for path in sorted(self._plays_dir.glob("play-*.json")):
            try:
                raw = json.loads(path.read_text(encoding="utf-8"))
                summaries.append(PlaySummary(id=raw["id"], name=raw["name"]))
            except (KeyError, json.JSONDecodeError):
                continue
        return summaries

    # ── Backups ────────────────────────────────────────────────────────────────

    def _backup_dir(self, play_id: str) -> Path:
        return self._backups_dir / f"play-{play_id}"

    def list_backups(self, play_id: str) -> list[BackupEntry]:
        d = self._backup_dir(play_id)
        if not d.exists():
            return []
        entries = []
        for path in sorted(d.glob("*.json"), reverse=True):
            entries.append(BackupEntry(name=path.name, path=str(path)))
        return entries

    def create_backup(self, play: Play) -> BackupEntry:
        import time

        d = self._backup_dir(play.id)
        d.mkdir(parents=True, exist_ok=True)
        timestamp = int(time.time())
        name = f"play-{play.id}-{timestamp}.json"
        path = d / name
        self._atomic_write(path, play.model_dump())
        return BackupEntry(name=name, path=str(path))

    def load_backup(self, play_id: str, name: str) -> Play | None:
        path = self._backup_dir(play_id) / name
        if not path.exists():
            return None
        return Play.model_validate(json.loads(path.read_text(encoding="utf-8")))

    # ── Exports ────────────────────────────────────────────────────────────────

    def create_export(self, play: Play) -> tuple[str, Path]:
        import time

        timestamp = int(time.time())
        name = f"play-{play.id}-{timestamp}.json"
        path = self._exports_dir / name
        self._atomic_write(path, play.model_dump())
        return name, path

    def export_path(self, name: str) -> Path | None:
        path = self._exports_dir / name
        return path if path.exists() else None

    # ── Imports ────────────────────────────────────────────────────────────────

    def stage_import(self, name: str, data: bytes) -> str:
        import time

        timestamp = int(time.time())
        staged_name = f"{Path(name).stem}-{timestamp}.json"
        path = self._imports_dir / staged_name
        path.write_bytes(data)
        return staged_name

    def load_staged_import(self, name: str) -> Play | None:
        path = self._imports_dir / name
        if not path.exists():
            return None
        return Play.model_validate(json.loads(path.read_text(encoding="utf-8")))
