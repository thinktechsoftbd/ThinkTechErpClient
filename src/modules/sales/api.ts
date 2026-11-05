import "server-only";
import { apiFetch } from "@/core/api/client";
import type { ReportPage } from "@/modules/inventory/types";
import type { PagedResult } from "@/modules/security/types";
import type {
  Customer,
  CustomerDueRow,
  CustomerLedger,
  CustomerOption,
  CustomerReceipt,
  CustomerReceiptCreateRequest,
  CustomerUpsertRequest,
  OpenSalesInvoice,
  SalesByProductRow,
  SalesInvoice,
  SalesInvoiceUpsertRequest,
  SalesRegisterRow,
  SalesReturn,
  SalesReturnUpsertRequest,
} from "./types";

const base = "/api/sales";

export type SalesListQuery = {
  search?: string;
  status?: string;
  customerId?: number;
  from?: string;
  to?: string;
  saleType?: string;
  paymentStatus?: string;
  limit: number;
  offset: number;
};

export const salesApi = {
  customers: {
    list: (query: { search?: string; isActive?: boolean; groupId?: number; limit: number; offset: number }) =>
      apiFetch<PagedResult<Customer>>(`${base}/customers`, { query }),
    get: (id: number) => apiFetch<Customer>(`${base}/customers/${id}`),
    create: (body: CustomerUpsertRequest) => apiFetch<Customer>(`${base}/customers`, { method: "POST", body }),
    update: (id: number, body: CustomerUpsertRequest) => apiFetch<Customer>(`${base}/customers/${id}`, { method: "PUT", body }),
    remove: (id: number) => apiFetch<void>(`${base}/customers/${id}`, { method: "DELETE" }),
    /**
     * By code, name, mobile, phone or address (an exact mobile first); ids returns exactly those customers;
     * includeSuppliers lists the suppliers that aren't customers yet too.
     */
    options: (query: { search?: string; ids?: string; limit?: number; includeSuppliers?: boolean }) =>
      apiFetch<CustomerOption[]>(`${base}/customers/options`, { query }),
    openInvoices: (customerId: number) => apiFetch<OpenSalesInvoice[]>(`${base}/customers/${customerId}/open-invoices`),
    /** Just the customer's ledger head (null clears it). */
    setLedgerHead: (customerId: number, accSubClassId: number | null) =>
      apiFetch<void>(`${base}/customers/${customerId}/ledger-head`, { method: "PUT", body: { accSubClassId } }),
  },

  invoices: {
    list: (query: SalesListQuery) => apiFetch<PagedResult<SalesInvoice>>(`${base}/invoices`, { query }),
    get: (id: number) => apiFetch<SalesInvoice>(`${base}/invoices/${id}`),
    create: (body: SalesInvoiceUpsertRequest) => apiFetch<SalesInvoice>(`${base}/invoices`, { method: "POST", body }),
    update: (id: number, body: SalesInvoiceUpsertRequest) => apiFetch<SalesInvoice>(`${base}/invoices/${id}`, { method: "PUT", body }),
    remove: (id: number) => apiFetch<void>(`${base}/invoices/${id}`, { method: "DELETE" }),
    /** post, finalize (post, then post the bill voucher) or cancel */
    action: (id: number, action: "post" | "finalize" | "cancel") =>
      apiFetch<SalesInvoice>(`${base}/invoices/${id}/${action}`, { method: "POST", body: {} }),
  },

  returns: {
    list: (query: SalesListQuery) => apiFetch<PagedResult<SalesReturn>>(`${base}/returns`, { query }),
    get: (id: number) => apiFetch<SalesReturn>(`${base}/returns/${id}`),
    create: (body: SalesReturnUpsertRequest) => apiFetch<SalesReturn>(`${base}/returns`, { method: "POST", body }),
    update: (id: number, body: SalesReturnUpsertRequest) => apiFetch<SalesReturn>(`${base}/returns/${id}`, { method: "PUT", body }),
    remove: (id: number) => apiFetch<void>(`${base}/returns/${id}`, { method: "DELETE" }),
    /** post or cancel */
    action: (id: number, action: "post" | "cancel") =>
      apiFetch<SalesReturn>(`${base}/returns/${id}/${action}`, { method: "POST", body: {} }),
  },

  receipts: {
    list: (query: SalesListQuery) => apiFetch<PagedResult<CustomerReceipt>>(`${base}/receipts`, { query }),
    get: (id: number) => apiFetch<CustomerReceipt>(`${base}/receipts/${id}`),
    /** Recorded and posted in one step. */
    create: (body: CustomerReceiptCreateRequest) => apiFetch<CustomerReceipt>(`${base}/receipts`, { method: "POST", body }),
    cancel: (id: number) => apiFetch<CustomerReceipt>(`${base}/receipts/${id}/cancel`, { method: "POST", body: {} }),
    setChequeStatus: (id: number, chequeStatus: string) =>
      apiFetch<CustomerReceipt>(`${base}/receipts/${id}/cheque-status`, { method: "PUT", body: { chequeStatus } }),
  },

  reports: {
    customerLedger: (query: { customerId: number; from?: string; to?: string }) =>
      apiFetch<CustomerLedger>(`${base}/reports/customer-ledger`, { query }),
    customerDues: (query: { search?: string; asOf?: string; onlyWithBalance?: boolean; limit: number; offset: number }) =>
      apiFetch<ReportPage<CustomerDueRow>>(`${base}/reports/customer-dues`, { query }),
    register: (query: {
      search?: string;
      customerId?: number;
      warehouseId?: number;
      saleType?: string;
      from?: string;
      to?: string;
      limit: number;
      offset: number;
    }) => apiFetch<ReportPage<SalesRegisterRow>>(`${base}/reports/register`, { query }),
    byProduct: (query: {
      search?: string;
      customerId?: number;
      warehouseId?: number;
      categoryId?: number;
      from?: string;
      to?: string;
      limit: number;
      offset: number;
    }) => apiFetch<ReportPage<SalesByProductRow>>(`${base}/reports/by-product`, { query }),
  },
};
