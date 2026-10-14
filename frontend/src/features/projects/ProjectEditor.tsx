import { useCallback, useEffect, useRef, useState } from "react";
import { api, type TemplateRecord } from "../../api/client";
import type {
  Asset,
  Clip,
  ProjectDocument,
  Track,
} from "../../types/project";

import { secondsToTicks, ticksToSeconds } from "../../types/project";

export function ProjectEditor({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const [project, setProject] = useState<ProjectDocument | null>(null);
  const [projectName, setProjectName] = useState("");
  const [template, setTemplate] = useState<TemplateRecord | null>(null);
  const [activeRankIndex, setActiveRankIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load project and associated template
  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const proj = await api.getProject(projectId);
      setProject(proj.document);
      setProjectName(proj.name);

      if (proj.templateId) {
        try {
          const tmpl = await api.getTemplate(proj.templateId);
          setTemplate(tmpl);
        } catch {
          // If template was deleted, load default fallback
        }
      }
      setSaving("saved");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Helper to get video track
  const videoTrack: Track | undefined = project?.tracks.find((t) => t.type === "video");
  const clips: Clip[] = videoTrack?.clips ?? [];
  const activeClip: Clip | undefined = clips[activeRankIndex];
  const activeAsset: Asset | undefined = project?.assets.find(
    (a) => a.id === activeClip?.asset_id
  );

  // Total timeline duration
  const totalDurationSec = project
    ? ticksToSeconds(project.timeline.duration_ticks)
    : 0;

  // Save changes to backend
  const handleSave = async (docToSave?: ProjectDocument) => {
    const doc = docToSave ?? project;
    if (!doc) return;
    setSaving("saving");
    try {
      doc.name = projectName;
      await api.updateProject(projectId, doc);
      setSaving("saved");
    } catch (e) {
      setSaving("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Mutator helper that updates state and marks dirty
  const updateProject = (fn: (d: ProjectDocument) => void) => {
    if (!project) return;
    const cloned: ProjectDocument = JSON.parse(JSON.stringify(project));
    fn(cloned);

    // Recalculate timeline duration
    const vt = cloned.tracks.find((t) => t.type === "video");
    if (vt) {
      let cur = 0;
      for (const c of vt.clips) {
        c.timeline_start_ticks = cur;
        cur += c.duration_ticks;
      }
      cloned.timeline.duration_ticks = cur;
    }

    setProject(cloned);
    setSaving("dirty");
  };

  // Video playback loop control for trimmed in/out points
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activeClip || !activeAsset) return;

    const inSec = ticksToSeconds(activeClip.source_in_ticks);
    const outSec = ticksToSeconds(activeClip.source_out_ticks);

    v.currentTime = inSec;

    const handleTimeUpdate = () => {
      if (v.currentTime >= outSec) {
        if (isPlaying) {
          v.currentTime = inSec;
          v.play().catch(() => {});
        } else {
          v.pause();
          v.currentTime = inSec;
        }
      }
    };

    v.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      v.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [activeClip?.id, activeClip?.source_in_ticks, activeClip?.source_out_ticks, activeAsset?.id, isPlaying]);

  // Handle Play / Pause toggle
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  // Handle media file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    try {
      const newAssets: Asset[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploaded = await api.uploadMedia(file);
        newAssets.push(uploaded);
      }

      updateProject((d) => {
        d.assets.push(...newAssets);
        // If current active clip has no asset, auto-assign the first uploaded
        const vt = d.tracks.find((t) => t.type === "video");
        if (vt && vt.clips[activeRankIndex] && !vt.clips[activeRankIndex].asset_id) {
          const first = newAssets[0];
          vt.clips[activeRankIndex].asset_id = first.id;
          vt.clips[activeRankIndex].source_in_ticks = 0;
          vt.clips[activeRankIndex].source_out_ticks = first.duration_ticks > 0 ? Math.min(first.duration_ticks, 9000) : 9000;
          vt.clips[activeRankIndex].duration_ticks = vt.clips[activeRankIndex].source_out_ticks;
        }
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  // Assign asset to active clip
  const assignAssetToClip = (clipIdx: number, assetId: string) => {
    updateProject((d) => {
      const vt = d.tracks.find((t) => t.type === "video");
      if (!vt || !vt.clips[clipIdx]) return;
      const targetClip = vt.clips[clipIdx];
      targetClip.asset_id = assetId;

      const asset = d.assets.find((a) => a.id === assetId);
      if (asset && asset.duration_ticks > 0) {
        // Default to first 3-5 seconds or full duration
        const clipDur = Math.min(asset.duration_ticks, 9000);
        targetClip.source_in_ticks = 0;
        targetClip.source_out_ticks = clipDur;
        targetClip.duration_ticks = clipDur;
      }
    });
  };

  // Reorder clips in ranking sequence
  const moveClip = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= clips.length) return;

    updateProject((d) => {
      const vt = d.tracks.find((t) => t.type === "video");
      if (!vt) return;
      const temp = vt.clips[fromIndex];
      vt.clips[fromIndex] = vt.clips[toIndex];
      vt.clips[toIndex] = temp;
    });
    setActiveRankIndex(toIndex);
  };

  // Add a new ranking slot
  const addRankingSlot = () => {
    updateProject((d) => {
      const vt = d.tracks.find((t) => t.type === "video");
      if (!vt) return;
      const nextPos = vt.clips.length + 1;
      const defaultDur = 9000;
      vt.clips.push({
        id: crypto.randomUUID(),
        asset_id: null,
        source_in_ticks: 0,
        source_out_ticks: defaultDur,
        timeline_start_ticks: d.timeline.duration_ticks,
        duration_ticks: defaultDur,
        transform: { x: 0, y: 0, scale: 1, rotation: 0, crop: null, opacity: 1 },
        volume: 1,
        speed: 1,
        fade_in_ticks: 0,
        fade_out_ticks: 0,
        transition_in: null,
        transition_out: null,
        ranking: { position: nextPos, label: "" },
        keyframes: [],
        text: null,
      });
    });
    setActiveRankIndex(clips.length);
  };

  // Remove a ranking slot
  const removeRankingSlot = (idx: number) => {
    if (clips.length <= 1) return;
    updateProject((d) => {
      const vt = d.tracks.find((t) => t.type === "video");
      if (!vt) return;
      vt.clips.splice(idx, 1);
    });
    setActiveRankIndex(Math.max(0, idx - 1));
  };

  if (loading) {
    return <div className="p-12 text-center text-neutral-400">Loading project editor…</div>;
  }

  if (error || !project) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <div className="bg-red-950/60 border border-red-800 text-red-200 p-4 rounded-xl mb-4">
          Failed to load project: {error}
        </div>
        <button
          onClick={onBack}
          className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  // Active rank number and color styling from template
  const activeRankNumber = activeClip?.ranking?.position ?? activeRankIndex + 1;
  const tmplDoc = template?.document;
  const rankColor =
    tmplDoc?.ranking.per_rank_colors[String(activeRankNumber)] ??
    tmplDoc?.ranking.default_color ??
    "#ffffff";
  const labelText = activeClip?.ranking?.label ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      {/* Top Studio Bar */}
      <header className="border-b border-neutral-800 px-5 py-2.5 flex items-center justify-between bg-neutral-900/80 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition flex items-center gap-1"
          >
            ← Projects
          </button>
          <div className="h-4 w-[1px] bg-neutral-700" />
          <input
            type="text"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              setSaving("dirty");
            }}
            onBlur={() => handleSave()}
            className="text-base font-bold bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-blue-500 focus:bg-neutral-900 px-1 py-0.5 rounded outline-none transition text-white w-64 md:w-80 truncate"
          />
          {template && (
            <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 font-medium">
              Template: {template.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-neutral-400 bg-neutral-800/80 px-2.5 py-1 rounded">
            ⏱ {totalDurationSec.toFixed(1)}s Duration
          </div>

          <button
            onClick={() => handleSave()}
            disabled={saving === "saving"}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              saving === "dirty"
                ? "bg-blue-600 hover:bg-blue-500 text-white animate-pulse"
                : saving === "saving"
                ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                : saving === "error"
                ? "bg-red-800 hover:bg-red-700 text-white"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
            }`}
          >
            {saving === "saving" ? "Saving…" : saving === "dirty" ? "● Save Changes" : "✓ Saved"}
          </button>
        </div>
      </header>

      {/* Main Studio 3-Column Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Media Bin & Asset Library */}
        <aside className="w-full lg:w-72 border-r border-neutral-800 bg-neutral-900/40 flex flex-col shrink-0 max-h-[38vh] lg:max-h-none overflow-y-auto">
          <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60 sticky top-0 z-10">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Media Bin
              </h2>
              <span className="text-[10px] text-neutral-500">
                {project.assets.length} uploaded asset(s)
              </span>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium px-2.5 py-1 rounded border border-neutral-700 transition flex items-center gap-1"
            >
              <span>+</span> Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,audio/*,image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </div>

          {/* Drag & Drop Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileUpload(e.dataTransfer.files);
            }}
            className="m-3 p-4 border border-dashed border-neutral-800 hover:border-neutral-600 rounded-xl text-center bg-neutral-950/50 cursor-pointer transition"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="text-xs text-blue-400 animate-pulse font-medium">
                Uploading & probing metadata via FFprobe…
              </div>
            ) : (
              <div>
                <span className="text-xl block mb-1">📁</span>
                <span className="text-xs font-medium text-neutral-300 block">
                  Drag video clips here
                </span>
                <span className="text-[10px] text-neutral-500">or click to browse files</span>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="mx-3 mb-2 p-2 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded">
              Upload error: {uploadError}
            </div>
          )}

          {/* Uploaded Assets List */}
          <div className="flex-1 p-3 space-y-2">
            {project.assets.map((asset) => {
              const durSec = ticksToSeconds(asset.duration_ticks);
              const isAssignedToActive = activeClip?.asset_id === asset.id;

              return (
                <div
                  key={asset.id}
                  className={`p-2.5 rounded-lg border transition text-xs flex flex-col gap-1.5 ${
                    isAssignedToActive
                      ? "bg-blue-950/30 border-blue-500/50"
                      : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-neutral-200 truncate" title={asset.original_name}>
                        {asset.original_name}
                      </div>
                      <div className="text-[10px] text-neutral-500 flex items-center gap-2 mt-0.5">
                        <span className="uppercase text-[9px] bg-neutral-800 px-1 rounded font-bold text-neutral-400">
                          {asset.kind}
                        </span>
                        {asset.width && asset.height && (
                          <span>{asset.width}×{asset.height}</span>
                        )}
                        <span>{durSec > 0 ? `${durSec.toFixed(1)}s` : ""}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                    <button
                      onClick={() => assignAssetToClip(activeRankIndex, asset.id)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded transition ${
                        isAssignedToActive
                          ? "bg-blue-600 text-white"
                          : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      }`}
                    >
                      {isAssignedToActive ? "✓ Assigned to Rank" : "Assign to Current Rank"}
                    </button>
                    <button
                      title="Remove asset"
                      onClick={() => {
                        updateProject((d) => {
                          d.assets = d.assets.filter((a) => a.id !== asset.id);
                          const vt = d.tracks.find((t) => t.type === "video");
                          vt?.clips.forEach((c) => {
                            if (c.asset_id === asset.id) c.asset_id = null;
                          });
                        });
                      }}
                      className="text-neutral-500 hover:text-red-400 px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center Column: Live Video Canvas Preview & Controls */}
        <section className="flex-1 flex flex-col items-center justify-between p-4 bg-neutral-950 overflow-y-auto">
          {/* Controls Bar above player */}
          <div className="w-full max-w-[320px] flex items-center justify-between mb-2 text-xs">
            <span className="text-neutral-400 font-medium">
              Rank #{activeRankNumber} of {clips.length}
            </span>
            <button
              onClick={() => setShowSafeZones(!showSafeZones)}
              className={`text-[11px] px-2 py-0.5 rounded border transition ${
                showSafeZones
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
              }`}
            >
              {showSafeZones ? "✓ Safe Zones: ON" : "Safe Zones Guide"}
            </button>
          </div>

          {/* 9:16 Vertical Video Canvas */}
          <div className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-2xl border border-neutral-800 select-none">
            {/* Background Video Playback Element */}
            {activeAsset ? (
              <video
                ref={videoRef}
                src={api.getMediaUrl(activeAsset.storage_key)}
                className="w-full h-full object-cover"
                playsInline
                muted={activeClip?.volume === 0}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-neutral-900 to-black">
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500 text-xl mb-3">
                  📹
                </div>
                <h4 className="text-sm font-semibold text-neutral-300 mb-1">
                  Rank #{activeRankNumber} — No Clip
                </h4>
                <p className="text-[11px] text-neutral-500 mb-3">
                  Select a video from the Media Bin on the left to assign it to this ranking slot.
                </p>
              </div>
            )}

            {/* Template Header Overlay */}
            {tmplDoc?.header.enabled && (
              <div
                className="absolute left-0 right-0 top-0 flex flex-col justify-center pointer-events-none"
                style={{
                  height: `${tmplDoc.header.height_pct}%`,
                  background: tmplDoc.header.background_color,
                  padding: `${tmplDoc.header.padding_px / 6}px`,
                  borderRadius: `0 0 ${tmplDoc.header.corner_radius_px / 4}px ${tmplDoc.header.corner_radius_px / 4}px`,
                }}
              >
                <div
                  style={{
                    textAlign: tmplDoc.header.text_align,
                    fontFamily: tmplDoc.header.font_family,
                    fontSize: `${tmplDoc.header.font_size_px / 4.8}px`,
                    fontWeight: tmplDoc.header.font_weight,
                    color: tmplDoc.header.text_color,
                    letterSpacing: `${tmplDoc.header.letter_spacing_px / 3}px`,
                    lineHeight: tmplDoc.header.line_height,
                  }}
                >
                  <div>{tmplDoc.header.title}</div>
                  {tmplDoc.header.subtitle && (
                    <div className="text-[10px] opacity-80 font-normal">
                      {tmplDoc.header.subtitle}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Big Ranking Number Overlay */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${(tmplDoc?.header.height_pct ?? 18) + 3}%`,
                left: "5%",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontFamily: tmplDoc?.ranking.font_family ?? "Inter",
                    fontSize: `${(tmplDoc?.ranking.font_size_px ?? 140) / 3.4}px`,
                    fontWeight: tmplDoc?.ranking.bold ? 900 : 700,
                    color: rankColor,
                    WebkitTextStroke: `${(tmplDoc?.ranking.outline_width_px ?? 6) / 5}px ${
                      tmplDoc?.ranking.outline_color ?? "#000"
                    }`,
                    textShadow: `0 3px 10px ${tmplDoc?.ranking.shadow.color ?? "#000"}`,
                    padding:
                      tmplDoc?.ranking.badge.shape !== "none"
                        ? `${(tmplDoc?.ranking.badge.padding_px ?? 20) / 6}px`
                        : "0px",
                    borderRadius:
                      tmplDoc?.ranking.badge.shape === "circle"
                        ? "9999px"
                        : tmplDoc?.ranking.badge.shape === "rounded"
                        ? "12px"
                        : "0px",
                    background:
                      tmplDoc?.ranking.badge.shape !== "none"
                        ? tmplDoc?.ranking.badge.background_color
                        : "transparent",
                    display: "inline-block",
                    minWidth: "44px",
                    textAlign: "center",
                  }}
                >
                  {activeRankNumber}
                </span>
              </div>

              {/* Clip Label Overlay */}
              {labelText && (
                <div
                  className="mt-2 px-2.5 py-1 rounded shadow-lg backdrop-blur-sm max-w-[220px]"
                  style={{
                    fontFamily: tmplDoc?.labels.font_family ?? "Inter",
                    fontSize: `${(tmplDoc?.labels.font_size_px ?? 38) / 4.5}px`,
                    color: tmplDoc?.labels.color ?? "#ffffff",
                    background: tmplDoc?.labels.background_color ?? "rgba(0,0,0,0.75)",
                  }}
                >
                  {labelText}
                </div>
              )}
            </div>

            {/* Watermark Overlay */}
            {tmplDoc?.branding.watermark_text && (
              <div
                className="absolute bottom-3 right-3 text-[10px] text-white/70 font-bold pointer-events-none tracking-wide"
                style={{ opacity: tmplDoc.branding.opacity }}
              >
                {tmplDoc.branding.watermark_text}
              </div>
            )}

            {/* Safe Zone Overlay (Shorts / TikTok / Reels UI Guides) */}
            {showSafeZones && (
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-amber-400/60 z-30 flex flex-col justify-between p-3 text-[9px] font-mono text-amber-300">
                <div className="bg-amber-950/80 p-1 rounded border border-amber-500/40 text-center">
                  Top Safe Zone (Avoid UI Title & Search)
                </div>
                <div className="flex justify-between items-center px-1">
                  <div className="bg-amber-950/80 px-1 rounded">Left Margin</div>
                  <div className="bg-amber-950/80 px-1 rounded">Right UI Icons</div>
                </div>
                <div className="bg-amber-950/80 p-1 rounded border border-amber-500/40 text-center">
                  Bottom Safe Zone (Captions, Audio & Likes)
                </div>
              </div>
            )}
          </div>

          {/* Video Player Controls Bar */}
          <div className="w-full max-w-[320px] mt-3 flex items-center justify-between gap-2 bg-neutral-900 border border-neutral-800 p-2 rounded-xl text-xs">
            <button
              onClick={() => setActiveRankIndex(Math.max(0, activeRankIndex - 1))}
              disabled={activeRankIndex === 0}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 rounded"
              title="Previous rank"
            >
              ⏮
            </button>

            <button
              onClick={togglePlay}
              disabled={!activeAsset}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-4 py-1 rounded transition"
            >
              {isPlaying ? "❚❚ Pause" : "▶ Play Rank"}
            </button>

            <button
              onClick={() =>
                setActiveRankIndex(Math.min(clips.length - 1, activeRankIndex + 1))
              }
              disabled={activeRankIndex === clips.length - 1}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 rounded"
              title="Next rank"
            >
              ⏭
            </button>
          </div>
        </section>

        {/* Right Column: Active Rank Properties & Trim Controls */}
        <aside className="w-full lg:w-80 border-l border-neutral-800 bg-neutral-900/40 flex flex-col shrink-0 p-4 overflow-y-auto">
          <div className="mb-4 pb-3 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Rank #{activeRankNumber} Settings
              </h2>
              <span className="text-[11px] text-neutral-500">
                Trim points & clip parameters
              </span>
            </div>
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]"
              style={{ background: rankColor, color: rankColor === "#ffffff" ? "#000" : "#fff" }}
            >
              {activeRankNumber}
            </span>
          </div>

          {activeClip ? (
            <div className="space-y-4 text-xs">
              {/* Assigned Clip Info */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Source Footage
                </label>
                {activeAsset ? (
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 flex items-center justify-between">
                    <span className="font-medium text-white truncate max-w-[170px]">
                      {activeAsset.original_name}
                    </span>
                    <button
                      onClick={() =>
                        updateProject((d) => {
                          const vt = d.tracks.find((t) => t.type === "video");
                          if (vt && vt.clips[activeRankIndex]) {
                            vt.clips[activeRankIndex].asset_id = null;
                          }
                        })
                      }
                      className="text-neutral-500 hover:text-red-400 text-[11px]"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-950/30 border border-amber-800/60 text-amber-300 p-2.5 rounded-lg text-center">
                    No clip assigned yet. Select one from Media Bin.
                  </div>
                )}
              </div>

              {/* Label text input */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Rank Label / Caption
                </label>
                <input
                  type="text"
                  value={labelText}
                  onChange={(e) =>
                    updateProject((d) => {
                      const vt = d.tracks.find((t) => t.type === "video");
                      if (vt && vt.clips[activeRankIndex]) {
                        if (!vt.clips[activeRankIndex].ranking) {
                          vt.clips[activeRankIndex].ranking = {
                            position: activeRankNumber,
                            label: "",
                          };
                        }
                        vt.clips[activeRankIndex].ranking!.label = e.target.value;
                      }
                    })
                  }
                  placeholder="e.g. Impossible trick shot 🎯"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                />
              </div>

              {/* Trimming: Source In & Source Out Points */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-300">Clip Trimming (In/Out)</span>
                  <span className="font-mono text-blue-400">
                    {ticksToSeconds(activeClip.duration_ticks).toFixed(1)}s
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Source Start (In-point):</span>
                    <span className="font-mono">
                      {ticksToSeconds(activeClip.source_in_ticks).toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={
                      activeAsset && activeAsset.duration_ticks > 0
                        ? ticksToSeconds(activeAsset.duration_ticks)
                        : 30
                    }
                    step={0.1}
                    value={ticksToSeconds(activeClip.source_in_ticks)}
                    onChange={(e) => {
                      const newInSec = Number(e.target.value);
                      const curOutSec = ticksToSeconds(activeClip.source_out_ticks);
                      const validOut = Math.max(newInSec + 0.5, curOutSec);
                      updateProject((d) => {
                        const vt = d.tracks.find((t) => t.type === "video");
                        if (!vt || !vt.clips[activeRankIndex]) return;
                        vt.clips[activeRankIndex].source_in_ticks = secondsToTicks(newInSec);
                        vt.clips[activeRankIndex].source_out_ticks = secondsToTicks(validOut);
                        vt.clips[activeRankIndex].duration_ticks = secondsToTicks(
                          validOut - newInSec
                        );
                      });
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Source End (Out-point):</span>
                    <span className="font-mono">
                      {ticksToSeconds(activeClip.source_out_ticks).toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={ticksToSeconds(activeClip.source_in_ticks) + 0.5}
                    max={
                      activeAsset && activeAsset.duration_ticks > 0
                        ? ticksToSeconds(activeAsset.duration_ticks)
                        : 60
                    }
                    step={0.1}
                    value={ticksToSeconds(activeClip.source_out_ticks)}
                    onChange={(e) => {
                      const newOutSec = Number(e.target.value);
                      const inSec = ticksToSeconds(activeClip.source_in_ticks);
                      updateProject((d) => {
                        const vt = d.tracks.find((t) => t.type === "video");
                        if (!vt || !vt.clips[activeRankIndex]) return;
                        vt.clips[activeRankIndex].source_out_ticks = secondsToTicks(newOutSec);
                        vt.clips[activeRankIndex].duration_ticks = secondsToTicks(
                          newOutSec - inSec
                        );
                      });
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Volume & Audio Controls */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-300">Clip Audio</span>
                  <button
                    onClick={() =>
                      updateProject((d) => {
                        const vt = d.tracks.find((t) => t.type === "video");
                        if (!vt || !vt.clips[activeRankIndex]) return;
                        vt.clips[activeRankIndex].volume =
                          vt.clips[activeRankIndex].volume === 0 ? 1 : 0;
                      })
                    }
                    className={`text-[11px] px-2 py-0.5 rounded ${
                      activeClip.volume === 0
                        ? "bg-red-950 text-red-300 border border-red-800"
                        : "bg-neutral-800 text-neutral-300"
                    }`}
                  >
                    {activeClip.volume === 0 ? "🔇 Muted" : "🔊 Sound On"}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={activeClip.volume}
                  onChange={(e) =>
                    updateProject((d) => {
                      const vt = d.tracks.find((t) => t.type === "video");
                      if (!vt || !vt.clips[activeRankIndex]) return;
                      vt.clips[activeRankIndex].volume = Number(e.target.value);
                    })
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Slot Actions */}
              <div className="pt-2 flex items-center justify-between text-neutral-400">
                <button
                  onClick={() => removeRankingSlot(activeRankIndex)}
                  className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                >
                  ✕ Delete Rank Slot
                </button>
              </div>
            </div>
          ) : (
            <div className="text-neutral-500 text-center py-8">Select a rank slot below</div>
          )}
        </aside>
      </div>

      {/* Bottom Sequence Editor: Ranking Sequence Timeline (Milestone 4) */}
      <footer className="border-t border-neutral-800 bg-neutral-900/95 p-3 shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Ranking Sequence
              </span>
              <span className="text-[11px] text-neutral-500">
                ({clips.length} ranks · click to edit & trim · reorder with ▲ ▼)
              </span>
            </div>

            <button
              onClick={addRankingSlot}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium px-3 py-1 rounded border border-neutral-700 transition"
            >
              + Add Rank Slot
            </button>
          </div>

          {/* Horizontal Ranking Sequence Cards */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            {clips.map((clip, idx) => {
              const pos = clip.ranking?.position ?? idx + 1;
              const isSelected = idx === activeRankIndex;
              const asset = project.assets.find((a) => a.id === clip.asset_id);
              const durSec = ticksToSeconds(clip.duration_ticks);
              const cColor =
                tmplDoc?.ranking.per_rank_colors[String(pos)] ??
                tmplDoc?.ranking.default_color ??
                "#ffffff";

              return (
                <div
                  key={clip.id}
                  onClick={() => setActiveRankIndex(idx)}
                  className={`min-w-[180px] max-w-[200px] rounded-xl border p-2.5 cursor-pointer transition select-none flex flex-col justify-between shrink-0 ${
                    isSelected
                      ? "bg-neutral-850 border-blue-500 ring-2 ring-blue-500/30"
                      : "bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center font-extrabold text-xs shadow"
                        style={{
                          background: cColor,
                          color: cColor === "#ffffff" ? "#000" : "#fff",
                        }}
                      >
                        {pos}
                      </span>
                      <span className="text-xs font-bold text-neutral-200 truncate">
                        Rank #{pos}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        title="Move left/up"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveClip(idx, "up");
                        }}
                        disabled={idx === 0}
                        className="px-1 text-[11px] text-neutral-400 hover:text-white disabled:opacity-30"
                      >
                        ◀
                      </button>
                      <button
                        title="Move right/down"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveClip(idx, "down");
                        }}
                        disabled={idx === clips.length - 1}
                        className="px-1 text-[11px] text-neutral-400 hover:text-white disabled:opacity-30"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  {/* Clip Footage thumbnail or placeholder */}
                  <div className="aspect-video w-full rounded-lg bg-neutral-900 overflow-hidden mb-2 relative flex items-center justify-center border border-neutral-800/80">
                    {asset ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-800/50 p-1">
                        <span className="text-[10px] text-neutral-300 font-medium truncate w-full text-center">
                          {asset.original_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-400/80">Unassigned</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-mono">{durSec.toFixed(1)}s</span>
                    <span className="truncate max-w-[100px] text-neutral-500">
                      {clip.ranking?.label || "No label"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
