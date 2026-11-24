import "server-only";
import { tryApi, type ApiResult } from "@/core/api/client";
import { inventoryApi } from "@/modules/inventory/api";
import { getInventoryOptions, getInventorySettings } from "@/modules/inventory/queries";
import type { ServiceInvoiceEditorInitial, ServiceInvoiceEditorLine, ServiceInvoiceEditorOptions } from "./components/service-invoice-editor";
import { serviceInvoiceApi } from "./service-invoice-api";
import type { ServiceInvoice } from "./service-invoice-types";

/** Everything the service invoice screen picks from (the shared inventory lookups, open to SERVICE_INVOICE.V/M). */
export async function loadServiceInvoiceEditorOptions(): Promise<ApiResult<ServiceInvoiceEditorOptions>> {
  const [options, settings] = await Promise.all([getInventoryOptions(), getInventorySettings()]);
  if (!options.ok) return options;
  if (!settings.ok) return settings;
  return {
    ok: true,
    data: {
      warehouses: options.data.warehouses.map((w) => ({ id: w.id, name: w.name, isActive: w.isActive })),
      taxGroups: options.data.taxGroups,
      pricesIncludeTax: settings.data.pricesIncludeTax,
      defaultWarehouseId: settings.data.defaultWarehouseId,
    },
  };
}

let seed = 0;

/** The editor's starting values for a saved draft: its header, customer and lines (with all units). */
export async function loadServiceInvoiceEditorInitial(invoice: ServiceInvoice): Promise<ApiResult<ServiceInvoiceEditorInitial>> {
  const [products, customers] = await Promise.all([
    invoice.lines.length > 0
      ? tryApi(() => inventoryApi.getLineProducts(invoice.lines.map((l) => l.productId)))
      : Promise.resolve({ ok: true as const, data: [] }),
    invoice.customerId
      ? tryApi(() => serviceInvoiceApi.customers({ ids: String(invoice.customerId) }))
      : Promise.resolve({ ok: true as const, data: [] }),
  ]);
  if (!products.ok) return products;
  if (!customers.ok) return customers;
  const byId = new Map(products.data.map((p) => [p.id, p]));

  const lines: ServiceInvoiceEditorLine[] = invoice.lines.map((line) => {
    const product = byId.get(line.productId);
    return {
      key: `saved-${line.id}-${seed++}`,
      productId: line.productId,
      productCode: line.productCode,
      productName: line.productName,
      productType: line.productType,
      trackingType: line.trackingType,
      baseUnitCode: line.baseUnitCode,
      units: product
        ? product.units.map((u) => ({ unitId: u.unitId, unitCode: u.unitCode, conversionFactor: u.conversionFactor, salePrice: u.salePrice }))
        : [{ unitId: line.unitId, unitCode: line.unitCode, conversionFactor: line.conversionFactor, salePrice: null }],
      baseSalePrice: product?.salePrice ?? line.unitPrice / (line.conversionFactor || 1),
      unitId: line.unitId,
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
      discountPercent: String(line.discountPercent),
      taxGroupId: line.taxGroupId,
      batchId: line.batchId,
      // Stock is per warehouse; the lookup by id doesn't say, so no stock hint on a reopened draft.
      stock: null,
    };
  });

  return {
    ok: true,
    data: {
      date: invoice.invoiceDate,
      saleType: invoice.saleType,
      customer: customers.data[0] ?? null,
      customerName: invoice.customerId ? "" : (invoice.customerName ?? ""),
      customerMobile: invoice.customerId ? "" : (invoice.customerMobile ?? ""),
      warehouseId: invoice.warehouseId,
      dueDate: invoice.dueDate ?? "",
      serviceAmount: invoice.serviceAmount ? String(invoice.serviceAmount) : "",
      extraDiscount: invoice.extraDiscountAmount ? String(invoice.extraDiscountAmount) : "",
      charge: invoice.chargeAmount ? String(invoice.chargeAmount) : "",
      roundOff: invoice.roundOffAmount ? String(invoice.roundOffAmount) : "",
      paidAmount: invoice.saleType === "Credit" && invoice.paidAmount ? String(invoice.paidAmount) : "",
      paymentMethod: invoice.paymentMethod ?? "Cash",
      paymentProvider: invoice.paymentProvider ?? "",
      paymentReferenceNo: invoice.paymentReferenceNo ?? "",
      serviceNote: invoice.serviceNote ?? "",
      remarks: invoice.remarks ?? "",
      lines,
    },
  };
}
