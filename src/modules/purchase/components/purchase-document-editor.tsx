"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { computeLine } from "@/core/documents/line-math";
import { ProductSearch } from "@/core/documents/product-search";
import { ActionForm, FieldError, FormMessage, useFormState } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Checkbox, Field, Input, Label, Select, Textarea } from "@/core/forms/fields";
import { buttonClasses } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { cn } from "@/core/utils/cn";
import { formatAmount, formatQuantity, parseDecimal, round, todayIso } from "@/core/utils/number";
import type { BatchStockItem, ProductLookupItem, TaxGroupOption } from "@/modules/inventory/types";
import {
  ON_THE_SPOT_METHODS,
  RETURN_REASONS,
  purchaseLabel,
  type GoodsReceiptUpsertRequest,
  type PurchaseChargeRequest,
  type PurchaseInvoiceUpsertRequest,
  type PurchaseLineRequest,
  type PurchaseOrderUpsertRequest,
  type PurchaseReturnUpsertRequest,
  type SupplierOption,
} from "../types";
import type { SubmitIntentValue } from "@/modules/inventory/components/documents/intent-submit";
import { PaymentSourceFields } from "./payment-source-fields";
import { SupplierPicker, fetchSupplierOption } from "./supplier-picker";

export type PurchaseEditorMode = "invoice" | "order" | "receipt" | "return";

export type EditorUnit = { unitId: number; unitCode: string; conversionFactor: number };

export type EditorLine = {
  key: string;
  productId: number;
  productCode: string;
  productName: string;
  productType: string;
  trackingType: string;
  hasExpiry: boolean;
  baseUnitCode: string;
  units: EditorUnit[];
  unitId: number;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxGroupId: number | null;
  batchNo: string;
  manufactureDate: string;
  expiryDate: string;
  batchId: number | null;
  /** One per line or comma separated. */
  serialNos: string;
  description: string;
  purchaseOrderLineId: number | null;
  goodsReceiptLineId: number | null;
  purchaseInvoiceLineId: number | null;
  /** Shown under the line, e.g. "4 of 10 still to receive". */
  hint?: string;
};

export type EditorCharge = {
  key: string;
  chargeName: string;
  amount: string;
  allocationMethod: "Value" | "Quantity";
  onSupplierBill: boolean;
};

/** Header values to start from: an existing draft, or a prefill (from an order or a receipt). */
export type PurchaseEditorInitial = {
  date?: string;
  supplierId?: number | null;
  supplierName?: string;
  supplierMobile?: string;
  purchaseType?: "Cash" | "Credit";
  receivesStock?: boolean;
  warehouseId?: number | null;
  purchaseOrderId?: number | null;
  purchaseOrderNo?: string | null;
  goodsReceiptId?: number | null;
  goodsReceiptNo?: string | null;
  purchaseInvoiceId?: number | null;
  purchaseInvoiceNo?: string | null;
  dueDate?: string;
  supplierInvoiceNo?: string;
  supplierInvoiceDate?: string;
  taxInvoiceNo?: string;
  currencyId?: number | null;
  exchangeRate?: string;
  roundOff?: string;
  paidAmount?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  paymentReferenceNo?: string;
  /** The saved payment source line and its header, for the picker. */
  paymentSourceDId?: number | null;
  paymentSourceId?: number | null;
  paymentSourceName?: string;
  expectedDate?: string;
  supplierReference?: string;
  paymentTermsDays?: string;
  chargeAmount?: string;
  termsAndConditions?: string;
  supplierChallanNo?: string;
  supplierChallanDate?: string;
  reason?: string;
  settlementType?: "AdjustDue" | "Refund";
  refundMethod?: string;
  refundProvider?: string;
  refundReferenceNo?: string;
  remarks?: string;
  lines?: EditorLine[];
  charges?: EditorCharge[];
};

/** Suppliers aren't listed here: the supplier box searches the server. */
export type PurchaseEditorOptions = {
  warehouses: { id: number; name: string; isActive: boolean }[];
  taxGroups: TaxGroupOption[];
  currencies: { id: number; name: string }[];
  baseCurrencyId: number | null;
  pricesIncludeTax: boolean;
  defaultWarehouseId: number | null;
};

let keySeed = 0;
const newKey = () => `k${Date.now().toString(36)}${(keySeed++).toString(36)}`;
const num = (value: string, fallback = 0) => parseDecimal(value) ?? fallback;
const orNull = (value: string | undefined | null) => (value && value.trim() ? value.trim() : null);
const splitSerials = (value: string) =>
  value
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/** A line for a product picked in the search box: its default purchase unit, last cost and tax. */
export function lineFromProduct(product: ProductLookupItem, mode: PurchaseEditorMode): EditorLine {
  const unit =
    product.units.find((u) => u.unitId === product.matchedUnitId) ??
    product.units.find((u) => u.isPurchaseDefault) ??
    product.units.find((u) => u.unitId === product.baseUnitId) ??
    product.units[0];
  return {
    key: newKey(),
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    productType: product.productType,
    trackingType: product.trackingType,
    hasExpiry: product.hasExpiry,
    baseUnitCode: product.baseUnitCode,
    units: product.units.map((u) => ({ unitId: u.unitId, unitCode: u.unitCode, conversionFactor: u.conversionFactor })),
    unitId: unit?.unitId ?? product.baseUnitId,
    quantity: "1",
    unitPrice: String(round(product.lastPurchaseCost * (unit?.conversionFactor ?? 1), 4)),
    discountPercent: "0",
    taxGroupId: mode === "receipt" ? null : product.purchaseTaxGroupId,
    batchNo: "",
    manufactureDate: "",
    expiryDate: "",
    batchId: null,
    serialNos: "",
    description: "",
    purchaseOrderLineId: null,
    goodsReceiptLineId: null,
    purchaseInvoiceLineId: null,
  };
}

const sectionTitle: Record<PurchaseEditorMode, string> = {
  invoice: "Invoice details",
  order: "Order details",
  receipt: "Receipt details",
  return: "Return details",
};

export function PurchaseDocumentEditor({
  mode,
  action,
  options,
  initial = {},
  canPost,
  cancelHref,
  postLabel,
  returnTo,
}: {
  mode: PurchaseEditorMode;
  action: FormAction;
  options: PurchaseEditorOptions;
  initial?: PurchaseEditorInitial;
  /** Show "Save & post" (the user may post). */
  canPost: boolean;
  cancelHref: string;
  /** e.g. "Save & approve" for orders. */
  postLabel?: string;
  /** In a popup over the list: saving returns to the list; Cancel closes the popup. */
  returnTo?: string;
}) {
  const router = useRouter();
  const [header, setHeader] = useState(() => ({
    date: initial.date ?? todayIso(),
    supplierId: initial.supplierId ?? null,
    supplierName: initial.supplierName ?? "",
    supplierMobile: initial.supplierMobile ?? "",
    // "Add new supplier": saving adds the supplier (name, mobile, address line 1) to the supplier list.
    addSupplier: false,
    supplierAddressLine1: "",
    purchaseType: initial.purchaseType ?? ("Cash" as "Cash" | "Credit"),
    warehouseId: initial.warehouseId ?? options.defaultWarehouseId ?? options.warehouses.find((w) => w.isActive)?.id ?? null,
    dueDate: initial.dueDate ?? "",
    supplierInvoiceNo: initial.supplierInvoiceNo ?? "",
    supplierInvoiceDate: initial.supplierInvoiceDate ?? "",
    taxInvoiceNo: initial.taxInvoiceNo ?? "",
    currencyId: initial.currencyId ?? options.baseCurrencyId,
    exchangeRate: initial.exchangeRate ?? "1",
    roundOff: initial.roundOff ?? "0",
    paidAmount: initial.paidAmount ?? "0",
    paymentMethod: initial.paymentMethod ?? "Cash",
    paymentProvider: initial.paymentProvider ?? "",
    paymentReferenceNo: initial.paymentReferenceNo ?? "",
    paymentSourceDId: initial.paymentSourceDId ?? null,
    expectedDate: initial.expectedDate ?? "",
    supplierReference: initial.supplierReference ?? "",
    paymentTermsDays: initial.paymentTermsDays ?? "0",
    chargeAmount: initial.chargeAmount ?? "0",
    termsAndConditions: initial.termsAndConditions ?? "",
    supplierChallanNo: initial.supplierChallanNo ?? "",
    supplierChallanDate: initial.supplierChallanDate ?? "",
    reason: initial.reason ?? "Damaged",
    settlementType: initial.settlementType ?? ("AdjustDue" as "AdjustDue" | "Refund"),
    refundMethod: initial.refundMethod ?? "Cash",
    refundProvider: initial.refundProvider ?? "",
    refundReferenceNo: initial.refundReferenceNo ?? "",
    remarks: initial.remarks ?? "",
  }));
  // The chosen supplier's details (balance, terms); header.supplierId is what is saved.
  const [supplierDetails, setSupplierDetails] = useState<SupplierOption | null>(null);
  const [lines, setLines] = useState<EditorLine[]>(initial.lines ?? []);
  const [charges, setCharges] = useState<EditorCharge[]>(initial.charges ?? []);

  // The draft's or the source document's supplier comes from the server; a picked one brings its own details.
  useEffect(() => {
    const id = initial.supplierId;
    if (!id) return;
    let current = true;
    fetchSupplierOption(id).then((option) => {
      if (!current) return;
      setSupplierDetails(
        (details) =>
          details ??
          option ?? { id, code: "?", name: `Supplier #${id}`, mobile: null, address: null, paymentTermsDays: 0, currencyLookupDataId: null, balance: 0, isActive: true },
      );
    });
    return () => {
      current = false;
    };
  }, [initial.supplierId]);
  // The intent itself is sent by the clicked button (name="intent"); this shows its progress.
  const [submitIntent, setSubmitIntent] = useState<SubmitIntentValue>("save");

  const receivesStock = mode === "receipt" || (mode === "invoice" && initial.receivesStock !== false);
  const billsReceipt = mode === "invoice" && initial.receivesStock === false;
  const fromSource = Boolean(initial.purchaseOrderId || initial.goodsReceiptId || initial.purchaseInvoiceId);
  const hasTax = mode !== "receipt";
  const hasCharges = mode === "invoice" || mode === "receipt";
  const credit = mode !== "invoice" || header.purchaseType === "Credit";
  // An invoice can add its supplier to the supplier list (unless an order or receipt fixed the supplier).
  const canAddSupplier = mode === "invoice" && !(fromSource && initial.supplierId);
  const addingSupplier = canAddSupplier && header.addSupplier;
  const supplierRequired = mode === "order" || mode === "receipt" || (mode === "invoice" && credit && !addingSupplier) ||
    (mode === "return" && header.settlementType === "AdjustDue");
  // Otherwise a cash purchase may name a supplier who isn't on file: the invoice keeps the name and mobile
  // (supplier_name, supplier_mobile) with no supplier_id, and nothing is added to the supplier list.
  const allowsNotOnFile = mode === "invoice" && !credit && !addingSupplier;
  const notOnFileName = allowsNotOnFile && !header.supplierId ? header.supplierName.trim() : "";
  const walkIn = !header.supplierId && mode === "return";
  const foreign = header.currencyId !== null && header.currencyId !== options.baseCurrencyId;
  const taxGroups = useMemo(() => new Map(options.taxGroups.map((g) => [g.id, g])), [options.taxGroups]);
  const set = <K extends keyof typeof header>(key: K, value: (typeof header)[K]) =>
    setHeader((current) => ({ ...current, [key]: value }));

  const amounts = lines.map((line) =>
    computeLine({
      quantity: num(line.quantity),
      unitPrice: num(line.unitPrice),
      discountPercent: num(line.discountPercent),
      rates: line.taxGroupId ? taxGroups.get(line.taxGroupId)?.rates : undefined,
      inclusive: options.pricesIncludeTax,
      withTax: hasTax,
    }),
  );
  const subtotal = amounts.reduce((sum, a) => sum + a.gross, 0);
  const discount = amounts.reduce((sum, a) => sum + a.discount, 0);
  const tax = amounts.reduce((sum, a) => sum + a.tax, 0);
  const linesTotal = amounts.reduce((sum, a) => sum + a.total, 0);
  const chargesOnBill =
    mode === "order"
      ? num(header.chargeAmount)
      : charges.filter((c) => c.onSupplierBill && header.supplierId).reduce((sum, c) => sum + num(c.amount), 0);
  const total = round(linesTotal + (mode === "receipt" ? 0 : chargesOnBill) + (mode === "invoice" ? num(header.roundOff) : 0));
  const paid = mode !== "invoice" ? 0 : credit ? num(header.paidAmount) : total;

  function updateLine(key: string, patch: Partial<EditorLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function changeUnit(line: EditorLine, unitId: number) {
    const from = line.units.find((u) => u.unitId === line.unitId)?.conversionFactor ?? 1;
    const to = line.units.find((u) => u.unitId === unitId)?.conversionFactor ?? 1;
    updateLine(line.key, { unitId, unitPrice: String(round((num(line.unitPrice) / from) * to, 4)) });
  }

  function buildLine(line: EditorLine): PurchaseLineRequest {
    const receiving = receivesStock && line.productType === "Stock";
    return {
      productId: line.productId,
      unitId: line.unitId,
      quantity: num(line.quantity),
      unitPrice: num(line.unitPrice),
      discountPercent: num(line.discountPercent),
      discountAmount: null,
      taxGroupId: hasTax ? line.taxGroupId : null,
      description: orNull(line.description),
      purchaseOrderLineId: line.purchaseOrderLineId,
      goodsReceiptLineId: line.goodsReceiptLineId,
      purchaseInvoiceLineId: line.purchaseInvoiceLineId,
      batchNo: receiving && line.trackingType === "Batch" ? orNull(line.batchNo) : null,
      manufactureDate: receiving && line.trackingType === "Batch" ? orNull(line.manufactureDate) : null,
      expiryDate: receiving && line.trackingType === "Batch" ? orNull(line.expiryDate) : null,
      batchId: mode === "return" && line.trackingType === "Batch" ? line.batchId : null,
      rejectedQuantity: 0,
      serialNos: line.trackingType === "Serial" && (receiving || mode === "return") ? splitSerials(line.serialNos) : [],
      remarks: null,
    };
  }

  function buildCharges(): PurchaseChargeRequest[] {
    return charges
      .filter((c) => c.chargeName.trim() && num(c.amount) > 0)
      .map((c) => ({
        chargeName: c.chargeName.trim(),
        amount: num(c.amount),
        allocationMethod: c.allocationMethod,
        onSupplierBill: c.onSupplierBill && Boolean(header.supplierId),
        payeeSupplierId: null,
      }));
  }

  function payload() {
    const currency = { currencyLookupDataId: header.currencyId, exchangeRate: foreign ? num(header.exchangeRate, 1) : 1 };
    const builtLines = lines.map(buildLine);
    if (mode === "invoice") {
      const body: PurchaseInvoiceUpsertRequest = {
        invoiceDate: header.date,
        purchaseType: header.purchaseType,
        dueDate: credit ? orNull(header.dueDate) : null,
        supplierId: addingSupplier ? null : header.supplierId,
        supplierName: addingSupplier ? orNull(header.supplierName) : orNull(notOnFileName),
        supplierMobile: addingSupplier || notOnFileName ? orNull(header.supplierMobile) : null,
        addSupplier: addingSupplier,
        supplierAddressLine1: addingSupplier ? orNull(header.supplierAddressLine1) : null,
        receivesStock,
        warehouseId: receivesStock ? header.warehouseId : null,
        purchaseOrderId: initial.purchaseOrderId ?? null,
        supplierInvoiceNo: orNull(header.supplierInvoiceNo),
        supplierInvoiceDate: orNull(header.supplierInvoiceDate),
        taxInvoiceNo: orNull(header.taxInvoiceNo),
        ...currency,
        roundOffAmount: num(header.roundOff),
        paidAmount: credit ? num(header.paidAmount) : 0,
        paymentMethod: paid > 0 ? header.paymentMethod : null,
        paymentProvider: paid > 0 ? orNull(header.paymentProvider) : null,
        paymentReferenceNo: paid > 0 ? orNull(header.paymentReferenceNo) : null,
        invPaymentSourceDId: header.paymentSourceDId,
        remarks: orNull(header.remarks),
        lines: builtLines,
        charges: buildCharges(),
      };
      return body;
    }
    if (mode === "order") {
      const body: PurchaseOrderUpsertRequest = {
        orderDate: header.date,
        expectedDate: orNull(header.expectedDate),
        supplierId: header.supplierId ?? 0,
        warehouseId: header.warehouseId ?? 0,
        supplierReference: orNull(header.supplierReference),
        ...currency,
        paymentTermsDays: Math.max(0, Math.trunc(num(header.paymentTermsDays))),
        chargeAmount: num(header.chargeAmount),
        termsAndConditions: orNull(header.termsAndConditions),
        remarks: orNull(header.remarks),
        lines: builtLines,
      };
      return body;
    }
    if (mode === "receipt") {
      const body: GoodsReceiptUpsertRequest = {
        receiptDate: header.date,
        supplierId: header.supplierId ?? 0,
        warehouseId: header.warehouseId ?? 0,
        purchaseOrderId: initial.purchaseOrderId ?? null,
        supplierChallanNo: orNull(header.supplierChallanNo),
        supplierChallanDate: orNull(header.supplierChallanDate),
        ...currency,
        remarks: orNull(header.remarks),
        lines: builtLines,
        charges: buildCharges(),
      };
      return body;
    }
    const body: PurchaseReturnUpsertRequest = {
      returnDate: header.date,
      supplierId: header.supplierId,
      supplierName: header.supplierId ? null : orNull(header.supplierName),
      warehouseId: header.warehouseId ?? 0,
      goodsReceiptId: initial.goodsReceiptId ?? null,
      purchaseInvoiceId: initial.purchaseInvoiceId ?? null,
      reason: header.reason,
      settlementType: header.settlementType,
      refundMethod: header.settlementType === "Refund" ? header.refundMethod : null,
      refundProvider: header.settlementType === "Refund" ? orNull(header.refundProvider) : null,
      refundReferenceNo: header.settlementType === "Refund" ? orNull(header.refundReferenceNo) : null,
      ...currency,
      remarks: orNull(header.remarks),
      lines: builtLines,
    };
    return body;
  }

  const supplier = supplierDetails && supplierDetails.id === header.supplierId ? supplierDetails : null;
  const activeWarehouses = options.warehouses.filter((w) => w.isActive || w.id === header.warehouseId);

  return (
    <ActionForm action={action} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload())} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <FormMessage />

      {(initial.purchaseOrderNo || initial.goodsReceiptNo || initial.purchaseInvoiceNo) && (
        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {initial.purchaseOrderNo && <>Against purchase order <strong>{initial.purchaseOrderNo}</strong>. </>}
            {initial.goodsReceiptNo && (
              <>
                {billsReceipt ? "Billing" : "Against"} goods receipt <strong>{initial.goodsReceiptNo}</strong>
                {billsReceipt && ": the stock came in on the receipt, so this bill only records what is owed"}.{" "}
              </>
            )}
            {initial.purchaseInvoiceNo && <>Returning goods from invoice <strong>{initial.purchaseInvoiceNo}</strong>.</>}
          </span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title={sectionTitle[mode]} />
            <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {mode === "invoice" && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="purchaseType">Purchase type</Label>
                  <div id="purchaseType" role="radiogroup" className="inline-flex rounded-lg border border-gray-300 p-1 dark:border-gray-700">
                    {(["Cash", "Credit"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={header.purchaseType === type}
                        onClick={() => set("purchaseType", type)}
                        className={cn(
                          "rounded-md px-4 py-1.5 text-sm font-medium",
                          header.purchaseType === type
                            ? "bg-brand-500 text-white"
                            : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
                        )}
                      >
                        {type === "Cash" ? "Cash (paid now)" : "Credit (pay later)"}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {credit
                      ? "The unpaid part goes to the supplier's dues: pick a supplier on file, or type a new name to add them."
                      : "Paid in full now. Pick a supplier on file, type the name of one who isn't, or tick Add new supplier."}
                  </p>
                </div>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label htmlFor="supplierId" className="text-sm font-medium text-gray-700 dark:text-gray-400">
                    Supplier
                    {(supplierRequired || addingSupplier) && <span className="text-red-500"> *</span>}
                  </label>
                  {canAddSupplier && (
                    // On credit the box only shows what happens: a name not on file ticks it (a credit purchase
                    // needs its supplier on file), and clearing the name goes back to the search.
                    <label
                      title={credit ? "On credit, a name not on file is added to the supplier list. Clear the name to search again." : undefined}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
                        credit ? "cursor-not-allowed" : "cursor-pointer hover:bg-brand-100 dark:hover:bg-brand-500/20",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border-gray-300 accent-brand-500 dark:border-gray-700"
                        checked={header.addSupplier}
                        disabled={credit}
                        // A new supplier replaces the one picked; a name already typed is kept.
                        onChange={(e) => setHeader((current) => ({ ...current, addSupplier: e.target.checked, supplierId: null }))}
                      />
                      Add new supplier
                    </label>
                  )}
                </div>
                {addingSupplier ? (
                  <div className="relative">
                    <Input
                      id="supplierId"
                      value={header.supplierName}
                      maxLength={250}
                      required
                      autoComplete="off"
                      placeholder="The new supplier's name"
                      className={credit ? "pr-9" : undefined}
                      onChange={(e) => set("supplierName", e.target.value)}
                      // On credit, leaving the name empty goes back to the search.
                      onBlur={() => credit && !header.supplierName.trim() && setHeader((current) => ({ ...current, addSupplier: false, supplierName: "" }))}
                    />
                    {credit && (
                      <button
                        type="button"
                        onClick={() => setHeader((current) => ({ ...current, addSupplier: false, supplierName: "" }))}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-red-500"
                        aria-label="Clear the name and search the suppliers"
                        title="Clear the name and search the suppliers"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                ) : (
                  <SupplierPicker
                    id="supplierId"
                    value={supplier}
                    newName={notOnFileName}
                    loadingValue={Boolean(header.supplierId) && !supplier}
                    required={supplierRequired}
                    disabled={fromSource && Boolean(initial.supplierId)}
                    placeholder={allowsNotOnFile ? "Search, or type a name…" : "Search name, code or mobile…"}
                    onChange={(picked) => {
                      setSupplierDetails(picked);
                      setHeader((current) => ({
                        ...current,
                        supplierId: picked?.id ?? null,
                        supplierName: "",
                        paymentTermsDays: picked ? String(picked.paymentTermsDays) : current.paymentTermsDays,
                        currencyId: picked?.currencyLookupDataId ?? current.currencyId,
                      }));
                    }}
                    onNewName={
                      allowsNotOnFile
                        ? (name) => setHeader((current) => ({ ...current, supplierId: null, supplierName: name }))
                        : canAddSupplier
                          ? // Credit: a name not on file ticks "Add new supplier", keeping the name.
                            (name) =>
                              name && setHeader((current) => ({ ...current, supplierId: null, supplierName: name, addSupplier: true }))
                          : undefined
                    }
                    newNameHint={allowsNotOnFile ? "Leave it typed to use the name on this purchase." : "Leave it typed to add them as a new supplier."}
                  />
                )}
                {supplier && supplier.balance !== 0 && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {supplier.balance > 0 ? "Owed to supplier" : "Advance with supplier"}: {formatAmount(Math.abs(supplier.balance))}
                  </p>
                )}
                {addingSupplier && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {credit
                      ? "Not on file, so saving adds them to the supplier list. Clear the name (×) to search again."
                      : "Saving adds it to the supplier list; the code is numbered for you."}
                  </p>
                )}
                {notOnFileName && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Not on file: kept on this purchase only.</p>
                )}
                <FieldError name="supplierId" />
              </div>

              {(addingSupplier || notOnFileName) && (
                <Field label="Supplier's mobile" name="supplierMobile" required={addingSupplier}>
                  <Input
                    id="supplierMobile"
                    value={header.supplierMobile}
                    maxLength={30}
                    inputMode="tel"
                    placeholder="01XXXXXXXXX"
                    required={addingSupplier}
                    onChange={(e) => set("supplierMobile", e.target.value)}
                  />
                </Field>
              )}
              {addingSupplier && (
                <Field label="Address line 1" name="supplierAddressLine1" required>
                  <Input
                    id="supplierAddressLine1"
                    value={header.supplierAddressLine1}
                    maxLength={250}
                    required
                    onChange={(e) => set("supplierAddressLine1", e.target.value)}
                  />
                </Field>
              )}

              {walkIn && !supplierRequired && (
                <>
                  <Field label="Walk-in supplier name" name="supplierName">
                    <Input id="supplierName" value={header.supplierName} maxLength={250} placeholder="e.g. Karim Traders" onChange={(e) => set("supplierName", e.target.value)} />
                  </Field>
                  <Field label="Mobile" name="supplierMobile">
                    <Input id="supplierMobile" value={header.supplierMobile} maxLength={30} inputMode="tel" onChange={(e) => set("supplierMobile", e.target.value)} />
                  </Field>
                </>
              )}

              <Field label={{ invoice: "Invoice date", order: "Order date", receipt: "Receipt date", return: "Return date" }[mode]} name="date" required>
                <Input id="date" type="date" value={header.date} onChange={(e) => set("date", e.target.value)} required />
              </Field>

              {(receivesStock || mode === "order" || mode === "return") && (
                <Field
                  label={mode === "order" ? "Deliver to" : mode === "return" ? "Return from warehouse" : "Receive into warehouse"}
                  name="warehouseId"
                  required
                >
                  <Select id="warehouseId" value={header.warehouseId ?? ""} onChange={(e) => set("warehouseId", e.target.value ? Number(e.target.value) : null)} required>
                    <option value="" disabled>
                      Choose a warehouse
                    </option>
                    {activeWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {mode === "invoice" && (
                <>
                  <Field label="Supplier's invoice no" name="supplierInvoiceNo" hint="The number on the supplier's bill or memo.">
                    <Input id="supplierInvoiceNo" value={header.supplierInvoiceNo} maxLength={60} onChange={(e) => set("supplierInvoiceNo", e.target.value)} />
                  </Field>
                  <Field label="Supplier's invoice date" name="supplierInvoiceDate">
                    <Input id="supplierInvoiceDate" type="date" value={header.supplierInvoiceDate} onChange={(e) => set("supplierInvoiceDate", e.target.value)} />
                  </Field>
                  <Field label="VAT invoice no" name="taxInvoiceNo" hint="Bangladesh: Mushak-6.3 number, to claim input VAT.">
                    <Input id="taxInvoiceNo" value={header.taxInvoiceNo} maxLength={60} onChange={(e) => set("taxInvoiceNo", e.target.value)} />
                  </Field>
                  {credit && (
                    <Field label="Due date" name="dueDate" hint={`Empty: ${supplier ? `${supplier.paymentTermsDays} day(s) after the invoice date` : "the invoice date"}.`}>
                      <Input id="dueDate" type="date" value={header.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
                    </Field>
                  )}
                </>
              )}

              {mode === "order" && (
                <>
                  <Field label="Expected delivery" name="expectedDate">
                    <Input id="expectedDate" type="date" value={header.expectedDate} onChange={(e) => set("expectedDate", e.target.value)} />
                  </Field>
                  <Field label="Supplier's quotation / reference" name="supplierReference">
                    <Input id="supplierReference" value={header.supplierReference} maxLength={60} onChange={(e) => set("supplierReference", e.target.value)} />
                  </Field>
                  <Field label="Payment terms (days)" name="paymentTermsDays">
                    <Input id="paymentTermsDays" inputMode="numeric" value={header.paymentTermsDays} onChange={(e) => set("paymentTermsDays", e.target.value)} />
                  </Field>
                </>
              )}

              {mode === "receipt" && (
                <>
                  <Field label="Supplier's challan no" name="supplierChallanNo" hint="The delivery challan that came with the goods.">
                    <Input id="supplierChallanNo" value={header.supplierChallanNo} maxLength={60} onChange={(e) => set("supplierChallanNo", e.target.value)} />
                  </Field>
                  <Field label="Challan date" name="supplierChallanDate">
                    <Input id="supplierChallanDate" type="date" value={header.supplierChallanDate} onChange={(e) => set("supplierChallanDate", e.target.value)} />
                  </Field>
                </>
              )}

              {mode === "return" && (
                <>
                  <Field label="Reason" name="reason" required>
                    <Select id="reason" value={header.reason} onChange={(e) => set("reason", e.target.value)}>
                      {RETURN_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {purchaseLabel(r)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Settle by" name="settlementType" required>
                    <Select id="settlementType" value={header.settlementType} onChange={(e) => set("settlementType", e.target.value as "AdjustDue" | "Refund")}>
                      <option value="AdjustDue">Deduct from what is owed (credit)</option>
                      <option value="Refund">Refund now (cash back)</option>
                    </Select>
                  </Field>
                  {header.settlementType === "Refund" && (
                    <>
                      <Field label="Refund received by" name="refundMethod">
                        <Select id="refundMethod" value={header.refundMethod} onChange={(e) => set("refundMethod", e.target.value)}>
                          {ON_THE_SPOT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {purchaseLabel(m)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Bank / wallet" name="refundProvider">
                        <Input id="refundProvider" value={header.refundProvider} maxLength={100} placeholder="e.g. bKash" onChange={(e) => set("refundProvider", e.target.value)} />
                      </Field>
                      <Field label="Reference / transaction ID" name="refundReferenceNo">
                        <Input id="refundReferenceNo" value={header.refundReferenceNo} maxLength={100} onChange={(e) => set("refundReferenceNo", e.target.value)} />
                      </Field>
                    </>
                  )}
                </>
              )}

              {options.currencies.length > 1 && (
                <>
                  <Field label="Currency" name="currencyId">
                    <Select id="currencyId" value={header.currencyId ?? ""} onChange={(e) => set("currencyId", e.target.value ? Number(e.target.value) : null)}>
                      {options.currencies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {foreign && (
                    <Field label="Exchange rate" name="exchangeRate" hint="1 of this currency in the base currency.">
                      <Input id="exchangeRate" inputMode="decimal" value={header.exchangeRate} onChange={(e) => set("exchangeRate", e.target.value)} />
                    </Field>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Items"
              description={
                billsReceipt
                  ? "Bill what the goods receipt brought in; the price can differ from the receipt."
                  : options.pricesIncludeTax && hasTax
                    ? "Prices include tax (Inventory Settings)."
                    : hasTax
                      ? "Prices exclude tax; the tax is added on top."
                      : "Tax is entered on the supplier's bill, not on the receipt."
              }
            />
            <CardBody className="space-y-4">
              {!billsReceipt && (
                <ProductSearch
                  stockOnly={mode === "receipt" || mode === "return"}
                  warehouseId={mode === "return" ? header.warehouseId : null}
                  onPick={(product) => {
                    const existing = lines.find(
                      (l) => l.productId === product.id && l.trackingType === "None" && !l.purchaseOrderLineId && !l.goodsReceiptLineId,
                    );
                    if (existing && product.trackingType === "None") {
                      updateLine(existing.key, { quantity: String(num(existing.quantity) + 1) });
                    } else setLines((current) => [...current, lineFromProduct(product, mode)]);
                  }}
                />
              )}
              {lines.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Search or scan a product to add the first line.
                </p>
              ) : (
                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <LineRow
                      key={line.key}
                      index={index}
                      line={line}
                      amounts={amounts[index]}
                      mode={mode}
                      hasTax={hasTax}
                      receiving={receivesStock && line.productType === "Stock"}
                      warehouseId={header.warehouseId}
                      taxGroups={options.taxGroups}
                      lockedProduct={billsReceipt}
                      onChange={(patch) => updateLine(line.key, patch)}
                      onUnit={(unitId) => changeUnit(line, unitId)}
                      onRemove={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                    />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {hasCharges && (
            <Card>
              <CardHeader
                title="Landed charges"
                description="Transport, labour, customs and the like: spread over the stock lines' cost."
                actions={
                  <button
                    type="button"
                    className={buttonClasses("outline", "sm")}
                    onClick={() =>
                      setCharges((current) => [
                        ...current,
                        { key: newKey(), chargeName: "", amount: "", allocationMethod: "Value", onSupplierBill: false },
                      ])
                    }
                  >
                    <Plus className="size-4" aria-hidden /> Add charge
                  </button>
                }
              />
              <CardBody className="space-y-3">
                {charges.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No charges. Add van fare or labour here so the product cost includes them.</p>
                ) : (
                  charges.map((charge) => (
                    <div key={charge.key} className="grid items-end gap-3 sm:grid-cols-[1fr_9rem_10rem_auto]">
                      <div>
                        <Label htmlFor={`charge-${charge.key}`}>Charge</Label>
                        <Input
                          id={`charge-${charge.key}`}
                          value={charge.chargeName}
                          maxLength={150}
                          placeholder="e.g. Van fare, Labour, Customs"
                          onChange={(e) => setCharges((c) => c.map((x) => (x.key === charge.key ? { ...x, chargeName: e.target.value } : x)))}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`charge-amount-${charge.key}`}>Amount</Label>
                        <Input
                          id={`charge-amount-${charge.key}`}
                          inputMode="decimal"
                          value={charge.amount}
                          onChange={(e) => setCharges((c) => c.map((x) => (x.key === charge.key ? { ...x, amount: e.target.value } : x)))}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`charge-method-${charge.key}`}>Spread by</Label>
                        <Select
                          id={`charge-method-${charge.key}`}
                          value={charge.allocationMethod}
                          onChange={(e) =>
                            setCharges((c) => c.map((x) => (x.key === charge.key ? { ...x, allocationMethod: e.target.value as "Value" | "Quantity" } : x)))
                          }
                        >
                          <option value="Value">Line value</option>
                          <option value="Quantity">Quantity</option>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3 pb-2.5">
                        {header.supplierId && mode === "invoice" && (
                          <Checkbox
                            label="On supplier's bill"
                            checked={charge.onSupplierBill}
                            onChange={(e) => setCharges((c) => c.map((x) => (x.key === charge.key ? { ...x, onSupplierBill: e.target.checked } : x)))}
                          />
                        )}
                        <button
                          type="button"
                          aria-label="Remove charge"
                          className="text-gray-400 hover:text-red-500"
                          onClick={() => setCharges((c) => c.filter((x) => x.key !== charge.key))}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody className="grid gap-5 sm:grid-cols-2">
              <Field label="Remarks" name="remarks" className={mode === "order" ? "" : "sm:col-span-2"}>
                <Textarea id="remarks" rows={3} maxLength={1000} value={header.remarks} onChange={(e) => set("remarks", e.target.value)} />
              </Field>
              {mode === "order" && (
                <Field label="Terms and conditions" name="termsAndConditions">
                  <Textarea id="termsAndConditions" rows={3} maxLength={4000} value={header.termsAndConditions} onChange={(e) => set("termsAndConditions", e.target.value)} />
                </Field>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader title="Summary" />
            <CardBody className="space-y-2.5 text-sm">
              <SummaryRow label={`Items (${lines.length})`} value={subtotal} />
              {discount > 0 && <SummaryRow label="Discount" value={-discount} />}
              {hasTax && <SummaryRow label={options.pricesIncludeTax ? "Tax (included)" : "Tax"} value={tax} />}
              {mode === "order" ? (
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="chargeAmount">Expected charges</Label>
                  <Input id="chargeAmount" inputMode="decimal" className="h-9 w-28 text-right" value={header.chargeAmount} onChange={(e) => set("chargeAmount", e.target.value)} />
                </div>
              ) : (
                chargesOnBill > 0 && mode !== "receipt" && <SummaryRow label="Charges on bill" value={chargesOnBill} />
              )}
              {mode === "invoice" && (
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="roundOff">Round off</Label>
                  <Input id="roundOff" inputMode="decimal" className="h-9 w-28 text-right" value={header.roundOff} onChange={(e) => set("roundOff", e.target.value)} />
                </div>
              )}
              <div className="border-t border-gray-200 pt-2.5 dark:border-gray-800">
                <SummaryRow label={mode === "receipt" ? "Value received" : "Total"} value={total} strong />
              </div>
              {mode === "invoice" && (
                <>
                  <SummaryRow label="Paid now" value={paid} />
                  <SummaryRow label={credit ? "Due (to supplier's ledger)" : "Due"} value={round(total - paid)} strong />
                </>
              )}
            </CardBody>
          </Card>

          {mode === "invoice" && (
            <Card>
              <CardHeader title={credit ? "Paid now (optional)" : "Payment"} />
              <CardBody className="space-y-4">
                <Field label="Payment Source" name="invPaymentSourceDId" required>
                  <PaymentSourceFields
                    dId={header.paymentSourceDId}
                    initialSourceId={initial.paymentSourceId ?? null}
                    initialName={initial.paymentSourceName}
                    onChange={(id) => set("paymentSourceDId", id)}
                  />
                </Field>
                {credit && (
                  <Field label="Amount paid now" name="paidAmount" hint="Leave 0 for a fully credit purchase.">
                    <Input id="paidAmount" inputMode="decimal" value={header.paidAmount} onChange={(e) => set("paidAmount", e.target.value)} />
                  </Field>
                )}
                {(!credit || num(header.paidAmount) > 0) && (
                  <>
                    <Field label="Paid by" name="paymentMethod" hint="Pay by cheque? Record it as a supplier payment instead.">
                      <Select id="paymentMethod" value={header.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                        {ON_THE_SPOT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {purchaseLabel(m)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {header.paymentMethod !== "Cash" && (
                      <>
                        <Field label="Bank / wallet" name="paymentProvider">
                          <Input id="paymentProvider" value={header.paymentProvider} maxLength={100} placeholder="e.g. bKash, Nagad, DBBL" onChange={(e) => set("paymentProvider", e.target.value)} />
                        </Field>
                        <Field label="Transaction ID" name="paymentReferenceNo">
                          <Input id="paymentReferenceNo" value={header.paymentReferenceNo} maxLength={100} onChange={(e) => set("paymentReferenceNo", e.target.value)} />
                        </Field>
                      </>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            {/* Save draft comes first in the DOM (shown below) so Enter in a field saves, never posts. */}
            <div className="flex flex-col-reverse gap-2">
              <SubmitIntent intent="save" chosen={submitIntent} onChoose={setSubmitIntent} variant={canPost ? "outline" : "primary"}>
                Save draft
              </SubmitIntent>
              {canPost && (
                <SubmitIntent intent="post" chosen={submitIntent} onChoose={setSubmitIntent} variant={mode === "invoice" ? "outline" : "primary"}>
                  {postLabel ?? "Save & post"}
                </SubmitIntent>
              )}
              {canPost && mode === "invoice" && (
                // Posts the invoice, then its bill voucher from the ledger mappings; it is then locked.
                <SubmitIntent intent="finalize" chosen={submitIntent} onChoose={setSubmitIntent} variant="primary">
                  Save &amp; finalize
                </SubmitIntent>
              )}
            </div>
            {returnTo ? (
              <button type="button" onClick={() => router.back()} className={buttonClasses("ghost", "md", "w-full")}>
                Cancel
              </button>
            ) : (
              <Link href={cancelHref} className={buttonClasses("ghost", "md", "w-full")}>
                Cancel
              </Link>
            )}
          </div>
        </div>
      </div>
    </ActionForm>
  );
}

/** A submit button that says what to do with the document (sent as "intent"): keep a draft, post it, or finalize it. */
export function SubmitIntent({
  intent,
  chosen,
  onChoose,
  variant,
  children,
}: {
  intent: SubmitIntentValue;
  /** The intent of the last submit (its button shows the progress). */
  chosen: SubmitIntentValue;
  onChoose: (intent: SubmitIntentValue) => void;
  variant: "primary" | "outline";
  children: ReactNode;
}) {
  const { pending } = useFormState();
  const active = pending && chosen === intent;
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      onClick={() => onChoose(intent)}
      className={buttonClasses(variant, "md", "w-full")}
    >
      {active && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {active ? ({ save: "Saving…", post: "Posting…", finalize: "Finalizing…" } as const)[intent] : children}
    </button>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", strong && "font-semibold text-gray-800 dark:text-white/90")}>
      <span className={strong ? "" : "text-gray-500 dark:text-gray-400"}>{label}</span>
      <span className="tabular-nums">{formatAmount(value)}</span>
    </div>
  );
}

function LineRow({
  index,
  line,
  amounts,
  mode,
  hasTax,
  receiving,
  warehouseId,
  taxGroups,
  lockedProduct,
  onChange,
  onUnit,
  onRemove,
}: {
  index: number;
  line: EditorLine;
  amounts: { total: number; tax: number };
  mode: PurchaseEditorMode;
  hasTax: boolean;
  receiving: boolean;
  warehouseId: number | null;
  taxGroups: TaxGroupOption[];
  lockedProduct: boolean;
  onChange: (patch: Partial<EditorLine>) => void;
  onUnit: (unitId: number) => void;
  onRemove: () => void;
}) {
  const factor = line.units.find((u) => u.unitId === line.unitId)?.conversionFactor ?? 1;
  const baseQuantity = round(num(line.quantity) * factor);
  const id = (field: string) => `line-${line.key}-${field}`;
  const serialCount = splitSerials(line.serialNos).length;

  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-800 dark:text-white/90">
            <span className="mr-2 text-gray-400">{index + 1}.</span>
            {line.productName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {line.productCode}
            {factor !== 1 && ` · ${formatQuantity(baseQuantity)} ${line.baseUnitCode}`}
            {line.productType !== "Stock" && ` · ${line.productType === "Service" ? "service" : "not stocked"}`}
            {line.hint && ` · ${line.hint}`}
          </p>
        </div>
        <button type="button" aria-label={`Remove ${line.productName}`} onClick={onRemove} className="text-gray-400 hover:text-red-500">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      <div className={cn("mt-3 grid gap-3 sm:grid-cols-3", hasTax ? "lg:grid-cols-6" : "lg:grid-cols-5")}>
        <div>
          <Label htmlFor={id("unit")}>Unit</Label>
          <Select id={id("unit")} value={line.unitId} disabled={lockedProduct} onChange={(e) => onUnit(Number(e.target.value))}>
            {line.units.map((u) => (
              <option key={u.unitId} value={u.unitId}>
                {u.unitCode}
                {u.conversionFactor !== 1 ? ` (${formatQuantity(u.conversionFactor)} ${line.baseUnitCode})` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={id("qty")}>Quantity</Label>
          <Input id={id("qty")} inputMode="decimal" value={line.quantity} onChange={(e) => onChange({ quantity: e.target.value })} />
        </div>
        <div>
          <Label htmlFor={id("price")}>Price / unit</Label>
          <Input id={id("price")} inputMode="decimal" value={line.unitPrice} onChange={(e) => onChange({ unitPrice: e.target.value })} />
        </div>
        <div>
          <Label htmlFor={id("discount")}>Discount %</Label>
          <Input id={id("discount")} inputMode="decimal" value={line.discountPercent} onChange={(e) => onChange({ discountPercent: e.target.value })} />
        </div>
        {hasTax && (
          <div>
            <Label htmlFor={id("tax")}>Tax</Label>
            <Select id={id("tax")} value={line.taxGroupId ?? ""} onChange={(e) => onChange({ taxGroupId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">No tax</option>
              {taxGroups
                .filter((g) => g.isActive || g.id === line.taxGroupId)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </Select>
          </div>
        )}
        <div className="text-right">
          <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Line total</span>
          <span className="block py-2.5 font-semibold text-gray-800 tabular-nums dark:text-white/90">{formatAmount(amounts.total)}</span>
        </div>
      </div>

      {line.productType === "Stock" && line.trackingType === "Batch" && receiving && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor={id("batch")}>Batch / lot no</Label>
            {/* Optional: posting stocks the line under the document's number when it's empty. */}
            <Input
              id={id("batch")}
              value={line.batchNo}
              maxLength={60}
              placeholder="Empty: the document no"
              onChange={(e) => onChange({ batchNo: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={id("mfg")}>Manufactured</Label>
            <Input id={id("mfg")} type="date" value={line.manufactureDate} onChange={(e) => onChange({ manufactureDate: e.target.value })} />
          </div>
          <div>
            <Label htmlFor={id("exp")}>Expiry</Label>
            <Input id={id("exp")} type="date" value={line.expiryDate} onChange={(e) => onChange({ expiryDate: e.target.value })} />
          </div>
        </div>
      )}

      {line.productType === "Stock" && line.trackingType === "Batch" && mode === "return" && (
        <div className="mt-3">
          <BatchSelect
            id={id("batchId")}
            productId={line.productId}
            warehouseId={warehouseId}
            value={line.batchId}
            onChange={(batchId) => onChange({ batchId })}
          />
        </div>
      )}

      {line.productType === "Stock" && line.trackingType === "Serial" && (receiving || mode === "return") && (
        <div className="mt-3">
          <Label htmlFor={id("serials")}>
            Serial numbers ({serialCount} of {formatQuantity(baseQuantity)})
          </Label>
          <Textarea
            id={id("serials")}
            rows={2}
            value={line.serialNos}
            placeholder={mode === "return" ? "Serial numbers being returned, one per line" : "Scan or type one serial number per line"}
            onChange={(e) => onChange({ serialNos: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

/** Batches of the product in stock in the warehouse, first to expire first. */
export function BatchSelect({
  id,
  productId,
  warehouseId,
  value,
  onChange,
}: {
  id: string;
  productId: number;
  warehouseId: number | null;
  value: number | null;
  onChange: (batchId: number | null) => void;
}) {
  const requestKey = `${productId}-${warehouseId}`;
  const [loaded, setLoaded] = useState<{ key: string; batches: BatchStockItem[] }>({ key: "", batches: [] });
  const loading = Boolean(warehouseId) && loaded.key !== requestKey;
  const batches = loaded.key === requestKey ? loaded.batches : [];

  useEffect(() => {
    if (!warehouseId) return;
    let cancelled = false;
    fetch(`/api/lookup/batches?productId=${productId}&warehouseId=${warehouseId}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data: BatchStockItem[]) => {
        if (!cancelled) setLoaded({ key: requestKey, batches: Array.isArray(data) ? data : [] });
      })
      .catch(() => !cancelled && setLoaded({ key: requestKey, batches: [] }));
    return () => {
      cancelled = true;
    };
  }, [productId, warehouseId, requestKey]);

  return (
    <div>
      <Label htmlFor={id}>Batch *</Label>
      <Select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">{loading ? "Loading batches…" : batches.length ? "Choose the batch" : "No batch in stock here"}</option>
        {batches.map((b) => (
          <option key={b.batchId} value={b.batchId}>
            {b.batchNo} · {formatQuantity(b.quantity)} in stock{b.expiryDate ? ` · exp ${b.expiryDate}` : ""}
          </option>
        ))}
        {value && !batches.some((b) => b.batchId === value) && <option value={value}>Batch #{value}</option>}
      </Select>
    </div>
  );
}
