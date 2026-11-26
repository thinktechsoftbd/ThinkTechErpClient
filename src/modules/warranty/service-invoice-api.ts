import "server-only";
import { apiFetch } from "@/core/api/client";
import type { CustomerOption } from "@/modules/sales/types";
import type { PagedResult } from "@/modules/security/types";
import type { ServiceInvoice, ServiceInvoiceListQuery, ServiceInvoiceUpsertRequest } from "./service-invoice-types";

const base = "/api/service-invoices";

export const serviceInvoiceApi = {
  list: (query: ServiceInvoiceListQuery) => apiFetch<PagedResult<ServiceInvoice>>(base, { query }),
  get: (id: number) => apiFetch<ServiceInvoice>(`${base}/${id}`),
  create: (body: ServiceInvoiceUpsertRequest) => apiFetch<ServiceInvoice>(base, { method: "POST", body }),
  update: (id: number, body: ServiceInvoiceUpsertRequest) => apiFetch<ServiceInvoice>(`${base}/${id}`, { method: "PUT", body }),
  remove: (id: number) => apiFetch<void>(`${base}/${id}`, { method: "DELETE" }),
  /** Posts a draft, then its bill voucher from the ledger mappings; the invoice is then locked. */
  finalize: (id: number) => apiFetch<ServiceInvoice>(`${base}/${id}/finalize`, { method: "POST" }),
  /** A posted invoice that isn't finalized back to draft, so it can be changed or deleted. */
  unpost: (id: number) => apiFetch<ServiceInvoice>(`${base}/${id}/unpost`, { method: "POST" }),
  /** Customers and suppliers (every party can be billed), by code, name or mobile; or exact ids. Needs no Sales access. */
  customers: (query: { search?: string; ids?: string; limit?: number }) =>
    apiFetch<CustomerOption[]>(`${base}/lookups/customers`, { query }),
};
