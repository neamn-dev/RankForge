"""Pydantic models for the Project document (see docs/SCHEMAS.md)."""
from typing import Literal, Optional

from pydantic import BaseModel, Field


class Timeline(BaseModel):
    width: int = Field(default=1080, ge=16, le=8192)
    height: int = Field(default=1920, ge=16, le=8192)
    fps: int = Field(default=30, ge=1, le=120)
    ticks_per_second: int = 3000
    duration_ticks: int = Field(default=0, ge=0)


class Asset(BaseModel):
    id: str
    kind: Literal["video", "audio", "image"]
    original_name: str
    storage_key: str
    duration_ticks: int = 0
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    size_bytes: int = 0
    has_audio: bool = False
    status: Literal["ready", "processing", "failed"] = "processing"


class Transform(BaseModel):
    x: float = 0.0
    y: float = 0.0
    scale: float = 1.0
    rotation: float = 0.0  # degrees
    crop: Optional[dict] = None  # {left,top,right,bottom} in source pixels
    opacity: float = Field(default=1.0, ge=0, le=1)


class Transition(BaseModel):
    type: Literal["cut", "fade", "crossfade", "slide", "zoom"]
    duration_ticks: int = Field(default=15, gt=0)  # ticks


class Keyframe(BaseModel):
    tick: int = Field(ge=0)
    property: str
    value: float


class ClipRanking(BaseModel):
    position: int = Field(ge=1, le=100)
    label: Optional[str] = None


class Clip(BaseModel):
    id: str
    asset_id: Optional[str] = None
    source_in_ticks: int = Field(default=0, ge=0)
    source_out_ticks: int = Field(default=0, ge=0)
    timeline_start_ticks: int = Field(default=0, ge=0)
    duration_ticks: int = Field(default=0, ge=0)
    transform: Transform = Field(default_factory=Transform)
    volume: float = Field(default=1.0, ge=0, le=2)
    speed: float = Field(default=1.0, gt=0, le=10)
    fade_in_ticks: int = Field(default=0, ge=0)
    fade_out_ticks: int = Field(default=0, ge=0)
    transition_in: Optional[Transition] = None
    transition_out: Optional[Transition] = None
    ranking: Optional[ClipRanking] = None
    keyframes: list[Keyframe] = Field(default_factory=list)
    text: Optional[dict] = None  # populated for text-track clips


class Track(BaseModel):
    id: str
    type: Literal["video", "audio", "text", "graphics", "effects"]
    name: str = "Track"
    visible: bool = True
    locked: bool = False
    order: int = 0
    clips: list[Clip] = Field(default_factory=list)


class ExportSettings(BaseModel):
    preset: Literal["vertical-1080p", "vertical-720p", "landscape-1080p",
                    "landscape-720p", "square-1080p"] = "vertical-1080p"
    width: int = 1080
    height: int = 1920
    fps: int = 30
    video_bitrate_kbps: int = 8000
    audio_bitrate_kbps: int = 192


class ProjectDocument(BaseModel):
    """The full, versioned project document stored in the DB."""

    schema_version: int = 1
    name: str = Field(default="Untitled Project", max_length=255)
    template_id: Optional[str] = None
    timeline: Timeline = Field(default_factory=Timeline)
    assets: list[Asset] = Field(default_factory=list)
    tracks: list[Track] = Field(default_factory=list)
    export: ExportSettings = Field(default_factory=ExportSettings)
