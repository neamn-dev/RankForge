import { useState } from "react";
import { api } from "./api/client";
import { ProjectLibrary } from "./features/projects/ProjectLibrary";
import { ProjectEditor } from "./features/projects/ProjectEditor";
import { TemplateLibrary } from "./features/templates/TemplateLibrary";
import { TemplateStudio } from "./features/templates/TemplateStudio";

export default function App() {
  const [activeTab, setActiveTab] = useState<"projects" | "templates">("projects");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // If currently inside Project Editor
  if (editingProjectId) {
    return (
      <ProjectEditor
        projectId={editingProjectId}
        onBack={() => setEditingProjectId(null)}
      />
    );
  }

  // If currently inside Template Studio
  if (editingTemplateId) {
    return (
      <TemplateStudio
        templateId={editingTemplateId}
        onBack={() => setEditingTemplateId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Main Navigation Header */}
      <header className="border-b border-neutral-800 px-6 py-3 flex items-center justify-between bg-neutral-900/60 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-sm shadow">
              R
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">
              RankForge
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab("projects")}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "projects"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span>🎬</span> Projects
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "templates"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span>🎨</span> Template Studio
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-[11px] text-neutral-500 font-mono">
            Milestones 1–4 Active
          </span>
        </div>
      </header>

      {/* Main Tab Content */}
      <div className="flex-1">
        {activeTab === "projects" ? (
          <ProjectLibrary
            onOpenProject={(id) => setEditingProjectId(id)}
            onNavigateTemplates={() => setActiveTab("templates")}
          />
        ) : (
          <TemplateLibrary
            onOpen={(id) => setEditingTemplateId(id)}
            onCreateProject={async (templateId) => {
              const res = await api.createProjectFromTemplate(templateId);
              setEditingProjectId(res.id);
            }}
          />
        )}
      </div>
    </div>
  );
}
