import { useCallback, useEffect, useState } from "react";
import { api, type TemplateRecord } from "../../api/client";
import { defaultTemplate } from "../../types/template";

export function TemplateLibrary({ onOpen }: { onOpen: (id: string) => void }) {
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
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Template Library</h1>
        <button onClick={createTemplate}
                className="bg-neutral-100 text-neutral-900 text-sm font-semibold px-4 py-2 rounded hover:bg-white">
          + New template
        </button>
      </div>

      {error && (
        <div className="mb-4 border border-red-900 bg-red-950/50 text-red-300 text-sm rounded p-3">
          Backend unreachable: {error}. Start the API with <code>uvicorn app.main:app --reload</code>.
        </div>
      )}

      {templates === null && <p className="text-neutral-500 text-sm">Loading…</p>}
      {templates?.length === 0 && !error && (
        <div className="border border-dashed border-neutral-700 rounded-lg p-10 text-center text-neutral-500 text-sm">
          No templates yet. Create your first ranking template to get started.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.map((t) => (
          <div key={t.id} className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/60">
            {/* Miniature preview: header + first ranks */}
            <button className="w-full block text-left" onClick={() => onOpen(t.id)}>
              <div className="aspect-[9/16] max-h-56 w-full relative bg-neutral-950 p-3 flex flex-col">
                <div className="rounded px-2 py-1.5 text-center"
                     style={{
                       background: t.document.header.background_color,
                       color: t.document.header.text_color,
                       fontFamily: t.document.header.font_family,
                     }}>
                  <div className="font-extrabold leading-tight" style={{ fontSize: 13 }}>
                    {t.document.header.title || "—"}
                  </div>
                  {t.document.header.subtitle && (
                    <div className="text-[9px] opacity-80">{t.document.header.subtitle}</div>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="font-extrabold"
                        style={{
                          color: t.document.ranking.per_rank_colors["1"] ?? t.document.ranking.default_color,
                          fontFamily: t.document.ranking.font_family,
                          fontSize: 40,
                          textShadow: `0 ${t.document.ranking.shadow.offset_px / 6}px ${t.document.ranking.shadow.blur_px / 4}px ${t.document.ranking.shadow.color}`,
                        }}>1</span>
                </div>
              </div>
            </button>
            <div className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {t.name} {t.isDefault && <span className="text-[10px] text-neutral-500">(default)</span>}
                </div>
                <div className="text-[11px] text-neutral-600">
                  {t.document.ranking.count} ranks · {t.document.canvas.width}×{t.document.canvas.height}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button title="Duplicate" onClick={async () => { await api.duplicateTemplate(t.id); await reload(); }}
                        className="text-xs px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800">⧉</button>
                {confirmDelete === t.id ? (
                  <>
                    <button onClick={() => remove(t.id)}
                            className="text-xs px-2 py-1 rounded bg-red-900 text-red-100">Confirm</button>
                    <button onClick={() => setConfirmDelete(null)}
                            className="text-xs px-2 py-1 rounded border border-neutral-700">Cancel</button>
                  </>
                ) : (
                  <button title="Delete" onClick={() => setConfirmDelete(t.id)}
                          className="text-xs px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800">✕</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
