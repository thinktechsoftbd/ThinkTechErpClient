import "server-only";
import { apiFetch } from "@/core/api/client";
import type { WebsiteRecord } from "./types";

const table = (name: string) => `/api/website/${encodeURIComponent(name)}`;
const row = (name: string, id: string) => `${table(name)}/${encodeURIComponent(id)}`;

/** Typed wrappers for WebsiteTablesController (generic CRUD over the `website` schema). */
export const websiteApi = {
  getAll: (name: string) => apiFetch<WebsiteRecord[]>(table(name)),
  getById: (name: string, id: string) => apiFetch<WebsiteRecord>(row(name, id)),
  create: (name: string, record: WebsiteRecord) => apiFetch<WebsiteRecord>(table(name), { method: "POST", body: record }),
  update: (name: string, id: string, record: WebsiteRecord) =>
    apiFetch<WebsiteRecord>(row(name, id), { method: "PUT", body: record }),
  remove: (name: string, id: string) => apiFetch<void>(row(name, id), { method: "DELETE" }),
};
