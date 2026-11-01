import "server-only";
import { tryApi, type ApiResult } from "@/core/api/client";
import { round } from "@/core/utils/number";
import { getInventoryOptions } from "@/modules/inventory/queries";
import { salesApi } from "./api";
import type { SalesInvoice, SalesReturn } from "./types";
import type { ReturnEditorHistory, ReturnEditorWarehouse } from "./components/return-editor";

export type ReturnEditorData = { warehouses: ReturnEditorWarehouse[]; history: ReturnEditorHistory };

/** The sale's posted returns (the search also matches similar numbers, so they are kept by id). */
async function postedReturnsOf(sale: SalesInvoice): Promise<ApiResult<SalesReturn[]>> {
  const result = await tryApi(() => salesApi.returns.list({ search: sale.invoiceNo, status: "Posted", limit: 100, offset: 0 }));
  return result.ok ? { ok: true, data: result.data.items.filter((item) => item.salesInvoiceId === sale.id) } : result;
}

/**
 * What the return screen needs beside the sale: the warehouses, and what earlier posted returns
 * already took (money refunded, serial numbers brought back). The history is a hint for the screen:
 * when it can't be loaded the editor goes without it and the API still checks.
 */
export async function loadReturnEditorData(sale: SalesInvoice): Promise<ApiResult<ReturnEditorData>> {
  const [options, posted] = await Promise.all([getInventoryOptions(), postedReturnsOf(sale)]);
  if (!options.ok) return options;
  const warehouses = options.data.warehouses.map((w) => ({ id: w.id, name: w.name, isActive: w.isActive }));
  if (!posted.ok) return { ok: true, data: { warehouses, history: { refundRoom: null, returnedSerials: {} } } };

  // As the API counts it: paid at the counter plus receipts against the sale, less what was refunded.
  const received = sale.allocations.filter((a) => a.sourceType === "Receipt").reduce((sum, a) => sum + a.amount, 0);
  const refunded = posted.data.filter((r) => r.settlementType === "Refund").reduce((sum, r) => sum + r.totalAmount, 0);
  const refundRoom = round(sale.paidAmount + received - refunded, 2);

  // Which serial numbers came back is on each return's lines, which the list leaves out.
  const serialLines = new Set(
    sale.lines.filter((l) => l.trackingType === "Serial" && l.returnedQuantity > 0).map((l) => l.id),
  );
  const returnedSerials: Record<string, string[]> = {};
  if (serialLines.size > 0) {
    const details = await Promise.all(posted.data.map((item) => tryApi(() => salesApi.returns.get(item.id))));
    for (const detail of details) {
      if (!detail.ok) continue;
      for (const line of detail.data.lines) {
        if (line.salesInvoiceLineId === null || !serialLines.has(line.salesInvoiceLineId)) continue;
        const key = String(line.salesInvoiceLineId);
        returnedSerials[key] = [...(returnedSerials[key] ?? []), ...line.serialNos];
      }
    }
  }

  return { ok: true, data: { warehouses, history: { refundRoom, returnedSerials } } };
}
