// TypeScript mirror of backend/app/schemas/project.py (docs/SCHEMAS.md).
// Keep in sync with the Pydantic models.

export interface Timeline {
  width: number;
  height: number;
  fps: number;
  ticks_per_second: number;
  duration_ticks: number;
}

export interface Asset {
  id: string;
  kind: "video" | "audio" | "image";
  original_name: string;
  storage_key: string;
  duration_ticks: number;
  width: number | null;
  height: number | null;
  fps: number | null;
  size_bytes: number;
  has_audio: boolean;
  status: "ready" | "processing" | "failed";
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  crop: Record<string, number> | null;
  opacity: number;
}

export interface Transition {
  type: "cut" | "fade" | "crossfade" | "slide" | "zoom";
  duration_ticks: number;
}

export interface Keyframe {
  tick: number;
  property: string;
  value: number;
}

export interface ClipRanking {
  position: number;
  label: string | null;
}

export interface Clip {
  id: string;
  asset_id: string | null;
  source_in_ticks: number;
  source_out_ticks: number;
  timeline_start_ticks: number;
  duration_ticks: number;
  transform: Transform;
  volume: number;
  speed: number;
  fade_in_ticks: number;
  fade_out_ticks: number;
  transition_in: Transition | null;
  transition_out: Transition | null;
  ranking: ClipRanking | null;
  keyframes: Keyframe[];
  text: Record<string, unknown> | null;
}

export interface Track {
  id: string;
  type: "video" | "audio" | "text" | "graphics" | "effects";
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
  clips: Clip[];
}

export interface ExportSettings {
  preset: "vertical-1080p" | "vertical-720p" | "landscape-1080p" | "landscape-720p" | "square-1080p";
  width: number;
  height: number;
  fps: number;
  video_bitrate_kbps: number;
  audio_bitrate_kbps: number;
}

export interface ProjectDocument {
  schema_version: number;
  name: string;
  template_id: string | null;
  timeline: Timeline;
  assets: Asset[];
  tracks: Track[];
  export: ExportSettings;
}

export interface ProjectRecord {
  id: string;
  name: string;
  templateId: string | null;
  updatedAt: string | null;
  document: ProjectDocument;
}

export const TICKS_PER_SECOND = 3000;

export function ticksToSeconds(ticks: number): number {
  return Number((ticks / TICKS_PER_SECOND).toFixed(2));
}

export function secondsToTicks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}
