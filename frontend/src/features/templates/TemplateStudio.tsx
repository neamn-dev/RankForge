import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import type { TemplateDocument } from "../../types/template";
import { TemplatePreview } from "./TemplatePreview";
import { ColorInput, Field, NumberInput, Select, TextInput, Toggle } from "../../components/controls";

type Tab = "header" | "ranking" | "labels" | "branding";

export function TemplateStudio({ templateId, onBack }: { templateId: string; onBack: () => void }) {
  const [doc, setDoc] = useState<TemplateDocument | null>(null);
  const [rank, setRank] = useState(1);
  const [tab, setTab] = useState<Tab>("header");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getTemplate(templateId)
      .then((r) => { setDoc(r.document); setRank(r.document.ranking.order === "descending" ? r.document.ranking.count : 1); setStatus("ready"); })
      .catch((e) => { setError(String(e)); setStatus("error"); });
  }, [templateId]);

  // Persist-on-save (explicit). Autosave lands in Phase 6.
  const save = useCallback(async () => {
    if (!doc) return;
    setSaveState("saving");
    try {
      await api.updateTemplate(templateId, doc);
      setSaveState("saved");
    } catch (e) {
      setError(String(e));
      setSaveState("error");
    }
  }, [doc, templateId]);

  const update = useCallback((fn: (d: TemplateDocument) => void) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setSaveState("dirty");
  }, []);

  if (status === "loading") return <main className="p-6 text-neutral-500 text-sm">Loading template…</main>;
  if (status === "error" || !doc) return (
    <main className="p-6">
      <button onClick={onBack} className="text-sm text-neutral-400 hover:text-white">← Back</button>
      <p className="text-red-400 mt-4 text-sm">Failed to load template: {error}</p>
    </main>
  );

  const tabs: [Tab, string][] = [["header", "Header"], ["ranking", "Ranking"], ["labels", "Labels"], ["branding", "Branding"]];

  return (
    <main className="flex flex-col h-[calc(100vh-57px)]">
      <div className="flex items-center gap-3 px-6 py-2 border-b border-neutral-800">
        <button onClick={onBack} className="text-sm text-neutral-400 hover:text-white">← Library</button>
        <input value={doc.name} onChange={(e) => update((d) => { d.name = e.target.value; })}
               className="bg-transparent font-semibold focus:outline-none border-b border-transparent focus:border-neutral-600" />
        <span className="text-xs text-neutral-600">
          {saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved changes" : saveState === "error" ? "Save failed" : "Saved"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={async () => { await api.duplicateTemplate(templateId); onBack(); }}
                  className="text-xs px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800">Duplicate</button>
          <button onClick={async () => { await api.resetTemplate(templateId); location.reload(); }}
                  className="text-xs px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800">Reset</button>
          <button onClick={save} disabled={saveState === "saved"}
                  className="text-xs px-4 py-1.5 rounded bg-neutral-100 text-neutral-900 font-semibold disabled:opacity-40 hover:bg-white">
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: panels */}
        <div className="w-80 border-r border-neutral-800 flex flex-col">
          <div className="flex border-b border-neutral-800">
            {tabs.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                      className={`flex-1 py-2 text-xs font-medium ${tab === id ? "text-white border-b-2 border-white" : "text-neutral-500 hover:text-neutral-300"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === "header" && <HeaderPanel doc={doc} update={update} />}
            {tab === "ranking" && <RankingPanel doc={doc} update={update} />}
            {tab === "labels" && <LabelsPanel doc={doc} update={update} rank={rank} />}
            {tab === "branding" && <BrandingPanel doc={doc} update={update} />}
          </div>
        </div>

        {/* Center: preview */}
        <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 p-6 gap-4 min-w-0">
          <div className="flex items-center gap-3">
            <label className="text-xs text-neutral-500">Preview rank</label>
            <input type="range" min={1} max={doc.ranking.count} value={rank}
                   onChange={(e) => setRank(Number(e.target.value))} className="accent-neutral-100" />
            <span className="text-sm font-bold w-8 text-center">{rank}</span>
          </div>
          <TemplatePreview doc={doc} sampleRank={rank} />
          <p className="text-[11px] text-neutral-600 max-w-xs text-center">
            CSS approximation of the final render. FFmpeg export semantics are defined in docs/SCHEMAS.md (Phase 5).
          </p>
        </div>
      </div>
    </main>
  );
}

type PanelProps = { doc: TemplateDocument; update: (fn: (d: TemplateDocument) => void) => void };

function HeaderPanel({ doc, update }: PanelProps) {
  const h = doc.header;
  return (
    <>
      <Toggle checked={h.enabled} onChange={(v) => update((d) => { d.header.enabled = v; })} label="Show header" />
      <Field label="Title"><TextInput value={h.title} onChange={(e) => update((d) => { d.header.title = e.target.value; })} /></Field>
      <Field label="Subtitle"><TextInput value={h.subtitle} onChange={(e) => update((d) => { d.header.subtitle = e.target.value; })} /></Field>
      <Field label="Background color"><ColorInput value={h.background_color} onChange={(v) => update((d) => { d.header.background_color = v; })} /></Field>
      <Field label="Height (%)"><NumberInput value={h.height_pct} min={1} max={60} step={0.5}
        onChange={(e) => update((d) => { d.header.height_pct = Number(e.target.value); })} /></Field>
      <Field label="Padding (px)"><NumberInput value={h.padding_px} min={0}
        onChange={(e) => update((d) => { d.header.padding_px = Number(e.target.value); })} /></Field>
      <Field label="Text align">
        <Select value={h.text_align} onChange={(v) => update((d) => { d.header.text_align = v as typeof h.text_align; })}
                options={[["left", "Left"], ["center", "Center"], ["right", "Right"]]} />
      </Field>
      <Field label="Font"><TextInput value={h.font_family} onChange={(e) => update((d) => { d.header.font_family = e.target.value; })} /></Field>
      <Field label="Font size (px)"><NumberInput value={h.font_size_px} min={8}
        onChange={(e) => update((d) => { d.header.font_size_px = Number(e.target.value); })} /></Field>
      <Field label="Font weight"><NumberInput value={h.font_weight} min={100} max={900} step={100}
        onChange={(e) => update((d) => { d.header.font_weight = Number(e.target.value); })} /></Field>
      <Field label="Letter spacing (px)"><NumberInput value={h.letter_spacing_px} min={0}
        onChange={(e) => update((d) => { d.header.letter_spacing_px = Number(e.target.value); })} /></Field>
      <Field label="Line height"><NumberInput value={h.line_height} min={0.5} step={0.1}
        onChange={(e) => update((d) => { d.header.line_height = Number(e.target.value); })} /></Field>
      <Field label="Text color"><ColorInput value={h.text_color} onChange={(v) => update((d) => { d.header.text_color = v; })} /></Field>
      <Field label="Highlighted words (comma-separated)">
        <TextInput value={h.highlighted_words.join(", ")}
          onChange={(e) => update((d) => {
            d.header.highlighted_words = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
          })} />
      </Field>
      {h.highlighted_words.length > 0 && (
        <Field label="Highlight color"><ColorInput value={h.highlight_color} onChange={(v) => update((d) => { d.header.highlight_color = v; })} /></Field>
      )}
      <Field label="Corner radius (px)"><NumberInput value={h.corner_radius_px} min={0}
        onChange={(e) => update((d) => { d.header.corner_radius_px = Number(e.target.value); })} /></Field>
    </>
  );
}

function RankingPanel({ doc, update }: PanelProps) {
  const r = doc.ranking;
  return (
    <>
      <Field label="Ranking count"><NumberInput value={r.count} min={1} max={100}
        onChange={(e) => update((d) => { d.ranking.count = Number(e.target.value); })} /></Field>
      <Field label="Order">
        <Select value={r.order} onChange={(v) => update((d) => { d.ranking.order = v as typeof r.order; })}
                options={[["descending", "Descending (10 → 1)"], ["ascending", "Ascending (1 → 10)"]]} />
      </Field>
      <Field label="Default number color"><ColorInput value={r.default_color} onChange={(v) => update((d) => { d.ranking.default_color = v; })} /></Field>
      <PerRankColors doc={doc} update={update} />
      <Field label="Font"><TextInput value={r.font_family} onChange={(e) => update((d) => { d.ranking.font_family = e.target.value; })} /></Field>
      <Field label="Font size (px)"><NumberInput value={r.font_size_px} min={8}
        onChange={(e) => update((d) => { d.ranking.font_size_px = Number(e.target.value); })} /></Field>
      <Toggle checked={r.bold} onChange={(v) => update((d) => { d.ranking.bold = v; })} label="Bold" />
      <Field label="Outline color"><ColorInput value={r.outline_color} onChange={(v) => update((d) => { d.ranking.outline_color = v; })} /></Field>
      <Field label="Outline width (px)"><NumberInput value={r.outline_width_px} min={0}
        onChange={(e) => update((d) => { d.ranking.outline_width_px = Number(e.target.value); })} /></Field>
      <Field label="Badge shape">
        <Select value={r.badge.shape} onChange={(v) => update((d) => { d.ranking.badge.shape = v as typeof r.badge.shape; })}
                options={[["none", "None"], ["circle", "Circle"], ["rounded", "Rounded"], ["square", "Square"]]} />
      </Field>
      {r.badge.shape !== "none" && (
        <>
          <Field label="Badge color"><ColorInput value={r.badge.background_color} onChange={(v) => update((d) => { d.ranking.badge.background_color = v; })} /></Field>
          <Field label="Badge padding (px)"><NumberInput value={r.badge.padding_px} min={0}
            onChange={(e) => update((d) => { d.ranking.badge.padding_px = Number(e.target.value); })} /></Field>
        </>
      )}
      <Field label="Number position">
        <Select value={r.position} onChange={(v) => update((d) => { d.ranking.position = v as typeof r.position; })}
                options={[["top-left", "Top left"], ["top-right", "Top right"], ["bottom-left", "Bottom left"], ["bottom-right", "Bottom right"], ["center", "Center"]]} />
      </Field>
      <Toggle checked={r.highlight_current} onChange={(v) => update((d) => { d.ranking.highlight_current = v; })} label="Highlight current rank" />
    </>
  );
}

/** Per-rank color overrides — editing one rank never changes others or the default. */
function PerRankColors({ doc, update }: PanelProps) {
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const shown = Math.min(doc.ranking.count, 20);
  const ranks = doc.ranking.order === "descending"
    ? Array.from({ length: shown }, (_, i) => doc.ranking.count - i)
    : Array.from({ length: shown }, (_, i) => i + 1);

  const activeRank = selectedRank ?? ranks[0];
  const override = doc.ranking.per_rank_colors[String(activeRank)];
  const activeColor = override ?? doc.ranking.default_color;

  return (
    <div className="mb-4 p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-neutral-300">Per-Rank Color Customization</span>
        <span className="text-[11px] text-neutral-500">
          {Object.keys(doc.ranking.per_rank_colors).length} custom override(s)
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {ranks.map((n) => {
          const hasOverride = Boolean(doc.ranking.per_rank_colors[String(n)]);
          const isSelected = activeRank === n;
          const color = doc.ranking.per_rank_colors[String(n)] ?? doc.ranking.default_color;
          return (
            <button
              key={n}
              type="button"
              title={`Rank ${n}${hasOverride ? ` (${color})` : " (default)"}`}
              onClick={() => setSelectedRank(n)}
              className={`w-7 h-7 rounded text-[11px] font-bold border transition-all ${
                isSelected
                  ? "ring-2 ring-blue-500 scale-105 border-white"
                  : hasOverride
                  ? "border-amber-400 ring-1 ring-amber-400/40"
                  : "border-neutral-700 hover:border-neutral-500"
              }`}
              style={{
                background: color,
                color: color.toLowerCase() === "#ffffff" ? "#000" : "#fff",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-neutral-300">
            Rank #{activeRank} Color {override ? "(Custom)" : "(Inheriting default)"}
          </span>
          {override && (
            <button
              type="button"
              onClick={() =>
                update((d) => {
                  delete d.ranking.per_rank_colors[String(activeRank)];
                })
              }
              className="text-[11px] text-amber-400 hover:text-amber-300 underline"
            >
              Reset to default
            </button>
          )}
        </div>
        <ColorInput
          value={activeColor}
          onChange={(v) =>
            update((d) => {
              d.ranking.per_rank_colors[String(activeRank)] = v;
            })
          }
        />
      </div>
    </div>
  );
}

function LabelsPanel({ doc, update, rank }: PanelProps & { rank: number }) {
  const l = doc.labels;
  return (
    <>
      <Toggle checked={l.enabled} onChange={(v) => update((d) => { d.labels.enabled = v; })} label="Show labels" />
      <Field label={`Label for rank ${rank}`}>
        <TextInput value={l.texts[String(rank)] ?? ""}
          onChange={(e) => update((d) => {
            if (e.target.value) d.labels.texts[String(rank)] = e.target.value;
            else delete d.labels.texts[String(rank)];
          })} placeholder="e.g. Sleeping cat 😹" />
      </Field>
      <Field label="Font"><TextInput value={l.font_family} onChange={(e) => update((d) => { d.labels.font_family = e.target.value; })} /></Field>
      <Field label="Font size (px)"><NumberInput value={l.font_size_px} min={8}
        onChange={(e) => update((d) => { d.labels.font_size_px = Number(e.target.value); })} /></Field>
      <Field label="Color"><ColorInput value={l.color} onChange={(v) => update((d) => { d.labels.color = v; })} /></Field>
      <Field label="Position">
        <Select value={l.position} onChange={(v) => update((d) => { d.labels.position = v as typeof l.position; })}
                options={[["bottom", "Bottom"], ["top", "Top"], ["over-number", "Over number"]]} />
      </Field>
      <Field label="Max lines"><NumberInput value={l.max_lines} min={1} max={10}
        onChange={(e) => update((d) => { d.labels.max_lines = Number(e.target.value); })} /></Field>
      <Field label="Padding (px)"><NumberInput value={l.padding_px} min={0}
        onChange={(e) => update((d) => { d.labels.padding_px = Number(e.target.value); })} /></Field>
    </>
  );
}

function BrandingPanel({ doc, update }: PanelProps) {
  const b = doc.branding;
  return (
    <>
      <Field label="Watermark text"><TextInput value={b.watermark_text ?? ""}
        onChange={(e) => update((d) => { d.branding.watermark_text = e.target.value || null; })} /></Field>
      <Field label="Channel name"><TextInput value={b.channel_name ?? ""}
        onChange={(e) => update((d) => { d.branding.channel_name = e.target.value || null; })} /></Field>
      {b.watermark_text && (
        <>
          <Field label="Position">
            <Select value={b.position} onChange={(v) => update((d) => { d.branding.position = v as typeof b.position; })}
                    options={[["bottom-right", "Bottom right"], ["bottom-left", "Bottom left"], ["top-right", "Top right"], ["top-left", "Top left"]]} />
          </Field>
          <Field label="Opacity"><NumberInput value={b.opacity} min={0} max={1} step={0.05}
            onChange={(e) => update((d) => { d.branding.opacity = Number(e.target.value); })} /></Field>
        </>
      )}
      <Toggle checked={b.intro_enabled} onChange={(v) => update((d) => { d.branding.intro_enabled = v; })} label="Intro branding (planned — disabled in render until Phase 3)" />
      <Toggle checked={b.outro_enabled} onChange={(v) => update((d) => { d.branding.outro_enabled = v; })} label="Outro branding (planned)" />
      <p className="text-[10px] text-neutral-600">Logo / image upload arrives with the media service in Phase 3.</p>
    </>
  );
}
