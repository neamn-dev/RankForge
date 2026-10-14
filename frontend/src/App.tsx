import { useState } from "react";
import { TemplateLibrary } from "./features/templates/TemplateLibrary";
import { TemplateStudio } from "./features/templates/TemplateStudio";

export default function App() {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 px-6 py-3 flex items-center gap-3">
        <span className="text-lg font-extrabold tracking-tight">RankForge</span>
        <span className="text-xs text-neutral-500">Ranking Video Editor — Milestone 1</span>
      </header>
      {editingId ? (
        <TemplateStudio templateId={editingId} onBack={() => setEditingId(null)} />
      ) : (
        <TemplateLibrary onOpen={setEditingId} />
      )}
    </div>
  );
}
