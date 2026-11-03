import "server-only";
import { apiFetch } from "@/core/api/client";
import type { ReportPage } from "@/modules/inventory/types";
import type { PagedResult } from "@/modules/security/types";
import type {
  GoodsReceipt,
  GoodsReceiptUpsertRequest,
  OpenPurchaseInvoice,
  PaymentSource,
  PaymentSourceUpsertRequest,
  PurchaseByProductRow,
  PurchaseInvoice,
  PurchaseInvoiceUpsertRequest,
  PurchaseOrder,
  PurchaseOrderUpsertRequest,
  PurchaseRegisterRow,
  PurchaseReturn,
  PurchaseReturnUpsertRequest,
  Supplier,
  SupplierDueRow,
  SupplierLedger,
  SupplierOption,
  SupplierPayment,
  SupplierPaymentCreateRequest,
  SupplierUpsertRequest,
  TaxGroup,
  TaxGroupUpsertRequest,
  TaxRate,
  TaxRateUpsertRequest,
} from "./types";

const base = "/api/purchase";

type ListQuery = { search?: string; isActive?: boolean; limit: number; offset: number } & Record<
  string,
  string | number | boolean | undefined
>;

export type PurchaseListQuery = {
  search?: string;
  status?: string;
  supplierId?: number;
  from?: string;
  to?: string;
  purchaseType?: string;
  paymentStatus?: string;
  limit: number;
  offset: number;
};

function crud<T, TRequest>(path: string) {
  const item = (id: number) => `${base}/${path}/${id}`;
  return {
    list: (query: ListQuery) => apiFetch<PagedResult<T>>(`${base}/${path}`, { query }),
    get: (id: number) => apiFetch<T>(item(id)),
    create: (body: TRequest) => apiFetch<T>(`${base}/${path}`, { method: "POST", body }),
    update: (id: number, body: TRequest) => apiFetch<T>(item(id), { method: "PUT", body }),
    remove: (id: number) => apiFetch<void>(item(id), { method: "DELETE" }),
  };
}

function documents<T, TRequest>(path: string) {
  const item = (id: number) => `${base}/${path}/${id}`;
  return {
    list: (query: PurchaseListQuery) => apiFetch<PagedResult<T>>(`${base}/${path}`, { query }),
    get: (id: number) => apiFetch<T>(item(id)),
    create: (body: TRequest) => apiFetch<T>(`${base}/${path}`, { method: "POST", body }),
    update: (id: number, body: TRequest) => apiFetch<T>(item(id), { method: "PUT", body }),
    remove: (id: number) => apiFetch<void>(item(id), { method: "DELETE" }),
    /** post, cancel, approve, close */
    action: (id: number, action: string) => apiFetch<T>(`${item(id)}/${action}`, { method: "POST", body: {} }),
  };
}

export const purchaseApi = {
  suppliers: {
    ...crud<Supplier, SupplierUpsertRequest>("suppliers"),
    options: (search?: string, limit = 200) =>
      apiFetch<SupplierOption[]>(`${base}/suppliers/options`, { query: { search, limit } }),
    openInvoices: (supplierId: number) => apiFetch<OpenPurchaseInvoice[]>(`${base}/suppliers/${supplierId}/open-invoices`),
  },
  taxRates: crud<TaxRate, TaxRateUpsertRequest>("tax-rates"),
  taxGroups: crud<TaxGroup, TaxGroupUpsertRequest>("tax-groups"),
  /** Shared by every organization; the API keeps them under /api/inventory, for inventory and purchase alike. */
  paymentSources: {
    list: (query: ListQuery) => apiFetch<PagedResult<PaymentSource>>("/api/inventory/payment-sources", { query }),
    create: (body: PaymentSourceUpsertRequest) =>
      apiFetch<PaymentSource>("/api/inventory/payment-sources", { method: "POST", body }),
    update: (id: number, body: PaymentSourceUpsertRequest) =>
      apiFetch<PaymentSource>(`/api/inventory/payment-sources/${id}`, { method: "PUT", body }),
    remove: (id: number) => apiFetch<void>(`/api/inventory/payment-sources/${id}`, { method: "DELETE" }),
  },

  invoices: documents<PurchaseInvoice, PurchaseInvoiceUpsertRequest>("invoices"),
  orders: documents<PurchaseOrder, PurchaseOrderUpsertRequest>("orders"),
  receipts: documents<GoodsReceipt, GoodsReceiptUpsertRequest>("goods-receipts"),
  returns: documents<PurchaseReturn, PurchaseReturnUpsertRequest>("returns"),
  payments: {
    list: (query: PurchaseListQuery) => apiFetch<PagedResult<SupplierPayment>>(`${base}/payments`, { query }),
    get: (id: number) => apiFetch<SupplierPayment>(`${base}/payments/${id}`),
    /** Recorded and posted in one step. */
    create: (body: SupplierPaymentCreateRequest) => apiFetch<SupplierPayment>(`${base}/payments`, { method: "POST", body }),
    cancel: (id: number) => apiFetch<SupplierPayment>(`${base}/payments/${id}/cancel`, { method: "POST", body: {} }),
    setChequeStatus: (id: number, chequeStatus: string) =>
      apiFetch<SupplierPayment>(`${base}/payments/${id}/cheque-status`, { method: "PUT", body: { chequeStatus } }),
  },

  reports: {
    supplierLedger: (query: { supplierId: number; from?: string; to?: string }) =>
      apiFetch<SupplierLedger>(`${base}/reports/supplier-ledger`, { query }),
    supplierDues: (query: { search?: string; asOf?: string; onlyWithBalance?: boolean; limit: number; offset: number }) =>
      apiFetch<ReportPage<SupplierDueRow>>(`${base}/reports/supplier-dues`, { query }),
    register: (query: {
      search?: string;
      supplierId?: number;
      purchaseType?: string;
      from?: string;
      to?: string;
      limit: number;
      offset: number;
    }) => apiFetch<ReportPage<PurchaseRegisterRow>>(`${base}/reports/register`, { query }),
    byProduct: (query: {
      search?: string;
      supplierId?: number;
      categoryId?: number;
      from?: string;
      to?: string;
      limit: number;
      offset: number;
    }) => apiFetch<ReportPage<PurchaseByProductRow>>(`${base}/reports/by-product`, { query }),
  },
};
