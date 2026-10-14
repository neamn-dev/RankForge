// Thin typed fetch client for the RankForge API.
import type { TemplateDocument } from "../types/template";
import type { Asset, ProjectDocument, ProjectRecord } from "../types/project";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`API ${resp.status}: ${body || resp.statusText}`);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

export interface TemplateRecord {
  id: string;
  name: string;
  isDefault: boolean;
  updatedAt: string | null;
  document: TemplateDocument;
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string; service: string }>("/health"),

  // Templates
  listTemplates: () => request<TemplateRecord[]>("/templates"),
  getTemplate: (id: string) => request<TemplateRecord>(`/templates/${id}`),
  createTemplate: (doc: TemplateDocument) =>
    request<{ id: string }>("/templates", { method: "POST", body: JSON.stringify(doc) }),
  updateTemplate: (id: string, doc: TemplateDocument) =>
    request<{ id: string }>(`/templates/${id}`, { method: "PUT", body: JSON.stringify(doc) }),
  duplicateTemplate: (id: string) =>
    request<{ id: string }>(`/templates/${id}/duplicate`, { method: "POST" }),
  renameTemplate: (id: string, name: string) =>
    request<{ id: string }>(`/templates/${id}/rename`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteTemplate: (id: string) =>
    request<void>(`/templates/${id}`, { method: "DELETE" }),
  setDefaultTemplate: (id: string) =>
    request<{ id: string }>(`/templates/${id}/default`, { method: "POST" }),
  resetTemplate: (id: string) =>
    request<{ id: string }>(`/templates/${id}/reset`, { method: "POST" }),
  seedStarterTemplates: () =>
    request<{ added: number }>("/templates/seed", { method: "POST" }),

  // Projects
  listProjects: () => request<ProjectRecord[]>("/projects"),
  getProject: (id: string) => request<ProjectRecord>(`/projects/${id}`),
  createProject: (doc: ProjectDocument) =>
    request<{ id: string }>("/projects", { method: "POST", body: JSON.stringify(doc) }),
  createProjectFromTemplate: (templateId: string) =>
    request<{ id: string }>(`/projects/from-template/${templateId}`, { method: "POST" }),
  updateProject: (id: string, doc: ProjectDocument) =>
    request<{ id: string }>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(doc) }),
  duplicateProject: (id: string) =>
    request<{ id: string }>(`/projects/${id}/duplicate`, { method: "POST" }),
  renameProject: (id: string, name: string) =>
    request<{ id: string }>(`/projects/${id}/rename`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteProject: (id: string) =>
    request<void>(`/projects/${id}`, { method: "DELETE" }),

  // Media
  uploadMedia: async (file: File): Promise<Asset> => {
    const formData = new FormData();
    formData.append("file", file);
    const resp = await fetch(`${BASE}/media/upload`, {
      method: "POST",
      body: formData,
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      throw new Error(`Media upload failed (${resp.status}): ${err || resp.statusText}`);
    }
    return resp.json();
  },
  getMediaUrl: (storageKey: string) => `${BASE}/media/file/${storageKey}`,
  getThumbnailUrl: (assetId: string) => `${BASE}/media/thumbnail/${assetId}`,
};
