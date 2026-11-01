import "server-only";
import { tryApi, type ApiResult } from "@/core/api/client";
import { round } from "@/core/utils/number";
import { inventoryApi } from "@/modules/inventory/api";
import type { ProductLookupItem } from "@/modules/inventory/types";
import { getCurrencyOptions, getInventoryOptions, getInventorySettings } from "@/modules/inventory/queries";
import type { EditorCharge, EditorLine, PurchaseEditorOptions } from "./components/purchase-document-editor";
import { getSupplierOptions } from "./queries";
import type { PurchaseCharge, PurchaseLine } from "./types";

/** Everything a purchase document editor picks from, in one result. */
export async function loadPurchaseEditorOptions(): Promise<ApiResult<PurchaseEditorOptions>> {
  const [suppliers, options, settings, currencies] = await Promise.all([
    getSupplierOptions(),
    getInventoryOptions(),
    getInventorySettings(),
    getCurrencyOptions(),
  ]);
  if (!suppliers.ok) return suppliers;
  if (!options.ok) return options;
  if (!settings.ok) return settings;
  if (!currencies.ok) return currencies;
  return {
    ok: true,
    data: {
      suppliers: suppliers.data,
      warehouses: options.data.warehouses.map((w) => ({ id: w.id, name: w.name, isActive: w.isActive })),
      taxGroups: options.data.taxGroups,
      currencies: currencies.data,
      baseCurrencyId: settings.data.baseCurrencyLookupDataId,
      pricesIncludeTax: settings.data.pricesIncludeTax,
      defaultWarehouseId: settings.data.defaultWarehouseId,
    },
  };
}

/** The line products (with all their units), by id. */
export async function loadLineProducts(lines: { productId: number }[]) {
  return tryApi(async () => new Map((await inventoryApi.getLineProducts(lines.map((l) => l.productId))).map((p) => [p.id, p])));
}

let seed = 0;

/**
 * Editor lines from a saved document's lines (editing a draft), or from a source to copy from:
 * `quantityOf` then gives the quantity still open (e.g. ordered - received) and lines with none left
 * are dropped.
 */
export function editorLinesFrom(
  lines: PurchaseLine[],
  products: Map<number, ProductLookupItem>,
  copy?: {
    quantityOf: (line: PurchaseLine) => number;
    hint?: (line: PurchaseLine, open: number) => string;
    link: (line: PurchaseLine) => Partial<Pick<EditorLine, "purchaseOrderLineId" | "goodsReceiptLineId" | "purchaseInvoiceLineId">>;
    keepTax?: boolean;
  },
): EditorLine[] {
  const result: EditorLine[] = [];
  for (const line of lines) {
    const open = copy ? round(copy.quantityOf(line), 4) : line.quantity;
    if (copy && open <= 0) continue;
    const product = products.get(line.productId);
    const units = product?.units.map((u) => ({ unitId: u.unitId, unitCode: u.unitCode, conversionFactor: u.conversionFactor })) ?? [
      { unitId: line.unitId, unitCode: line.unitCode, conversionFactor: line.conversionFactor },
    ];
    result.push({
      key: `d${line.id}-${seed++}`,
      productId: line.productId,
      productCode: line.productCode,
      productName: line.productName,
      productType: line.productType,
      trackingType: line.trackingType,
      hasExpiry: line.hasExpiry,
      baseUnitCode: line.baseUnitCode,
      units,
      unitId: line.unitId,
      quantity: String(open),
      unitPrice: String(line.unitPrice),
      discountPercent: String(line.discountPercent ?? 0),
      taxGroupId: copy && !copy.keepTax ? (line.taxGroupId ?? product?.purchaseTaxGroupId ?? null) : line.taxGroupId,
      batchNo: copy ? "" : (line.batchNo ?? ""),
      manufactureDate: copy ? "" : (line.manufactureDate ?? ""),
      expiryDate: copy ? "" : (line.expiryDate ?? ""),
      batchId: line.batchId,
      serialNos: copy ? "" : line.serialNos.join("\n"),
      description: line.description ?? "",
      purchaseOrderLineId: copy ? null : line.purchaseOrderLineId,
      goodsReceiptLineId: copy ? null : line.goodsReceiptLineId,
      purchaseInvoiceLineId: copy ? null : line.purchaseInvoiceLineId,
      ...(copy ? copy.link(line) : {}),
      hint: copy?.hint?.(line, open),
    });
  }
  return result;
}

export function editorChargesFrom(charges: PurchaseCharge[]): EditorCharge[] {
  return charges.map((charge) => ({
    key: `c${charge.id}`,
    chargeName: charge.chargeName,
    amount: String(charge.amount),
    allocationMethod: charge.allocationMethod,
    onSupplierBill: charge.onSupplierBill,
  }));
}
