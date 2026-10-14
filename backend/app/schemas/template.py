"""Pydantic models for the Template document (see docs/SCHEMAS.md)."""
from typing import Literal, Optional

from pydantic import BaseModel, Field


class Canvas(BaseModel):
    width: int = Field(default=1080, ge=16, le=8192)
    height: int = Field(default=1920, ge=16, le=8192)
    fps: int = Field(default=30, ge=1, le=120)


class GradientStop(BaseModel):
    color: str
    offset_pct: float = Field(ge=0, le=100)


class HeaderConfig(BaseModel):
    enabled: bool = True
    background_color: str = "#0f0f14"
    background_image_asset_id: Optional[str] = None
    gradient: Optional[list[GradientStop]] = None
    height_pct: float = Field(default=18.0, gt=0, le=60)
    padding_px: int = Field(default=24, ge=0, le=400)
    title: str = "TOP 10"
    subtitle: str = ""
    text_align: Literal["left", "center", "right"] = "center"
    font_family: str = "Inter"
    font_size_px: int = Field(default=64, ge=8, le=500)
    font_weight: int = Field(default=800, ge=100, le=900)
    letter_spacing_px: float = Field(default=0.0, ge=0, le=100)
    line_height: float = Field(default=1.2, gt=0, le=5)
    text_color: str = "#ffffff"
    highlighted_words: list[str] = Field(default_factory=list)
    highlight_color: str = "#facc15"
    corner_radius_px: int = Field(default=0, ge=0, le=500)
    border: Optional[dict] = None
    entrance_animation: Optional[str] = "fade-down"


class BadgeConfig(BaseModel):
    shape: Literal["none", "circle", "rounded", "square"] = "circle"
    background_color: str = "#1f2937"
    padding_px: int = Field(default=20, ge=0, le=400)


class ShadowConfig(BaseModel):
    color: str = "#000000"
    blur_px: int = Field(default=8, ge=0, le=200)
    offset_px: int = Field(default=4, ge=0, le=200)


class RankingConfig(BaseModel):
    count: int = Field(default=10, ge=1, le=100)
    order: Literal["ascending", "descending"] = "descending"
    default_color: str = "#ffffff"
    per_rank_colors: dict[str, str] = Field(default_factory=dict)
    font_family: str = "Inter"
    font_size_px: int = Field(default=120, ge=8, le=800)
    bold: bool = True
    outline_color: str = "#000000"
    outline_width_px: int = Field(default=4, ge=0, le=50)
    shadow: ShadowConfig = Field(default_factory=ShadowConfig)
    badge: BadgeConfig = Field(default_factory=BadgeConfig)
    position: Literal["top-left", "top-right", "bottom-left", "bottom-right", "center"] = "top-left"
    spacing_px: int = Field(default=8, ge=0, le=500)
    horizontal_align: Literal["left", "center", "right"] = "left"
    vertical_align: Literal["top", "center", "bottom"] = "top"
    animation: Optional[str] = "pop-in"
    highlight_current: bool = True


class LabelsConfig(BaseModel):
    enabled: bool = True
    texts: dict[str, str] = Field(default_factory=dict)  # rank -> label
    font_family: str = "Inter"
    font_size_px: int = Field(default=36, ge=8, le=300)
    color: str = "#ffffff"
    align: Literal["left", "center", "right"] = "left"
    background_color: Optional[str] = None
    emoji: Optional[str] = None
    max_lines: int = Field(default=2, ge=1, le=10)
    position: Literal["top", "bottom", "over-number"] = "bottom"
    padding_px: int = Field(default=12, ge=0, le=200)
    animation: Optional[str] = "fade-up"
    visible_duration_ticks: Optional[int] = Field(default=None, ge=1)


class BrandingConfig(BaseModel):
    logo_asset_id: Optional[str] = None
    watermark_text: Optional[str] = None
    watermark_image_asset_id: Optional[str] = None
    position: Literal["top-left", "top-right", "bottom-left", "bottom-right"] = "bottom-right"
    scale: float = Field(default=0.2, gt=0, le=1)
    opacity: float = Field(default=0.6, ge=0, le=1)
    intro_enabled: bool = False
    outro_enabled: bool = False
    channel_name: Optional[str] = None


class TemplateDocument(BaseModel):
    """The full, versioned template document stored in the DB."""

    schema_version: int = 1
    name: str = Field(default="Untitled Template", max_length=255)
    is_default: bool = False
    canvas: Canvas = Field(default_factory=Canvas)
    header: HeaderConfig = Field(default_factory=HeaderConfig)
    ranking: RankingConfig = Field(default_factory=RankingConfig)
    labels: LabelsConfig = Field(default_factory=LabelsConfig)
    branding: BrandingConfig = Field(default_factory=BrandingConfig)
