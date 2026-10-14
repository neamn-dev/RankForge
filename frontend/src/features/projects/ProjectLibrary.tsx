import { useCallback, useEffect, useState } from "react";
import { api, type TemplateRecord } from "../../api/client";
import type { ProjectRecord } from "../../types/project";
import { ticksToSeconds } from "../../types/project";

export function ProjectLibrary({
  onOpenProject,
  onNavigateTemplates,
}: {
  onOpenProject: (id: string) => void;
  onNavigateTemplates: () => void;
}) {
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [projList, tmplList] = await Promise.all([
        api.listProjects(),
        api.listTemplates(),
      ]);
      setProjects(projList);
      setTemplates(tmplList);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleCreateFromTemplate(templateId: string) {
    setCreating(true);
    try {
      const res = await api.createProjectFromTemplate(templateId);
      setShowCreateModal(false);
      onOpenProject(res.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      await api.duplicateProject(id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteProject(id);
      setConfirmDelete(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleRenameSubmit(id: string) {
    if (!renameText.trim()) return;
    try {
      await api.renameProject(id, renameText.trim());
      setRenameId(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Video Projects</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Assemble, trim, reorder ranking videos, and preview real-time edits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-2"
          >
            <span>+</span> Create New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 border border-red-900 bg-red-950/60 text-red-300 text-sm rounded-lg p-3">
          Error: {error}
        </div>
      )}

      {projects === null && (
        <div className="py-12 text-center text-neutral-500 text-sm">Loading projects…</div>
      )}

      {projects?.length === 0 && !error && (
        <div className="border border-dashed border-neutral-800 rounded-xl p-12 text-center bg-neutral-900/30">
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-400 text-xl">
            🎬
          </div>
          <h3 className="text-base font-semibold text-white mb-1">No ranking projects yet</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-5">
            Pick a ranking template (Classic Countdown, Cat Moments, Bruh Moments, etc.) to start editing your video.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Create from Template
          </button>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const videoTrack = p.document.tracks.find((t) => t.type === "video");
            const clipCount = videoTrack?.clips.length ?? 0;
            const assignedCount = videoTrack?.clips.filter((c) => Boolean(c.asset_id)).length ?? 0;
            const durationSec = ticksToSeconds(p.document.timeline.duration_ticks);
            const template = templates.find((t) => t.id === p.templateId);

            return (
              <div
                key={p.id}
                className="border border-neutral-800 hover:border-neutral-700 bg-neutral-900/60 rounded-xl overflow-hidden flex flex-col transition group"
              >
                {/* Project Header Thumbnail Card */}
                <div
                  onClick={() => onOpenProject(p.id)}
                  className="cursor-pointer bg-gradient-to-br from-neutral-800 to-neutral-950 p-4 border-b border-neutral-800/80 relative flex flex-col justify-between h-36"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {template?.name ?? "Custom Template"}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400 bg-neutral-900/80 px-2 py-0.5 rounded">
                      {durationSec.toFixed(1)}s total
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition truncate">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
                      <span>{clipCount} ranking slots</span>
                      <span>•</span>
                      <span className={assignedCount > 0 ? "text-emerald-400" : "text-amber-400"}>
                        {assignedCount}/{clipCount} clips assigned
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Controls */}
                <div className="p-3 bg-neutral-900/90 flex items-center justify-between text-xs border-t border-neutral-800/60">
                  {renameId === p.id ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-white flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameSubmit(p.id)}
                        className="bg-blue-600 px-2 py-1 rounded text-white font-medium text-[11px]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRenameId(null)}
                        className="border border-neutral-700 px-2 py-1 rounded text-neutral-400 text-[11px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onOpenProject(p.id)}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium px-3 py-1 rounded transition text-xs"
                      >
                        Open Editor →
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          title="Rename project"
                          onClick={() => {
                            setRenameId(p.id);
                            setRenameText(p.name);
                          }}
                          className="px-2 py-1 rounded border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white"
                        >
                          ✎
                        </button>
                        <button
                          title="Duplicate project"
                          onClick={() => handleDuplicate(p.id)}
                          className="px-2 py-1 rounded border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white"
                        >
                          ⧉
                        </button>
                        {confirmDelete === p.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="px-2 py-1 rounded bg-red-900/80 hover:bg-red-800 text-red-100 text-[11px]"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 rounded border border-neutral-800 text-neutral-400 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            title="Delete project"
                            onClick={() => setConfirmDelete(p.id)}
                            className="px-2 py-1 rounded border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Create New Video Project</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Choose a starter template for your ranking video
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-500 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1 my-4">
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => !creating && handleCreateFromTemplate(t.id)}
                  className="cursor-pointer border border-neutral-800 hover:border-blue-500/80 bg-neutral-950 p-4 rounded-xl flex flex-col justify-between transition hover:bg-neutral-900/50 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white group-hover:text-blue-400">
                        {t.name}
                      </span>
                      {t.isDefault && (
                        <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div
                      className="rounded p-2 text-center text-xs font-bold mb-2 truncate"
                      style={{
                        background: t.document.header.background_color,
                        color: t.document.header.text_color,
                      }}
                    >
                      {t.document.header.title}
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      {t.document.ranking.count} Ranks • {t.document.ranking.order} • {t.document.canvas.width}×{t.document.canvas.height}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-neutral-800 flex justify-end">
                    <span className="text-xs font-medium text-blue-400 group-hover:underline">
                      Use this template →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
              <button
                onClick={onNavigateTemplates}
                className="text-xs text-neutral-400 hover:text-neutral-200 underline"
              >
                Manage / customize templates in Studio
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
