import "server-only";
import { apiFetch } from "@/core/api/client";
import type { CustomerOption } from "@/modules/sales/types";
import type { PagedResult } from "@/modules/security/types";
import type {
  OptionItem,
  ProductWarrantyItem,
  ServiceJob,
  ServiceJobInvoiceRequest,
  ServiceJobItemRequest,
  ServiceJobUpsertRequest,
  SupplierClaim,
  SupplierClaimReturnRequest,
  SupplierClaimUpsertRequest,
  SupplierOption,
  WarrantyCard,
  WarrantyCardCreateRequest,
  WarrantyCheckResult,
  WarrantyPolicy,
  WarrantyPolicyOption,
  WarrantyPolicyUpsertRequest,
} from "./types";

const base = "/api/warranty";

type Query = Record<string, string | number | boolean | undefined>;

export const warrantyApi = {
  policies: {
    list: (query: { search?: string; isActive?: boolean; limit: number; offset: number }) =>
      apiFetch<PagedResult<WarrantyPolicy>>(`${base}/policies`, { query }),
    options: (includeInactive = false) =>
      apiFetch<WarrantyPolicyOption[]>(`${base}/policies/options`, { query: { includeInactive } }),
    create: (body: WarrantyPolicyUpsertRequest) => apiFetch<WarrantyPolicy>(`${base}/policies`, { method: "POST", body }),
    update: (id: number, body: WarrantyPolicyUpsertRequest) => apiFetch<WarrantyPolicy>(`${base}/policies/${id}`, { method: "PUT", body }),
    remove: (id: number) => apiFetch<void>(`${base}/policies/${id}`, { method: "DELETE" }),
  },

  products: {
    /** Products with their policy; hasPolicy=false lists those sold without one. */
    list: (query: { search?: string; warrantyPolicyId?: number; hasPolicy?: boolean; limit: number; offset: number }) =>
      apiFetch<PagedResult<ProductWarrantyItem>>(`${base}/products`, { query }),
    /** Sets the policy of these products (null takes it off). */
    assign: (productIds: number[], warrantyPolicyId: number | null) =>
      apiFetch<{ changed: number }>(`${base}/products/policy`, { method: "PUT", body: { productIds, warrantyPolicyId } }),
  },

  lookups: {
    deviceTypes: () => apiFetch<OptionItem[]>(`${base}/lookups/device-types`),
    technicians: () => apiFetch<OptionItem[]>(`${base}/lookups/technicians`),
    /** Customers and suppliers (every party can buy), by code, name or mobile; or exact ids. */
    customers: (query: { search?: string; ids?: string; limit?: number }) =>
      apiFetch<CustomerOption[]>(`${base}/lookups/customers`, { query }),
    suppliers: (search?: string, limit = 200) => apiFetch<SupplierOption[]>(`${base}/lookups/suppliers`, { query: { search, limit } }),
  },

  cards: {
    list: (query: Query & { limit: number; offset: number }) => apiFetch<PagedResult<WarrantyCard>>(`${base}/cards`, { query }),
    get: (id: number) => apiFetch<WarrantyCard>(`${base}/cards/${id}`),
    /** By serial no., warranty no., invoice no. or mobile (exact). */
    check: (q: string) => apiFetch<WarrantyCheckResult>(`${base}/cards/check`, { query: { q } }),
    create: (body: WarrantyCardCreateRequest) => apiFetch<WarrantyCard>(`${base}/cards`, { method: "POST", body }),
    void: (id: number, reason: string) => apiFetch<WarrantyCard>(`${base}/cards/${id}/void`, { method: "POST", body: { reason } }),
  },

  jobs: {
    list: (query: Query & { limit: number; offset: number }) => apiFetch<PagedResult<ServiceJob>>(`${base}/jobs`, { query }),
    get: (id: number) => apiFetch<ServiceJob>(`${base}/jobs/${id}`),
    create: (body: ServiceJobUpsertRequest) => apiFetch<ServiceJob>(`${base}/jobs`, { method: "POST", body }),
    update: (id: number, body: ServiceJobUpsertRequest) => apiFetch<ServiceJob>(`${base}/jobs/${id}`, { method: "PUT", body }),
    remove: (id: number) => apiFetch<void>(`${base}/jobs/${id}`, { method: "DELETE" }),
    saveItems: (id: number, items: ServiceJobItemRequest[]) =>
      apiFetch<ServiceJob>(`${base}/jobs/${id}/items`, { method: "PUT", body: { items } }),
    status: (id: number, body: { status: string; resolution: string | null; resolutionNote: string | null; note: string | null; customerNotified: boolean }) =>
      apiFetch<ServiceJob>(`${base}/jobs/${id}/status`, { method: "POST", body }),
    approval: (id: number, body: { approved: boolean; estimatedAmount: number | null; note: string | null }) =>
      apiFetch<ServiceJob>(`${base}/jobs/${id}/approval`, { method: "POST", body }),
    invoice: (id: number, body: ServiceJobInvoiceRequest) => apiFetch<ServiceJob>(`${base}/jobs/${id}/invoice`, { method: "POST", body }),
    deliver: (id: number, body: { deliveredToName: string | null; note: string | null; customerNotified: boolean }) =>
      apiFetch<ServiceJob>(`${base}/jobs/${id}/deliver`, { method: "POST", body }),
    cancel: (id: number, reason: string) => apiFetch<ServiceJob>(`${base}/jobs/${id}/cancel`, { method: "POST", body: { reason } }),
  },

  claims: {
    list: (query: Query & { limit: number; offset: number }) => apiFetch<PagedResult<SupplierClaim>>(`${base}/claims`, { query }),
    create: (body: SupplierClaimUpsertRequest) => apiFetch<SupplierClaim>(`${base}/claims`, { method: "POST", body }),
    return: (id: number, body: SupplierClaimReturnRequest) => apiFetch<SupplierClaim>(`${base}/claims/${id}/return`, { method: "POST", body }),
    cancel: (id: number) => apiFetch<SupplierClaim>(`${base}/claims/${id}/cancel`, { method: "POST", body: {} }),
  },
};
