import json
from pathlib import Path

import pytest

from models import Channel, Play, Region, PixelRange, Effect, Cue
from storage import Storage


@pytest.fixture
def storage(tmp_path: Path) -> Storage:
    s = Storage(tmp_path)
    s.create_dirs()
    return s


def make_channel(id: str = "ch-1") -> Channel:
    return Channel(
        id=id, name="Test", gpioPin=18, ledCount=100, ledType="ws281x", colorOrder="RGB"
    )


def make_play(id: str = "play-1") -> Play:
    return Play(
        id=id,
        name="Test Play",
        regions=[
            Region(
                id="r-1",
                name="Stage Left",
                channelId="ch-1",
                ranges=[PixelRange(start=0, end=49)],
            )
        ],
        cues=[
            Cue(
                id="cue-1",
                name="Intro",
                effectsByRegion={
                    "r-1": Effect(id="e-1", type="static_color", params={"color": "#ff0000"})
                },
            )
        ],
    )


class TestDirectoryInit:
    def test_creates_required_dirs(self, tmp_path: Path) -> None:
        s = Storage(tmp_path)
        s.create_dirs()
        assert (tmp_path / "plays").is_dir()
        assert (tmp_path / "backups" / "plays").is_dir()
        assert (tmp_path / "exports" / "plays").is_dir()
        assert (tmp_path / "imports" / "plays").is_dir()

    def test_creates_empty_channels_json(self, tmp_path: Path) -> None:
        s = Storage(tmp_path)
        s.create_dirs()
        data = json.loads((tmp_path / "channels.json").read_text())
        assert data == []

    def test_does_not_overwrite_existing_channels(self, tmp_path: Path) -> None:
        s = Storage(tmp_path)
        s.create_dirs()
        ch = make_channel()
        s.save_channels([ch])
        s.create_dirs()  # called again on restart
        channels = s.load_channels()
        assert len(channels) == 1


class TestChannelStorage:
    def test_save_and_load(self, storage: Storage) -> None:
        ch = make_channel()
        storage.save_channels([ch])
        result = storage.load_channels()
        assert len(result) == 1
        assert result[0].id == "ch-1"

    def test_upsert_channel(self, storage: Storage) -> None:
        ch1 = make_channel("ch-1")
        ch2 = make_channel("ch-2")
        storage.save_channels([ch1])
        storage.save_channels([ch1, ch2])
        assert len(storage.load_channels()) == 2

    def test_atomic_write_does_not_corrupt(self, storage: Storage) -> None:
        ch = make_channel()
        storage.save_channels([ch])
        # Verify no .tmp file left behind
        assert not list(storage.data_dir.glob("*.tmp"))


class TestPlayStorage:
    def test_save_and_load(self, storage: Storage) -> None:
        play = make_play()
        storage.save_play(play)
        result = storage.load_play("play-1")
        assert result is not None
        assert result.id == "play-1"
        assert result.name == "Test Play"

    def test_load_nonexistent_returns_none(self, storage: Storage) -> None:
        assert storage.load_play("does-not-exist") is None

    def test_delete_play(self, storage: Storage) -> None:
        storage.save_play(make_play())
        assert storage.delete_play("play-1") is True
        assert storage.load_play("play-1") is None

    def test_delete_nonexistent_returns_false(self, storage: Storage) -> None:
        assert storage.delete_play("ghost") is False

    def test_list_plays(self, storage: Storage) -> None:
        storage.save_play(make_play("p-1"))
        storage.save_play(make_play("p-2"))
        summaries = storage.list_plays()
        ids = {s.id for s in summaries}
        assert ids == {"p-1", "p-2"}

    def test_list_plays_empty(self, storage: Storage) -> None:
        assert storage.list_plays() == []


class TestBackupStorage:
    def test_create_and_list_backup(self, storage: Storage) -> None:
        play = make_play()
        entry = storage.create_backup(play)
        assert entry.name.startswith("play-play-1-")
        backups = storage.list_backups("play-1")
        assert len(backups) == 1
        assert backups[0].name == entry.name

    def test_list_backups_newest_first(self, storage: Storage) -> None:
        import time

        play = make_play()
        storage.create_backup(play)
        time.sleep(1.1)
        storage.create_backup(play)
        backups = storage.list_backups("play-1")
        assert backups[0].name > backups[1].name  # lexicographic = timestamp order

    def test_load_backup(self, storage: Storage) -> None:
        play = make_play()
        entry = storage.create_backup(play)
        loaded = storage.load_backup("play-1", entry.name)
        assert loaded is not None
        assert loaded.id == "play-1"

    def test_list_backups_no_dir(self, storage: Storage) -> None:
        assert storage.list_backups("never-backed-up") == []


class TestExportStorage:
    def test_create_export(self, storage: Storage) -> None:
        play = make_play()
        name, path = storage.create_export(play)
        assert path.exists()
        assert name.startswith("play-play-1-")

    def test_export_path_found(self, storage: Storage) -> None:
        play = make_play()
        name, _ = storage.create_export(play)
        assert storage.export_path(name) is not None

    def test_export_path_not_found(self, storage: Storage) -> None:
        assert storage.export_path("nonexistent.json") is None
