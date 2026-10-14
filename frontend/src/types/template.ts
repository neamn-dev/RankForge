// TypeScript mirror of backend/app/schemas/template.py (docs/SCHEMAS.md).
// Keep in sync with the Pydantic models — this is the same editing model.

export interface Canvas {
  width: number;
  height: number;
  fps: number;
}

export interface GradientStop {
  color: string;
  offset_pct: number;
}

export interface HeaderConfig {
  enabled: boolean;
  background_color: string;
  background_image_asset_id: string | null;
  gradient: GradientStop[] | null;
  height_pct: number;
  padding_px: number;
  title: string;
  subtitle: string;
  text_align: "left" | "center" | "right";
  font_family: string;
  font_size_px: number;
  font_weight: number;
  letter_spacing_px: number;
  line_height: number;
  text_color: string;
  highlighted_words: string[];
  highlight_color: string;
  corner_radius_px: number;
  border: Record<string, unknown> | null;
  entrance_animation: string | null;
}

export interface RankingConfig {
  count: number;
  order: "ascending" | "descending";
  default_color: string;
  per_rank_colors: Record<string, string>;
  font_family: string;
  font_size_px: number;
  bold: boolean;
  outline_color: string;
  outline_width_px: number;
  shadow: { color: string; blur_px: number; offset_px: number };
  badge: { shape: "none" | "circle" | "rounded" | "square"; background_color: string; padding_px: number };
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  spacing_px: number;
  horizontal_align: "left" | "center" | "right";
  vertical_align: "top" | "center" | "bottom";
  animation: string | null;
  highlight_current: boolean;
}

export interface LabelsConfig {
  enabled: boolean;
  texts: Record<string, string>;
  font_family: string;
  font_size_px: number;
  color: string;
  align: "left" | "center" | "right";
  background_color: string | null;
  emoji: string | null;
  max_lines: number;
  position: "top" | "bottom" | "over-number";
  padding_px: number;
  animation: string | null;
  visible_duration_ticks: number | null;
}

export interface BrandingConfig {
  logo_asset_id: string | null;
  watermark_text: string | null;
  watermark_image_asset_id: string | null;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  scale: number;
  opacity: number;
  intro_enabled: boolean;
  outro_enabled: boolean;
  channel_name: string | null;
}

export interface TemplateDocument {
  schema_version: number;
  name: string;
  is_default: boolean;
  canvas: Canvas;
  header: HeaderConfig;
  ranking: RankingConfig;
  labels: LabelsConfig;
  branding: BrandingConfig;
}

export function defaultTemplate(name = "Untitled Template"): TemplateDocument {
  return {
    schema_version: 1,
    name,
    is_default: false,
    canvas: { width: 1080, height: 1920, fps: 30 },
    header: {
      enabled: true, background_color: "#0f0f14", background_image_asset_id: null,
      gradient: null, height_pct: 18, padding_px: 24, title: "TOP 10", subtitle: "",
      text_align: "center", font_family: "Inter", font_size_px: 64, font_weight: 800,
      letter_spacing_px: 0, line_height: 1.2, text_color: "#ffffff",
      highlighted_words: [], highlight_color: "#facc15", corner_radius_px: 0,
      border: null, entrance_animation: "fade-down",
    },
    ranking: {
      count: 10, order: "descending", default_color: "#ffffff", per_rank_colors: {},
      font_family: "Inter", font_size_px: 120, bold: true, outline_color: "#000000",
      outline_width_px: 4, shadow: { color: "#000000", blur_px: 8, offset_px: 4 },
      badge: { shape: "circle", background_color: "#1f2937", padding_px: 20 },
      position: "top-left", spacing_px: 8, horizontal_align: "left",
      vertical_align: "top", animation: "pop-in", highlight_current: true,
    },
    labels: {
      enabled: true, texts: {}, font_family: "Inter", font_size_px: 36,
      color: "#ffffff", align: "left", background_color: null, emoji: null,
      max_lines: 2, position: "bottom", padding_px: 12, animation: "fade-up",
      visible_duration_ticks: null,
    },
    branding: {
      logo_asset_id: null, watermark_text: null, watermark_image_asset_id: null,
      position: "bottom-right", scale: 0.2, opacity: 0.6,
      intro_enabled: false, outro_enabled: false, channel_name: null,
    },
  };
}
