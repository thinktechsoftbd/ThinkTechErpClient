import "server-only";
import { apiFetch } from "@/core/api/client";
import type { PagedResult } from "@/modules/security/types";
import type {
  Area,
  AreaUpsertRequest,
  District,
  DistrictOption,
  DistrictUpsertRequest,
  DistrictZoneOption,
  Division,
  DivisionOption,
  DivisionUpsertRequest,
  LookupData,
  LookupDataUpsertRequest,
  LookupOption,
  LookupTable,
  LookupTableUpsertRequest,
  ShippingZone,
  ShippingZoneOption,
  ShippingZoneUpsertRequest,
} from "./types";

const base = "/api/settings";
const table = (id: number) => `${base}/lookup-tables/${id}`;
const data = (id: number) => `${base}/lookup-data/${id}`;
const area = (id: number) => `${base}/areas/${id}`;
const division = (id: number) => `${base}/divisions/${id}`;
const district = (id: number) => `${base}/districts/${id}`;
const zone = (id: number) => `${base}/shipping-zones/${id}`;

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

  listDivisions: (query: ListQuery) => apiFetch<PagedResult<Division>>(`${base}/divisions`, { query }),
  getDivision: (id: number) => apiFetch<Division>(division(id)),
  createDivision: (body: DivisionUpsertRequest) => apiFetch<Division>(`${base}/divisions`, { method: "POST", body }),
  updateDivision: (id: number, body: DivisionUpsertRequest) => apiFetch<Division>(division(id), { method: "PUT", body }),
  deleteDivision: (id: number) => apiFetch<void>(division(id), { method: "DELETE" }),

  listDistricts: (query: ListQuery & { divisionId?: number; shippingZoneId?: number }) =>
    apiFetch<PagedResult<District>>(`${base}/districts`, { query }),
  getDistrict: (id: number) => apiFetch<District>(district(id)),
  createDistrict: (body: DistrictUpsertRequest) => apiFetch<District>(`${base}/districts`, { method: "POST", body }),
  updateDistrict: (id: number, body: DistrictUpsertRequest) => apiFetch<District>(district(id), { method: "PUT", body }),
  deleteDistrict: (id: number) => apiFetch<void>(district(id), { method: "DELETE" }),
  /** The District screen's pickers; they need only DISTRICT.V. */
  getDistrictDivisionOptions: () => apiFetch<DivisionOption[]>(`${base}/districts/divisions`),
  getDistrictZoneOptions: () => apiFetch<DistrictZoneOption[]>(`${base}/districts/shipping-zones`),

  listShippingZones: (query: ListQuery) => apiFetch<PagedResult<ShippingZone>>(`${base}/shipping-zones`, { query }),
  getShippingZone: (id: number) => apiFetch<ShippingZone>(zone(id)),
  createShippingZone: (body: ShippingZoneUpsertRequest) =>
    apiFetch<ShippingZone>(`${base}/shipping-zones`, { method: "POST", body }),
  updateShippingZone: (id: number, body: ShippingZoneUpsertRequest) =>
    apiFetch<ShippingZone>(zone(id), { method: "PUT", body }),
  deleteShippingZone: (id: number) => apiFetch<void>(zone(id), { method: "DELETE" }),
};
