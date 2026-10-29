import "server-only";
import { apiFetch } from "@/core/api/client";
import type { PagedResult } from "@/modules/security/types";
import type {
  LookupData,
  LookupDataUpsertRequest,
  LookupOption,
  LookupTable,
  LookupTableUpsertRequest,
} from "./types";

const base = "/api/settings";
const table = (id: number) => `${base}/lookup-tables/${id}`;
const data = (id: number) => `${base}/lookup-data/${id}`;

type ListQuery = { search?: string; isActive?: boolean; limit: number; offset: number };

export const settingsApi = {
  getLookupTables: (query: ListQuery) => apiFetch<PagedResult<LookupTable>>(`${base}/lookup-tables`, { query }),
  getLookupTable: (id: number) => apiFetch<LookupTable>(table(id)),
  createLookupTable: (body: LookupTableUpsertRequest) =>
    apiFetch<LookupTable>(`${base}/lookup-tables`, { method: "POST", body }),
  updateLookupTable: (id: number, body: LookupTableUpsertRequest) =>
    apiFetch<LookupTable>(table(id), { method: "PUT", body }),
  deleteLookupTable: (id: number) => apiFetch<void>(table(id), { method: "DELETE" }),

  getLookupData: (query: ListQuery & { lookupTableId?: number }) =>
    apiFetch<PagedResult<LookupData>>(`${base}/lookup-data`, { query }),
  getLookupDataItem: (id: number) => apiFetch<LookupData>(data(id)),
  createLookupData: (body: LookupDataUpsertRequest) =>
    apiFetch<LookupData>(`${base}/lookup-data`, { method: "POST", body }),
  updateLookupData: (id: number, body: LookupDataUpsertRequest) => apiFetch<LookupData>(data(id), { method: "PUT", body }),
  deleteLookupData: (id: number) => apiFetch<void>(data(id), { method: "DELETE" }),

  /** Active values of an active lookup table; needs only a signed-in user. */
  getLookupOptions: (lookupTableName: string) =>
    apiFetch<LookupOption[]>(`${base}/lookup-options/${encodeURIComponent(lookupTableName)}`),
};
