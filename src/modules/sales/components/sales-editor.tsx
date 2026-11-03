"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { computeLine } from "@/core/documents/line-math";
import { ProductSearch } from "@/core/documents/product-search";
import { ActionForm, FormMessage } from "@/core/forms/action-form";
import { actionError, type FormAction } from "@/core/forms/action-state";
import { Field, Input, Label, Select, Textarea } from "@/core/forms/fields";
import { buttonClasses } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { cn } from "@/core/utils/cn";
import { formatAmount, formatQuantity, parseDecimal, round, todayIso } from "@/core/utils/number";
import { IntentSubmit, useLookupList, useSubmitIntent } from "@/modules/inventory/components/documents/intent-submit";
import type { BatchStockItem, ProductLookupItem, SerialStockItem, TaxGroupOption } from "@/modules/inventory/types";
import { COUNTER_METHODS, salesLabel, type CustomerOption, type SaleType, type SalesInvoiceUpsertRequest, type SalesLineRequest } from "../types";
import { CustomerPicker } from "./customer-picker";

export type SaleEditorUnit = { unitId: number; unitCode: string; conversionFactor: number; salePrice: number | null };

export type SaleEditorLine = {
  key: string;
  productId: number;
  productCode: string;
  productName: string;
  productType: string;
  trackingType: string;
  baseUnitCode: string;
  units: SaleEditorUnit[];
  /** Per base unit. */
  baseSalePrice: number;
  mrp: number | null;
  lastPurchaseCost: number;
  unitId: number;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxGroupId: number | null;
  /** Null: the first to expire, chosen when posted. */
  batchId: number | null;
  serialNos: string[];
  /** Base units in stock in the warehouse when the product was picked (null: not known). */
  stock: number | null;
};

export type SalesEditorOptions = {
  warehouses: { id: number; name: string; isActive: boolean }[];
  taxGroups: TaxGroupOption[];
  pricesIncludeTax: boolean;
  allowNegativeStock: boolean;
  defaultWarehouseId: number | null;
};

/** A saved draft (editing) to start from. */
export type SalesEditorInitial = {
  date?: string;
  saleType?: SaleType;
  customer?: CustomerOption | null;
  customerName?: string;
  customerMobile?: string;
  warehouseId?: number | null;
  dueDate?: string;
  extraDiscount?: string;
  charge?: string;
  roundOff?: string;
  paidAmount?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  paymentReferenceNo?: string;
  remarks?: string;
  lines?: SaleEditorLine[];
};

/** A line box label: shown while the items box is narrow, read out only once it has the column headings. */
const rowLabel = "mb-1 block text-xs text-gray-500 @2xl:sr-only dark:text-gray-400";
/** Unit, Qty, Price, Disc %, Tax, Total, remove: the column headings and each line's boxes (its item is the row above). */
const lineColumns = "@2xl:grid-cols-[5.5rem_4.5rem_6rem_4rem_minmax(6rem,11rem)_minmax(5.5rem,1fr)_1.5rem]";

let keySeed = 0;
const newKey = () => `s${Date.now().toString(36)}${(keySeed++).toString(36)}`;
const num = (value: string, fallback = 0) => parseDecimal(value) ?? fallback;
const orNull = (value: string | undefined | null) => (value && value.trim() ? value.trim() : null);

/** The price of one unit: the pack's own price, else the base price times the pack size. */
function unitPriceOf(line: Pick<SaleEditorLine, "units" | "baseSalePrice">, unitId: number) {
  const unit = line.units.find((u) => u.unitId === unitId);
  return round(unit?.salePrice ?? line.baseSalePrice * (unit?.conversionFactor ?? 1), 4);
}

/** A line for a product picked or scanned: its sale unit (or the scanned pack), sale price and tax. */
export function saleLineFromProduct(product: ProductLookupItem): SaleEditorLine {
  const unit =
    product.units.find((u) => u.unitId === product.matchedUnitId) ??
    product.units.find((u) => u.isSaleDefault) ??
    product.units.find((u) => u.unitId === product.baseUnitId) ??
    product.units[0];
  const units = product.units.map((u) => ({ unitId: u.unitId, unitCode: u.unitCode, conversionFactor: u.conversionFactor, salePrice: u.salePrice }));
  const unitId = unit?.unitId ?? product.baseUnitId;
  const serial = product.trackingType === "Serial";
  return {
    key: newKey(),
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    productType: product.productType,
    trackingType: product.trackingType,
    baseUnitCode: product.baseUnitCode,
    units,
    baseSalePrice: product.salePrice,
    mrp: product.mrp,
    lastPurchaseCost: product.lastPurchaseCost,
    // Serial items are counted one by one as the numbers are picked.
    unitId: serial ? product.baseUnitId : unitId,
    quantity: serial ? "0" : "1",
    unitPrice: String(unitPriceOf({ units, baseSalePrice: product.salePrice }, serial ? product.baseUnitId : unitId)),
    discountPercent: "0",
    taxGroupId: product.saleTaxGroupId,
    batchId: null,
    serialNos: [],
    stock: product.productType === "Stock" ? product.stockQuantity : null,
  };
}

export function SalesEditor({
  action,
  options,
  initial = {},
  canPost,
  canAddCustomer,
  cancelHref,
  returnTo,
}: {
  action: FormAction;
  options: SalesEditorOptions;
  initial?: SalesEditorInitial;
  /** Show "Complete sale" (the user may post). */
  canPost: boolean;
  canAddCustomer: boolean;
  cancelHref: string;
  /** In a popup over the list: saving returns to the list; Cancel closes the popup. */
  returnTo?: string;
}) {
  const router = useRouter();
  const [header, setHeader] = useState(() => ({
    date: initial.date ?? todayIso(),
    saleType: initial.saleType ?? ("Cash" as SaleType),
    customerName: initial.customerName ?? "",
    customerMobile: initial.customerMobile ?? "",
    warehouseId: initial.warehouseId ?? options.defaultWarehouseId ?? options.warehouses.find((w) => w.isActive)?.id ?? null,
    dueDate: initial.dueDate ?? "",
    extraDiscount: initial.extraDiscount ?? "",
    charge: initial.charge ?? "",
    roundOff: initial.roundOff ?? "",
    paidAmount: initial.paidAmount ?? "",
    paymentMethod: initial.paymentMethod ?? "Cash",
    paymentProvider: initial.paymentProvider ?? "",
    paymentReferenceNo: initial.paymentReferenceNo ?? "",
    tendered: "",
    remarks: initial.remarks ?? "",
  }));
  const [customer, setCustomer] = useState<CustomerOption | null>(initial.customer ?? null);
  const [lines, setLines] = useState<SaleEditorLine[]>(initial.lines ?? []);
  const [showIssues, setShowIssues] = useState(false);
  const { chosen: chosenIntent, choose: chooseIntent } = useSubmitIntent();
  const taxGroups = useMemo(() => new Map(options.taxGroups.map((g) => [g.id, g])), [options.taxGroups]);
  const set = <K extends keyof typeof header>(key: K, value: (typeof header)[K]) => setHeader((current) => ({ ...current, [key]: value }));

  const credit = header.saleType === "Credit";
  const amounts = lines.map((line) =>
    computeLine({
      quantity: num(line.quantity),
      unitPrice: num(line.unitPrice),
      discountPercent: num(line.discountPercent),
      rates: line.taxGroupId ? taxGroups.get(line.taxGroupId)?.rates : undefined,
      inclusive: options.pricesIncludeTax,
      withTax: true,
    }),
  );
  const subtotal = amounts.reduce((sum, a) => sum + a.gross, 0);
  const lineDiscount = amounts.reduce((sum, a) => sum + a.discount, 0);
  const tax = amounts.reduce((sum, a) => sum + a.tax, 0);
  const linesTotal = round(amounts.reduce((sum, a) => sum + a.total, 0));
  const charge = num(header.charge);
  const less = num(header.extraDiscount);
  const beforeRound = round(linesTotal + charge - less);
  const total = round(beforeRound + num(header.roundOff));
  const paid = credit ? num(header.paidAmount) : total;
  const due = round(total - paid);
  const change = round(num(header.tendered) - total);
  const quantityCount = lines.reduce((sum, line) => sum + (num(line.quantity) > 0 ? 1 : 0), 0);

  // ---- Checks before saving (the API checks everything again)
  const problems: string[] = [];
  if (lines.length === 0) problems.push("Add at least one item.");
  lines.forEach((line, index) => {
    const label = `Line ${index + 1} (${line.productName})`;
    const quantity = parseDecimal(line.quantity);
    const factor = line.units.find((u) => u.unitId === line.unitId)?.conversionFactor ?? 1;
    if (line.trackingType === "Serial") {
      if (line.serialNos.length === 0) problems.push(`${label}: pick the serial numbers sold.`);
      else if (round((quantity ?? 0) * factor) !== line.serialNos.length) problems.push(`${label}: pick one serial number per item.`);
    } else if (quantity === null || quantity <= 0) problems.push(`${label}: enter a quantity above 0.`);
    const price = parseDecimal(line.unitPrice);
    if (price === null || price < 0) problems.push(`${label}: enter the price.`);
    const discount = parseDecimal(line.discountPercent);
    if (discount === null || discount < 0 || discount > 100) problems.push(`${label}: the discount is 0 to 100%.`);
  });
  if (credit && !customer) problems.push("A credit sale needs a customer on file.");
  if (!header.warehouseId) problems.push("Choose the warehouse.");
  if (!header.date) problems.push("Enter the date.");
  if (less < 0 || charge < 0) problems.push("The delivery charge and bill discount can't be negative.");
  if (less > linesTotal + charge) problems.push("The bill discount is more than the bill.");
  if (total < 0) problems.push("The total can't be negative.");
  if (credit && (paid < 0 || paid > total)) problems.push("The amount paid now must be between 0 and the total.");

  // Warnings only: the API has the last word (stock may have changed, limits may be raised).
  const creditWarning =
    credit && customer && customer.creditLimit !== null && due > 0
      ? customer.creditLimit === 0
        ? `${customer.name} buys on cash only (credit limit 0).`
        : customer.balance + due > customer.creditLimit
          ? `This takes ${customer.name} past the credit limit (${formatAmount(customer.creditLimit)}): owes ${formatAmount(customer.balance)} + ${formatAmount(due)} now.`
          : null
      : null;

  const submit: FormAction = async (previous, formData) => {
    if (problems.length > 0) {
      const more = problems.length > 3 ? ` (and ${problems.length - 3} more)` : "";
      return actionError(`Please fix these first: ${problems.slice(0, 3).join(" ")}${more}`);
    }
    return action(previous, formData);
  };

  // F9 or Ctrl+Enter completes the sale from anywhere on the screen.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "F9" || (event.key === "Enter" && (event.ctrlKey || event.metaKey))) {
        event.preventDefault();
        document.querySelector<HTMLButtonElement>('form button[name="intent"][value="post"]')?.click();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function updateLine(key: string, patch: Partial<SaleEditorLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addProduct(product: ProductLookupItem) {
    setLines((current) => {
      // Scanning the same item again adds one more of it.
      const existing = current.find(
        (l) => l.productId === product.id && l.trackingType === "None" && l.unitId === (product.matchedUnitId ?? l.unitId),
      );
      if (existing && product.trackingType === "None")
        return current.map((l) => (l.key === existing.key ? { ...l, quantity: String(num(l.quantity) + 1) } : l));
      return [...current, saleLineFromProduct(product)];
    });
  }

  function buildLine(line: SaleEditorLine): SalesLineRequest {
    return {
      productId: line.productId,
      unitId: line.unitId,
      quantity: num(line.quantity),
      unitPrice: num(line.unitPrice),
      discountPercent: num(line.discountPercent),
      discountAmount: null,
      taxGroupId: line.taxGroupId,
      description: null,
      batchId: line.trackingType === "Batch" ? line.batchId : null,
      serialNos: line.trackingType === "Serial" ? line.serialNos : [],
      remarks: null,
    };
  }

  function payload(): SalesInvoiceUpsertRequest {
    const paidNow = credit ? num(header.paidAmount) : 0;
    const takesPayment = !credit || paidNow > 0;
    return {
      invoiceDate: header.date,
      saleType: header.saleType,
      dueDate: credit ? orNull(header.dueDate) : null,
      customerId: customer?.id ?? null,
      customerName: customer ? null : orNull(header.customerName),
      customerMobile: customer ? null : orNull(header.customerMobile),
      warehouseId: header.warehouseId,
      currencyLookupDataId: null,
      exchangeRate: 1,
      extraDiscountAmount: less,
      chargeAmount: charge,
      roundOffAmount: num(header.roundOff),
      paidAmount: paidNow,
      paymentMethod: takesPayment ? header.paymentMethod : null,
      paymentProvider: takesPayment && header.paymentMethod !== "Cash" ? orNull(header.paymentProvider) : null,
      paymentReferenceNo: takesPayment && header.paymentMethod !== "Cash" ? orNull(header.paymentReferenceNo) : null,
      remarks: orNull(header.remarks),
      lines: lines.map(buildLine),
    };
  }

  const warehouses = options.warehouses.filter((w) => w.isActive || w.id === header.warehouseId);
  const dueHint = customer ? `Empty: ${customer.paymentTermsDays} day(s) after the sale date.` : "Empty: the customer's payment terms.";

  return (
    <ActionForm action={submit} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload())} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <FormMessage />

      {/* Enter in a box must not submit: a scanner sends Enter after every barcode. */}
      <div
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]"
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
        }}
      >
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Items"
              description={options.pricesIncludeTax ? "Prices include tax (Inventory Settings)." : "Prices exclude tax; the tax is added on top."}
            />
            {/* Laid out by the box's own width: in the popup it is beside the totals, so narrower than the screen. */}
            <CardBody className="@container space-y-4">
              <div className="grid gap-3 @xl:grid-cols-[minmax(0,1fr)_11rem_9.5rem]">
                <ProductSearch onPick={addProduct} warehouseId={header.warehouseId} />
                <div>
                  <label htmlFor="warehouseId" className="sr-only">
                    Sell from warehouse
                  </label>
                  <Select
                    id="warehouseId"
                    value={header.warehouseId ?? ""}
                    onChange={(e) => {
                      set("warehouseId", e.target.value ? Number(e.target.value) : null);
                      // Batches and serials are per warehouse; stock figures were for the old one.
                      setLines((current) => current.map((l) => ({ ...l, batchId: null, serialNos: [], stock: null })));
                    }}
                  >
                    <option value="" disabled>
                      Choose a warehouse
                    </option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="date" className="sr-only">
                    Sale date
                  </label>
                  <Input id="date" type="date" value={header.date} onChange={(e) => set("date", e.target.value)} required />
                </div>
              </div>

              {lines.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Scan a barcode or search a product to start the sale.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                  <div
                    className={cn(
                      "hidden gap-2 rounded-t-xl bg-gray-50 px-3 py-2 text-xs font-medium tracking-wide text-gray-500 uppercase @2xl:grid dark:bg-white/[0.03] dark:text-gray-400",
                      lineColumns,
                    )}
                  >
                    <span>Unit</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Price</span>
                    <span className="text-right">Disc %</span>
                    <span>Tax</span>
                    <span className="text-right">Total</span>
                    <span />
                  </div>
                  {lines.map((line, index) => (
                    <SaleLineRow
                      key={line.key}
                      index={index}
                      line={line}
                      total={amounts[index].total}
                      taxGroups={options.taxGroups}
                      warehouseId={header.warehouseId}
                      allowNegativeStock={options.allowNegativeStock}
                      onChange={(patch) => updateLine(line.key, patch)}
                      onRemove={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                    />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Field label="Remarks" name="remarks">
                <Textarea id="remarks" rows={2} maxLength={1000} value={header.remarks} onChange={(e) => set("remarks", e.target.value)} />
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardBody className="space-y-4">
              <div role="radiogroup" aria-label="Sale type" className="grid grid-cols-2 rounded-lg border border-gray-300 p-1 dark:border-gray-700">
                {(["Cash", "Credit"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={header.saleType === type}
                    onClick={() => set("saleType", type)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium",
                      header.saleType === type ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
                    )}
                  >
                    {type === "Cash" ? "Cash sale" : "Credit sale (baki)"}
                  </button>
                ))}
              </div>
              <CustomerPicker value={customer} onChange={setCustomer} canAdd={canAddCustomer} required={credit} />
              {credit && !customer && (
                <p className="text-xs text-amber-700 dark:text-amber-400">A credit sale needs a customer on file, so the due can be collected later.</p>
              )}
              {!credit && !customer && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="customerName">Walk-in name</Label>
                    <Input id="customerName" value={header.customerName} maxLength={250} placeholder="Optional" onChange={(e) => set("customerName", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="customerMobile">Mobile</Label>
                    <Input id="customerMobile" value={header.customerMobile} maxLength={30} inputMode="tel" placeholder="Optional" onChange={(e) => set("customerMobile", e.target.value)} />
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2.5 text-sm">
              <SummaryRow label={`Items (${quantityCount})`} value={subtotal} />
              {lineDiscount > 0 && <SummaryRow label="Discount" value={-lineDiscount} />}
              {tax > 0 && <SummaryRow label={options.pricesIncludeTax ? "Tax (included)" : "Tax"} value={tax} />}
              <InlineAmount id="charge" label="Delivery / labour" value={header.charge} onChange={(v) => set("charge", v)} />
              <InlineAmount id="extraDiscount" label="Bill discount (less)" value={header.extraDiscount} onChange={(v) => set("extraDiscount", v)} />
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="roundOff" className="text-gray-500 dark:text-gray-400">
                  Round off
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="text-xs font-medium text-brand-500 hover:underline"
                    onClick={() => set("roundOff", String(round(Math.round(beforeRound) - beforeRound, 2)))}
                  >
                    Round
                  </button>
                  <div className="w-24">
                    <Input id="roundOff" className="text-right" inputMode="decimal" value={header.roundOff} placeholder="0" onChange={(e) => set("roundOff", e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex items-baseline justify-between border-t border-gray-200 pt-3 dark:border-gray-800">
                <span className="text-base font-semibold text-gray-800 dark:text-white/90">Total</span>
                <span className="text-2xl font-bold text-gray-900 tabular-nums dark:text-white">{formatAmount(total)}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={credit ? "Paid now (optional)" : "Payment"} />
            <CardBody className="space-y-3 text-sm">
              {credit && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="paidAmount">Paid now</Label>
                    <Input id="paidAmount" inputMode="decimal" value={header.paidAmount} placeholder="0" onChange={(e) => set("paidAmount", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due date</Label>
                    <Input id="dueDate" type="date" value={header.dueDate} title={dueHint} onChange={(e) => set("dueDate", e.target.value)} />
                  </div>
                </div>
              )}
              {(!credit || paid > 0) && (
                <div>
                  <Label htmlFor="paymentMethod">Paid by</Label>
                  <Select id="paymentMethod" value={header.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                    {COUNTER_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {salesLabel(m)}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {(!credit || paid > 0) && header.paymentMethod !== "Cash" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="paymentProvider">{header.paymentMethod === "MobileWallet" ? "Wallet" : "Bank / card"}</Label>
                    <Input
                      id="paymentProvider"
                      value={header.paymentProvider}
                      maxLength={100}
                      placeholder={header.paymentMethod === "MobileWallet" ? "bKash, Nagad" : "e.g. DBBL"}
                      onChange={(e) => set("paymentProvider", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentReferenceNo">Transaction ID</Label>
                    <Input id="paymentReferenceNo" value={header.paymentReferenceNo} maxLength={100} onChange={(e) => set("paymentReferenceNo", e.target.value)} />
                  </div>
                </div>
              )}
              {!credit && header.paymentMethod === "Cash" && (
                <div className="grid grid-cols-2 items-end gap-3">
                  <div>
                    <Label htmlFor="tendered">Cash received</Label>
                    <Input id="tendered" inputMode="decimal" value={header.tendered} placeholder={formatAmount(total)} onChange={(e) => set("tendered", e.target.value)} />
                  </div>
                  <div className="pb-2 text-right">
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Change</span>
                    <span className={cn("text-lg font-semibold tabular-nums", change < 0 ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-white/90")}>
                      {header.tendered ? formatAmount(change) : "—"}
                    </span>
                  </div>
                </div>
              )}
              {credit && (
                <div className="flex items-baseline justify-between border-t border-gray-200 pt-2 dark:border-gray-800">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Due (to the customer&apos;s account)</span>
                  <span className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{formatAmount(due)}</span>
                </div>
              )}
              {creditWarning && (
                <p className="flex gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  {creditWarning}
                </p>
              )}
            </CardBody>
          </Card>

          <div className="flex flex-col gap-2">
            {showIssues && problems.length > 0 && (
              <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
                {problems.slice(0, 5).map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
            {/* Save draft is first in the DOM (shown below) so no implicit submit ever completes a sale. */}
            <div className="flex flex-col-reverse gap-2">
              <IntentSubmit
                intent="save"
                chosen={chosenIntent}
                onChoose={(value) => {
                  setShowIssues(true);
                  chooseIntent(value);
                }}
                variant={canPost ? "outline" : "primary"}
                pendingLabel="Saving…"
              >
                Save draft
              </IntentSubmit>
              {canPost && (
                <IntentSubmit
                  intent="post"
                  chosen={chosenIntent}
                  onChoose={(value) => {
                    setShowIssues(true);
                    chooseIntent(value);
                  }}
                  variant="primary"
                  pendingLabel="Completing…"
                >
                  Complete sale · {formatAmount(total)}
                </IntentSubmit>
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
            {canPost && <p className="text-center text-xs text-gray-500 dark:text-gray-400">F9 or Ctrl+Enter completes the sale.</p>}
          </div>
        </div>
      </div>
    </ActionForm>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="tabular-nums text-gray-800 dark:text-white/90">{formatAmount(value)}</span>
    </div>
  );
}

function InlineAmount({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-gray-500 dark:text-gray-400">
        {label}
      </label>
      <div className="w-24 shrink-0">
        <Input id={id} className="text-right" inputMode="decimal" value={value} placeholder="0" onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function SaleLineRow({
  index,
  line,
  total,
  taxGroups,
  warehouseId,
  allowNegativeStock,
  onChange,
  onRemove,
}: {
  index: number;
  line: SaleEditorLine;
  total: number;
  taxGroups: TaxGroupOption[];
  warehouseId: number | null;
  allowNegativeStock: boolean;
  onChange: (patch: Partial<SaleEditorLine>) => void;
  onRemove: () => void;
}) {
  const id = (field: string) => `line-${line.key}-${field}`;
  const factor = line.units.find((u) => u.unitId === line.unitId)?.conversionFactor ?? 1;
  const baseQuantity = round(num(line.quantity) * factor);
  const pricePerBase = factor > 0 ? num(line.unitPrice) / factor : 0;
  const serial = line.trackingType === "Serial";
  const hints: { text: string; warn?: boolean }[] = [];
  if (line.stock !== null) {
    const short = baseQuantity > line.stock;
    hints.push({ text: `In stock ${formatQuantity(line.stock)} ${line.baseUnitCode}`, warn: short });
    if (short && !allowNegativeStock) hints.push({ text: "more than in stock", warn: true });
  }
  if (factor !== 1 && baseQuantity > 0) hints.push({ text: `${formatQuantity(baseQuantity)} ${line.baseUnitCode}` });
  if (line.mrp !== null && pricePerBase > line.mrp + 0.0001) hints.push({ text: `above MRP ${formatAmount(line.mrp * factor)}`, warn: true });
  if (line.lastPurchaseCost > 0 && pricePerBase > 0 && pricePerBase < line.lastPurchaseCost) hints.push({ text: "below cost", warn: true });
  const removeButton = (
    <button type="button" aria-label={`Remove ${line.productName}`} onClick={onRemove} className="text-gray-400 hover:text-red-500">
      <Trash2 className="size-4" aria-hidden />
    </button>
  );

  return (
    <div className="space-y-2 px-3 py-2.5">
      <div className={cn("grid grid-cols-2 items-end gap-x-2 gap-y-2", lineColumns)}>
        {/* The item gets the whole width, so its name and stock notes aren't squeezed beside the boxes. */}
        <div className="col-span-full flex min-w-0 gap-2">
          <span className="text-sm text-gray-400 tabular-nums">{index + 1}.</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90" title={line.productName}>
              {line.productName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {line.productCode}
              {hints.map((hint) => (
                <span key={hint.text} className={hint.warn ? "text-amber-700 dark:text-amber-400" : undefined}>
                  {" · "}
                  {hint.text}
                </span>
              ))}
            </p>
          </div>
          {/* Narrow: here, so it doesn't take a row of its own; wide: at the end of the boxes. */}
          <div className="@2xl:hidden">{removeButton}</div>
        </div>
        <div>
          <label htmlFor={id("unit")} className={rowLabel}>
            Unit
          </label>
          <Select
            id={id("unit")}
            value={line.unitId}
            disabled={serial}
            onChange={(e) => {
              const unitId = Number(e.target.value);
              onChange({ unitId, unitPrice: String(unitPriceOf(line, unitId)) });
            }}
          >
            {line.units.map((u) => (
              <option key={u.unitId} value={u.unitId}>
                {u.unitCode}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor={id("qty")} className={rowLabel}>
            Quantity
          </label>
          <Input
            id={id("qty")}
            className="text-right"
            inputMode="decimal"
            value={line.quantity}
            readOnly={serial}
            title={serial ? "Pick the serial numbers below" : undefined}
            onFocus={(e) => e.target.select()}
            onChange={(e) => onChange({ quantity: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={id("price")} className={rowLabel}>
            Price
          </label>
          <Input id={id("price")} className="text-right" inputMode="decimal" value={line.unitPrice} onFocus={(e) => e.target.select()} onChange={(e) => onChange({ unitPrice: e.target.value })} />
        </div>
        <div>
          <label htmlFor={id("disc")} className={rowLabel}>
            Discount %
          </label>
          <Input id={id("disc")} className="text-right" inputMode="decimal" value={line.discountPercent} onFocus={(e) => e.target.select()} onChange={(e) => onChange({ discountPercent: e.target.value })} />
        </div>
        <div>
          <label htmlFor={id("tax")} className={rowLabel}>
            Tax
          </label>
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
        <div>
          <span className={cn(rowLabel, "text-right")}>Total</span>
          <p className="flex h-9 items-center justify-end text-sm font-semibold text-gray-800 tabular-nums dark:text-white/90">{formatAmount(total)}</p>
        </div>
        <div className="hidden h-9 items-center justify-end @2xl:flex">{removeButton}</div>
      </div>

      {line.productType === "Stock" && line.trackingType === "Batch" && (
        <SaleBatchSelect id={id("batch")} productId={line.productId} warehouseId={warehouseId} value={line.batchId} onChange={(batchId) => onChange({ batchId })} />
      )}
      {line.productType === "Stock" && serial && (
        <SerialPicker
          productId={line.productId}
          warehouseId={warehouseId}
          value={line.serialNos}
          onChange={(serialNos) => onChange({ serialNos, quantity: String(serialNos.length) })}
        />
      )}
    </div>
  );
}

/** The lot to sell from; by default the one that expires first (chosen when the sale is posted). */
function SaleBatchSelect({
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
  const { items: batches, loading } = useLookupList<BatchStockItem>(
    warehouseId ? `/api/lookup/batches?productId=${productId}&warehouseId=${warehouseId}` : null,
  );
  return (
    <div className="flex max-w-md items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300">
        Batch
      </label>
      <Select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">{loading ? "Loading batches…" : batches.length ? "Auto: first to expire" : "No batch in stock here"}</option>
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

/** Serial-tracked items in stock in the warehouse; each one ticked is one item sold. */
function SerialPicker({
  productId,
  warehouseId,
  value,
  onChange,
}: {
  productId: number;
  warehouseId: number | null;
  value: string[];
  onChange: (serialNos: string[]) => void;
}) {
  const { items, loading } = useLookupList<SerialStockItem>(
    warehouseId ? `/api/lookup/serials?productId=${productId}&warehouseId=${warehouseId}` : null,
  );
  const [filter, setFilter] = useState("");
  const selected = new Set(value);
  const shown = items.filter((s) => !filter.trim() || s.serialNo.toLowerCase().includes(filter.trim().toLowerCase()));
  // Numbers kept on a draft that are no longer in stock still show, so they can be unticked.
  const missing = value.filter((serial) => !items.some((s) => s.serialNo === serial));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Serial numbers ({value.length} picked{items.length ? ` of ${items.length} in stock` : ""})
        </span>
        {items.length > 8 && (
          <div className="w-44">
            <Input aria-label="Find a serial number" className="h-8 text-sm" placeholder="Find or scan" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
        )}
      </div>
      {loading ? (
        <p className="text-xs text-gray-500">Loading serial numbers…</p>
      ) : items.length === 0 && missing.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">No serial numbers of this product are in stock here.</p>
      ) : (
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-auto">
          {[...missing.map((serialNo) => ({ serialNo, missing: true })), ...shown.map((s) => ({ serialNo: s.serialNo, missing: false }))].map((s) => {
            const on = selected.has(s.serialNo);
            return (
              <button
                key={s.serialNo}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? value.filter((v) => v !== s.serialNo) : [...value, s.serialNo])}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs",
                  on ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5",
                  s.missing && "line-through",
                )}
                title={s.missing ? "Not in stock here any more" : undefined}
              >
                {s.serialNo}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
