import "server-only";
import { apiFetch } from "@/core/api/client";
import type { PagedResult } from "@/modules/security/types";
import type {
  BatchStockItem,
  Brand,
  BrandUpsertRequest,
  Category,
  CategoryUpsertRequest,
  ExpiryRow,
  InventoryOptions,
  InventorySetting,
  InventorySettingUpdateRequest,
  Product,
  ProductLookupItem,
  ProductUpsertRequest,
  ReorderRow,
  ReportPage,
  SerialStockItem,
  StockAdjustment,
  StockAdjustmentUpsertRequest,
  StockCard,
  StockCount,
  StockCountCreateRequest,
  StockCountUpdateRequest,
  StockMovementRow,
  StockOnHandRow,
  StockTransfer,
  StockTransferReceiveRequest,
  StockTransferUpsertRequest,
  StockValuationRow,
  Unit,
  UnitUpsertRequest,
  Warehouse,
  WarehouseUpsertRequest,
} from "./types";

const base = "/api/inventory";

type ListQuery = { search?: string; isActive?: boolean; limit: number; offset: number };
export type DocumentListQuery = {
  search?: string;
  status?: string;
  warehouseId?: number;
  reason?: string;
  excludeOpening?: boolean;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};

function crud<T, TRequest>(path: string) {
  const item = (id: number) => `${base}/${path}/${id}`;
  return {
    list: (query: ListQuery & Record<string, string | number | boolean | undefined>) =>
      apiFetch<PagedResult<T>>(`${base}/${path}`, { query }),
    get: (id: number) => apiFetch<T>(item(id)),
    create: (body: TRequest) => apiFetch<T>(`${base}/${path}`, { method: "POST", body }),
    update: (id: number, body: TRequest) => apiFetch<T>(item(id), { method: "PUT", body }),
    remove: (id: number) => apiFetch<void>(item(id), { method: "DELETE" }),
  };
}

function documents<T, TRequest>(path: string) {
  const item = (id: number) => `${base}/${path}/${id}`;
  return {
    list: (query: DocumentListQuery) => apiFetch<PagedResult<T>>(`${base}/${path}`, { query }),
    get: (id: number) => apiFetch<T>(item(id)),
    create: (body: TRequest) => apiFetch<T>(`${base}/${path}`, { method: "POST", body }),
    update: (id: number, body: TRequest) => apiFetch<T>(item(id), { method: "PUT", body }),
    remove: (id: number) => apiFetch<void>(item(id), { method: "DELETE" }),
    action: (id: number, action: string, body: unknown = {}) =>
      apiFetch<T>(`${item(id)}/${action}`, { method: "POST", body }),
  };
}

export const inventoryApi = {
  units: crud<Unit, UnitUpsertRequest>("units"),
  categories: crud<Category, CategoryUpsertRequest>("categories"),
  brands: crud<Brand, BrandUpsertRequest>("brands"),
  warehouses: crud<Warehouse, WarehouseUpsertRequest>("warehouses"),
  products: crud<Product, ProductUpsertRequest>("products"),

  adjustments: documents<StockAdjustment, StockAdjustmentUpsertRequest>("adjustments"),
  transfers: documents<StockTransfer, StockTransferUpsertRequest>("transfers"),
  receiveTransfer: (id: number, body: StockTransferReceiveRequest) =>
    apiFetch<StockTransfer>(`${base}/transfers/${id}/receive`, { method: "POST", body }),
  counts: {
    ...documents<StockCount, StockCountCreateRequest>("counts"),
    /** Saves counted quantities (a count's lines are created when it starts). */
    saveCounted: (id: number, body: StockCountUpdateRequest) =>
      apiFetch<StockCount>(`${base}/counts/${id}`, { method: "PUT", body }),
  },

  /** Also open to Purchase users (pickers for the purchase screens). */
  getOptions: () => apiFetch<InventoryOptions>(`${base}/options`),
  getSettings: () => apiFetch<InventorySetting>(`${base}/settings`),
  saveSettings: (body: InventorySettingUpdateRequest) =>
    apiFetch<InventorySetting>(`${base}/settings`, { method: "PUT", body }),
  searchProducts: (query: { search?: string; stockOnly?: boolean; warehouseId?: number; limit?: number }) =>
    apiFetch<ProductLookupItem[]>(`${base}/products/lookup`, { query }),
  /** Exactly these products (a draft's lines), with their units. */
  getLineProducts: (ids: number[]) =>
    ids.length === 0
      ? Promise.resolve([] as ProductLookupItem[])
      : apiFetch<ProductLookupItem[]>(`${base}/products/lookup`, { query: { ids: [...new Set(ids)].join(",") } }),
  getBatchStock: (productId: number, warehouseId: number) =>
    apiFetch<BatchStockItem[]>(`${base}/products/${productId}/batches`, { query: { warehouseId } }),
  getSerialStock: (productId: number, warehouseId: number) =>
    apiFetch<SerialStockItem[]>(`${base}/products/${productId}/serials`, { query: { warehouseId } }),

  reports: {
    stockOnHand: (query: {
      search?: string;
      warehouseId?: number;
      categoryId?: number;
      lowStockOnly?: boolean;
      includeZero?: boolean;
      byWarehouse?: boolean;
      limit: number;
      offset: number;
    }) => apiFetch<ReportPage<StockOnHandRow>>(`${base}/reports/stock-on-hand`, { query }),
    stockCard: (query: { productId: number; warehouseId?: number; from?: string; to?: string }) =>
      apiFetch<StockCard>(`${base}/reports/stock-card`, { query }),
    valuation: (query: { groupBy?: string; warehouseId?: number }) =>
      apiFetch<StockValuationRow[]>(`${base}/reports/valuation`, { query }),
    movements: (query: {
      search?: string;
      warehouseId?: number;
      productId?: number;
      movementType?: string;
      from?: string;
      to?: string;
      limit: number;
      offset: number;
    }) => apiFetch<ReportPage<StockMovementRow>>(`${base}/reports/movements`, { query }),
    reorder: (query: { search?: string; warehouseId?: number; categoryId?: number; limit: number; offset: number }) =>
      apiFetch<ReportPage<ReorderRow>>(`${base}/reports/reorder`, { query }),
    expiry: (query: { withinDays?: number; warehouseId?: number; search?: string; limit: number; offset: number }) =>
      apiFetch<ReportPage<ExpiryRow>>(`${base}/reports/expiry`, { query }),
  },
};
