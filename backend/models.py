from __future__ import annotations

from typing import Any

from pydantic import BaseModel, field_validator, model_validator


class PixelRange(BaseModel):
    start: int
    end: int

    @model_validator(mode="after")
    def validate_range(self) -> PixelRange:
        if self.start < 0:
            raise ValueError("start must be >= 0")
        if self.end < self.start:
            raise ValueError("end must be >= start")
        return self


class Channel(BaseModel):
    id: str
    name: str
    gpioPin: int
    ledCount: int
    ledType: str
    colorOrder: str

    @field_validator("colorOrder")
    @classmethod
    def validate_color_order(cls, v: str) -> str:
        valid = {"RGB", "GRB", "RGBW", "GRBW"}
        if v not in valid:
            raise ValueError(f"colorOrder must be one of {sorted(valid)}")
        return v

    @field_validator("ledCount")
    @classmethod
    def validate_led_count(cls, v: int) -> int:
        if v < 1:
            raise ValueError("ledCount must be >= 1")
        return v

    @field_validator("gpioPin")
    @classmethod
    def validate_gpio_pin(cls, v: int) -> int:
        valid_pins = {12, 13, 18, 19}
        if v not in valid_pins:
            raise ValueError(f"gpioPin must be one of {sorted(valid_pins)}")
        return v


class Effect(BaseModel):
    id: str
    type: str
    params: dict[str, Any] = {}


class Region(BaseModel):
    id: str
    name: str
    channelId: str
    ranges: list[PixelRange]

    @field_validator("ranges")
    @classmethod
    def validate_no_overlap(cls, ranges: list[PixelRange]) -> list[PixelRange]:
        if len(ranges) < 2:
            return ranges
        sorted_ranges = sorted(ranges, key=lambda r: r.start)
        for i in range(len(sorted_ranges) - 1):
            if sorted_ranges[i].end >= sorted_ranges[i + 1].start:
                raise ValueError(
                    f"ranges overlap: [{sorted_ranges[i].start},{sorted_ranges[i].end}] "
                    f"and [{sorted_ranges[i+1].start},{sorted_ranges[i+1].end}]"
                )
        return ranges


class Cue(BaseModel):
    id: str
    name: str
    effectsByRegion: dict[str, Effect] = {}


class Play(BaseModel):
    id: str
    name: str
    regions: list[Region] = []
    cues: list[Cue] = []


class PlaySummary(BaseModel):
    id: str
    name: str


# ── Request / Response bodies ──────────────────────────────────────────────────


class OkResponse(BaseModel):
    ok: bool = True


class StartPreviewRequest(BaseModel):
    playId: str


class StartLiveRequest(BaseModel):
    playId: str


class ImportRequest(BaseModel):
    name: str


class RestoreRequest(BaseModel):
    name: str


class BackupEntry(BaseModel):
    name: str
    path: str


class ExportResponse(BaseModel):
    ok: bool = True
    name: str
    path: str


class UploadResponse(BaseModel):
    ok: bool = True
    name: str


class BackupResponse(BaseModel):
    ok: bool = True
    path: str


class PreviewStatus(BaseModel):
    isRunning: bool
    playId: str | None


class LiveStatus(BaseModel):
    isRunning: bool
    playId: str | None
    cueId: str | None
    cueName: str | None
    cueIndex: int | None
    isBlackout: bool
