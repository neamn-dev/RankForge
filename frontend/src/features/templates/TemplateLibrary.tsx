import { useCallback, useEffect, useState } from "react";
import { api, type TemplateRecord } from "../../api/client";
import { defaultTemplate } from "../../types/template";

export function TemplateLibrary({
  onOpen,
  onCreateProject,
}: {
  onOpen: (id: string) => void;
  onCreateProject?: (templateId: string) => void;
}) {
  const [templates, setTemplates] = useState<TemplateRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setTemplates(await api.listTemplates());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTemplates([]);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function createTemplate() {
    const doc = defaultTemplate(`Template ${(templates?.length ?? 0) + 1}`);
    const { id } = await api.createTemplate(doc);
    await reload();
    onOpen(id);
  }

  async function remove(id: string) {
    await api.deleteTemplate(id);
    setConfirmDelete(null);
    await reload();
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Template Library</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Visual starting designs for vertical countdowns and ranking compilations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await api.seedStarterTemplates();
              await reload();
            }}
            className="text-xs px-3 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition"
          >
            ⚡ Reload Starters
          </button>
          <button
            onClick={createTemplate}
            className="bg-neutral-100 text-neutral-900 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white transition"
          >
            + New Template
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 border border-red-900 bg-red-950/50 text-red-300 text-sm rounded-lg p-3">
          Backend error: {error}
        </div>
      )}

      {templates === null && <p className="text-neutral-500 text-sm">Loading…</p>}
      {templates?.length === 0 && !error && (
        <div className="border border-dashed border-neutral-700 rounded-xl p-10 text-center text-neutral-500 text-sm">
          No templates found. Click "Reload Starters" to restore the 6 starter templates.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates?.map((t) => (
          <div
            key={t.id}
            className="border border-neutral-800 hover:border-neutral-700 rounded-xl overflow-hidden bg-neutral-900/60 flex flex-col justify-between transition group shadow-sm"
          >
            {/* Miniature preview: header + first ranks */}
            <button className="w-full block text-left" onClick={() => onOpen(t.id)}>
              <div className="aspect-[9/16] max-h-56 w-full relative bg-neutral-950 p-3 flex flex-col justify-between">
                <div
                  className="rounded px-2.5 py-1.5 text-center shadow"
                  style={{
                    background: t.document.header.background_color,
                    color: t.document.header.text_color,
                    fontFamily: t.document.header.font_family,
                  }}
                >
                  <div className="font-extrabold leading-tight text-xs">
                    {t.document.header.title || "—"}
                  </div>
                  {t.document.header.subtitle && (
                    <div className="text-[9px] opacity-80 mt-0.5">{t.document.header.subtitle}</div>
                  )}
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <span
                    className="font-black"
                    style={{
                      color: t.document.ranking.per_rank_colors["1"] ?? t.document.ranking.default_color,
                      fontFamily: t.document.ranking.font_family,
                      fontSize: 44,
                      textShadow: `0 ${t.document.ranking.shadow.offset_px / 6}px ${t.document.ranking.shadow.blur_px / 4}px ${t.document.ranking.shadow.color}`,
                    }}
                  >
                    1
                  </span>
                </div>

                <div className="text-[10px] text-neutral-500 text-center">
                  Click to edit design in Studio →
                </div>
              </div>
            </button>

            <div className="p-3 bg-neutral-900/80 border-t border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate text-white">
                    {t.name} {t.isDefault && <span className="text-[10px] text-blue-400 font-normal">(default)</span>}
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {t.document.ranking.count} ranks · {t.document.canvas.width}×{t.document.canvas.height}
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  <button
                    title="Duplicate"
                    onClick={async () => {
                      await api.duplicateTemplate(t.id);
                      await reload();
                    }}
                    className="text-xs px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800 text-neutral-300"
                  >
                    ⧉
                  </button>
                  {confirmDelete === t.id ? (
                    <>
                      <button
                        onClick={() => remove(t.id)}
                        className="text-xs px-2 py-1 rounded bg-red-900 text-red-100"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs px-2 py-1 rounded border border-neutral-700 text-neutral-400"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      title="Delete"
                      onClick={() => setConfirmDelete(t.id)}
                      className="text-xs px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {onCreateProject && (
                <button
                  onClick={() => onCreateProject(t.id)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-1.5 rounded-lg transition text-center"
                >
                  Create Video Project →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

