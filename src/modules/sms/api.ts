import "server-only";
import { apiFetch } from "@/core/api/client";
import type { PagedResult } from "@/modules/security/types";
import type {
  SmsAllocation,
  SmsAllocationUpsertRequest,
  SmsOrganizationBalance,
  SmsOverview,
  SmsProvider,
  SmsProviderUpsertRequest,
  SmsPurchase,
  SmsPurchaseUpsertRequest,
} from "./types";

const base = "/api/sms";

/** Filters of the purchase and allocation lists; organizationId is the organization's Object Id. */
type SmsListQuery = {
  search?: string;
  providerId?: number;
  organizationId?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};

const organization = (objectId: string) => `${base}/organizations/${encodeURIComponent(objectId)}`;

/** Typed wrappers for the SMS controllers. SMS.V reads; SMS.M changes. */
export const smsApi = {
  overview: () => apiFetch<SmsOverview>(`${base}/overview`),

  providers: {
    list: (query: { isActive?: boolean } = {}) => apiFetch<SmsProvider[]>(`${base}/providers`, { query }),
    create: (body: SmsProviderUpsertRequest) => apiFetch<SmsProvider>(`${base}/providers`, { method: "POST", body }),
    update: (id: number, body: SmsProviderUpsertRequest) =>
      apiFetch<SmsProvider>(`${base}/providers/${id}`, { method: "PUT", body }),
    /** 409 once SMS were bought from or allocated with the provider. */
    remove: (id: number) => apiFetch<void>(`${base}/providers/${id}`, { method: "DELETE" }),
  },

  purchases: {
    list: (query: Omit<SmsListQuery, "organizationId">) =>
      apiFetch<PagedResult<SmsPurchase>>(`${base}/purchases`, { query }),
    create: (body: SmsPurchaseUpsertRequest) => apiFetch<SmsPurchase>(`${base}/purchases`, { method: "POST", body }),
    update: (id: number, body: SmsPurchaseUpsertRequest) =>
      apiFetch<SmsPurchase>(`${base}/purchases/${id}`, { method: "PUT", body }),
    /** 409 when the SMS are already allocated. */
    remove: (id: number) => apiFetch<void>(`${base}/purchases/${id}`, { method: "DELETE" }),
  },

  allocations: {
    list: (query: SmsListQuery) => apiFetch<PagedResult<SmsAllocation>>(`${base}/allocations`, { query }),
    create: (body: SmsAllocationUpsertRequest) => apiFetch<SmsAllocation>(`${base}/allocations`, { method: "POST", body }),
    update: (id: number, body: SmsAllocationUpsertRequest) =>
      apiFetch<SmsAllocation>(`${base}/allocations/${id}`, { method: "PUT", body }),
    /** 409 when the organization already used them. */
    remove: (id: number) => apiFetch<void>(`${base}/allocations/${id}`, { method: "DELETE" }),
  },

  organizations: {
    /** Every organization (active first), with or without SMS unless onlyAllocated. */
    list: (query: { search?: string; onlyAllocated?: boolean; limit: number; offset: number }) =>
      apiFetch<PagedResult<SmsOrganizationBalance>>(`${base}/organizations`, { query }),
    /** Adds SMS the organization sent; 409 when it hasn't that many left. */
    addUsage: (objectId: string, smsCount: number) =>
      apiFetch<SmsOrganizationBalance>(`${organization(objectId)}/usage`, { method: "POST", body: { smsCount } }),
    /** Corrects the total used (0 to what was allocated). */
    setUsage: (objectId: string, smsUsage: number) =>
      apiFetch<SmsOrganizationBalance>(`${organization(objectId)}/usage`, { method: "PUT", body: { smsUsage } }),
  },
};
