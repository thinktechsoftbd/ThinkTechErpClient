"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { ProductSearch } from "@/core/documents/product-search";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Input, Select } from "@/core/forms/fields";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatAmount, parseDecimal, round } from "@/core/utils/number";
import type { ProductLookupItem, ProductUnit } from "@/modules/inventory/types";
import type { ServiceJobItem, ServiceJobItemRequest } from "../types";

const muted = "text-gray-500 dark:text-gray-400";

type Row = {
  key: number;
  productId: number;
  productName: string;
  productCode: string;
  productType: string;
  trackingType: string;
  units: ProductUnit[];
  unitId: number;
  quantity: string;
  unitPrice: string;
  discount: string;
  covered: boolean;
  serialNo: string;
  description: string;
};

let nextKey = 1;

const serialPart = (row: Pick<Row, "productType" | "trackingType">) => row.productType === "Stock" && row.trackingType === "Serial";

function fromItem(item: ServiceJobItem, product: ProductLookupItem | undefined): Row {
  return {
    key: nextKey++,
    productId: item.productId,
    productName: item.productName,
    productCode: item.productCode,
    productType: item.productType,
    trackingType: item.trackingType,
    units: product?.units.length ? product.units : [{ unitId: item.unitId, unitCode: item.unitCode, unitName: item.unitCode, conversionFactor: 1, salePrice: null, isPurchaseDefault: false, isSaleDefault: true }],
    unitId: item.unitId,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    discount: item.discountAmount ? String(item.discountAmount) : "",
    covered: item.isWarrantyCovered,
    serialNo: item.serialNo ?? "",
    description: item.description ?? "",
  };
}

function fromProduct(product: ProductLookupItem, warrantyJob: boolean): Row {
  const unit = product.units.find((u) => u.isSaleDefault) ?? product.units[0];
  const factor = unit?.conversionFactor ?? 1;
  return {
    key: nextKey++,
    productId: product.id,
    productName: product.name,
    productCode: product.code,
    productType: product.productType,
    trackingType: product.trackingType,
    units: product.units,
    unitId: unit?.unitId ?? product.baseUnitId,
    quantity: "1",
    unitPrice: String(unit?.salePrice ?? round(product.salePrice * factor, 2)),
    discount: "",
    // On a warranty job, parts and labour are usually free.
    covered: warrantyJob,
    serialNo: "",
    description: "",
  };
}

const lineTotal = (row: Row) => (row.covered ? 0 : Math.max(0, round((parseDecimal(row.quantity) ?? 0) * (parseDecimal(row.unitPrice) ?? 0), 4) - (parseDecimal(row.discount) ?? 0)));

/**
 * The parts fitted and the service charges of a job (both are products: a stock part, a Service product for labour).
 * On a warranty job a line can be covered by the warranty (free). The job is billed from these lines.
 */
export function JobItemsEditor({
  action,
  items,
  products,
  warrantyJob,
}: {
  action: FormAction;
  items: ServiceJobItem[];
  /** The products of the saved items, with their units. */
  products: ProductLookupItem[];
  warrantyJob: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() => items.map((item) => fromItem(item, products.find((p) => p.id === item.productId))));
  const update = (key: number, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const total = rows.reduce((sum, row) => sum + lineTotal(row), 0);

  function payload(): { items: ServiceJobItemRequest[] } {
    return {
      items: rows.map((row) => ({
        productId: row.productId,
        description: row.description.trim() || null,
        unitId: row.unitId,
        quantity: parseDecimal(row.quantity) ?? 0,
        serialNo: serialPart(row) ? row.serialNo.trim() || null : null,
        unitPrice: row.covered ? 0 : (parseDecimal(row.unitPrice) ?? 0),
        discountAmount: row.covered ? 0 : (parseDecimal(row.discount) ?? 0),
        isWarrantyCovered: row.covered,
        remarks: null,
      })),
    };
  }

  return (
    <ActionForm action={action}>
      <input type="hidden" name="payload" value={JSON.stringify(payload())} />
      <div className="px-5 pt-4">
        <FormMessage />
      </div>
      <div className="px-5 py-4">
        <ProductSearch onPick={(product) => setRows((current) => [...current, fromProduct(product, warrantyJob)])} placeholder="Add a part or service charge: search by name or code" />
      </div>
      {rows.length === 0 ? (
        <p className={`px-5 pb-5 text-sm ${muted}`}>No parts or charges yet. Add a stock part, or a Service product for labour (e.g. OS installation).</p>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Item</TH>
              <TH className="w-28">Unit</TH>
              <TH className="w-24 text-right">Qty</TH>
              <TH className="w-32 text-right">Price</TH>
              <TH className="w-28 text-right">Discount</TH>
              {warrantyJob && <TH className="w-24">Warranty</TH>}
              <TH className="w-28 text-right">Total</TH>
              <TH className="w-10" />
            </tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.key}>
                <TD>
                  <span className="font-medium text-gray-800 dark:text-white/90">{row.productName}</span>
                  <span className={`block text-xs ${muted}`}>
                    {row.productCode}
                    {row.productType === "Service" && " · service charge"}
                  </span>
                  <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                    {serialPart(row) && (
                      <Input value={row.serialNo} maxLength={100} placeholder="Serial no. fitted" aria-label="Serial number" onChange={(e) => update(row.key, { serialNo: e.target.value })} />
                    )}
                    <Input value={row.description} maxLength={500} placeholder="Note on the bill (optional)" aria-label="Description" onChange={(e) => update(row.key, { description: e.target.value })} />
                  </div>
                </TD>
                <TD>
                  <Select value={row.unitId} aria-label="Unit" onChange={(e) => update(row.key, { unitId: Number(e.target.value) })}>
                    {row.units.map((u) => (
                      <option key={u.unitId} value={u.unitId}>
                        {u.unitCode}
                      </option>
                    ))}
                  </Select>
                </TD>
                <TD>
                  <Input value={row.quantity} inputMode="decimal" className="text-right" aria-label="Quantity" disabled={serialPart(row)} onChange={(e) => update(row.key, { quantity: e.target.value })} />
                </TD>
                <TD>
                  <Input value={row.covered ? "0" : row.unitPrice} inputMode="decimal" className="text-right" aria-label="Price" disabled={row.covered} onChange={(e) => update(row.key, { unitPrice: e.target.value })} />
                </TD>
                <TD>
                  <Input value={row.covered ? "" : row.discount} inputMode="decimal" className="text-right" aria-label="Discount" disabled={row.covered} onChange={(e) => update(row.key, { discount: e.target.value })} />
                </TD>
                {warrantyJob && (
                  <TD>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" className="size-4 accent-brand-500" checked={row.covered} onChange={(e) => update(row.key, { covered: e.target.checked })} />
                      Free
                    </label>
                  </TD>
                )}
                <TD className="text-right tabular-nums">{formatAmount(lineTotal(row))}</TD>
                <TD>
                  <button type="button" aria-label={`Remove ${row.productName}`} onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <div className="flex flex-wrap items-center justify-end gap-4 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Customer pays <span className="font-semibold text-gray-800 tabular-nums dark:text-white/90">{formatAmount(total)}</span>
          <span className={`ml-1 text-xs ${muted}`}>(before tax)</span>
        </span>
        <SubmitButton pendingLabel="Saving…">Save items</SubmitButton>
      </div>
    </ActionForm>
  );
}
