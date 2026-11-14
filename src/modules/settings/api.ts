import "server-only";
import { apiFetch } from "@/core/api/client";
import type { PagedResult } from "@/modules/security/types";
import type {
  Area,
  AreaUpsertRequest,
  DistrictOption,
  LookupData,
  LookupDataUpsertRequest,
  LookupOption,
  LookupTable,
  LookupTableUpsertRequest,
  ShippingZoneOption,
} from "./types";

const base = "/api/settings";
const table = (id: number) => `${base}/lookup-tables/${id}`;
const data = (id: number) => `${base}/lookup-data/${id}`;
const area = (id: number) => `${base}/areas/${id}`;

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

  getAreas: (query: ListQuery & { districtId?: number; areaType?: string }) =>
    apiFetch<PagedResult<Area>>(`${base}/areas`, { query }),
  getArea: (id: number) => apiFetch<Area>(area(id)),
  createArea: (body: AreaUpsertRequest) => apiFetch<Area>(`${base}/areas`, { method: "POST", body }),
  updateArea: (id: number, body: AreaUpsertRequest) => apiFetch<Area>(area(id), { method: "PUT", body }),
  deleteArea: (id: number) => apiFetch<void>(area(id), { method: "DELETE" }),

  /** Districts for the picker and filter; server-paginated. */
  getDistricts: (query: { search?: string; limit: number; offset: number }) =>
    apiFetch<PagedResult<DistrictOption>>(`${base}/areas/districts`, { query }),
  getShippingZones: () => apiFetch<ShippingZoneOption[]>(`${base}/areas/shipping-zones`),
};
