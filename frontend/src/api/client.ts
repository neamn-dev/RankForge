// Thin typed fetch client for the RankForge API.
import type { TemplateDocument } from "../types/template";

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
      method: "PATCH", body: JSON.stringify({ name }),
    }),
  deleteTemplate: (id: string) =>
    request<void>(`/templates/${id}`, { method: "DELETE" }),
  setDefaultTemplate: (id: string) =>
    request<{ id: string }>(`/templates/${id}/default`, { method: "POST" }),
  resetTemplate: (id: string) =>
    request<{ id: string }>(`/templates/${id}/reset`, { method: "POST" }),
};
