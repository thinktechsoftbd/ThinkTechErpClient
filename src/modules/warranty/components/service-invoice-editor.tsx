"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { computeLine } from "@/core/documents/line-math";
import { ProductSearch } from "@/core/documents/product-search";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import { actionError, type FormAction } from "@/core/forms/action-state";
import { Field, Input, Label, Select, Textarea } from "@/core/forms/fields";
import { SearchSelect } from "@/core/forms/search-select";
import { buttonClasses } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { cn } from "@/core/utils/cn";
import { showDate } from "@/core/utils/date";
import { formatAmount, formatQuantity, parseDecimal, round, todayIso } from "@/core/utils/number";
import { useLookupList } from "@/modules/inventory/components/documents/intent-submit";
import type { BatchStockItem, ProductLookupItem, TaxGroupOption } from "@/modules/inventory/types";
import { CustomerPicker } from "@/modules/sales/components/customer-picker";
import { COUNTER_METHODS, salesLabel, type CustomerOption, type SaleType } from "@/modules/sales/types";
import type { ServiceInvoiceLineRequest, ServiceInvoiceUpsertRequest } from "../service-invoice-types";

export type ServiceInvoiceEditorUnit = { unitId: number; unitCode: string; conversionFactor: number; salePrice: number | null };

export type ServiceInvoiceEditorLine = {
  key: string;
  productId: number;
  productCode: string;
  productName: string;
  productType: string;
  trackingType: string;
  baseUnitCode: string;
  units: ServiceInvoiceEditorUnit[];
  /** Per base unit. */
  baseSalePrice: number;
  unitId: number;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxGroupId: number | null;
  /** Batch-tracked parts: the lot used (optional). */
  batchId: number | null;
  /** Base units in stock in the warehouse when the part was picked (null: not known). */
  stock: number | null;
};

export type ServiceInvoiceEditorOptions = {
  warehouses: { id: number; name: string; isActive: boolean }[];
  taxGroups: TaxGroupOption[];
  pricesIncludeTax: boolean;
  defaultWarehouseId: number | null;
};

/** A saved draft (editing) to start from. */
export type ServiceInvoiceEditorInitial = {
  date?: string;
  saleType?: SaleType;
  customer?: CustomerOption | null;
  customerName?: string;
  customerMobile?: string;
  warehouseId?: number | null;
  dueDate?: string;
  serviceAmount?: string;
  extraDiscount?: string;
  charge?: string;
  roundOff?: string;
  paidAmount?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  paymentReferenceNo?: string;
  serviceNote?: string;
  remarks?: string;
  lines?: ServiceInvoiceEditorLine[];
};

/** A line box label: shown while the parts box is narrow, read out only once it has the column headings. */
const rowLabel = "mb-1 block text-xs text-gray-500 @2xl:sr-only dark:text-gray-400";
/** Unit, Qty, Price, Disc %, Tax, Total, remove: the column headings and each line's boxes (its part is the row above). */
const lineColumns = "@2xl:grid-cols-[5.5rem_4.5rem_6rem_4rem_minmax(6rem,11rem)_minmax(5.5rem,1fr)_1.5rem]";

let keySeed = 0;
const newKey = () => `v${Date.now().toString(36)}${(keySeed++).toString(36)}`;
const num = (value: string, fallback = 0) => parseDecimal(value) ?? fallback;
const orNull = (value: string | undefined | null) => (value && value.trim() ? value.trim() : null);

/** The price of one unit: the pack's own price, else the base price times the pack size. */
function unitPriceOf(line: Pick<ServiceInvoiceEditorLine, "units" | "baseSalePrice">, unitId: number) {
  const unit = line.units.find((u) => u.unitId === unitId);
  return round(unit?.salePrice ?? line.baseSalePrice * (unit?.conversionFactor ?? 1), 4);
}

/** A line for a part picked or scanned: its sale unit (or the scanned pack), sale price and tax. */
function lineFromProduct(product: ProductLookupItem): ServiceInvoiceEditorLine {
  const unit =
    product.units.find((u) => u.unitId === product.matchedUnitId) ??
    product.units.find((u) => u.isSaleDefault) ??
    product.units.find((u) => u.unitId === product.baseUnitId) ??
    product.units[0];
  const units = product.units.map((u) => ({ unitId: u.unitId, unitCode: u.unitCode, conversionFactor: u.conversionFactor, salePrice: u.salePrice }));
  const unitId = unit?.unitId ?? product.baseUnitId;
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
    unitId,
    quantity: "1",
    unitPrice: String(unitPriceOf({ units, baseSalePrice: product.salePrice }, unitId)),
    discountPercent: "0",
    taxGroupId: product.saleTaxGroupId,
    batchId: null,
    stock: product.productType === "Stock" ? product.stockQuantity : null,
  };
}

/**
 * The service invoice form: the parts used (optional), the service charge and note, cash or credit with a
 * customer (a cash bill may name a walk-in). Saved as a draft; nothing moves in stock.
 */
export function ServiceInvoiceEditor({
  action,
  options,
  initial = {},
  canAddCustomer,
  cancelHref,
  returnTo,
}: {
  action: FormAction;
  options: ServiceInvoiceEditorOptions;
  initial?: ServiceInvoiceEditorInitial;
  /** The user may add customers on the spot (SALES.M). */
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
    warehouseId:
      initial.warehouseId ??
      options.defaultWarehouseId ??
      options.warehouses.find((warehouse) => warehouse.isActive)?.id ??
      null,
    dueDate: initial.dueDate ?? "",
    serviceAmount: initial.serviceAmount ?? "",
    extraDiscount: initial.extraDiscount ?? "",
    charge: initial.charge ?? "",
    roundOff: initial.roundOff ?? "",
    paidAmount: initial.paidAmount ?? "",
    paymentMethod: initial.paymentMethod ?? "Cash",
    paymentProvider: initial.paymentProvider ?? "",
    paymentReferenceNo: initial.paymentReferenceNo ?? "",
    serviceNote: initial.serviceNote ?? "",
    remarks: initial.remarks ?? "",
  }));
  const [customer, setCustomer] = useState<CustomerOption | null>(initial.customer ?? null);
  const [lines, setLines] = useState<ServiceInvoiceEditorLine[]>(initial.lines ?? []);
  const [showIssues, setShowIssues] = useState(false);
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
  const service = num(header.serviceAmount);
  const charge = num(header.charge);
  const less = num(header.extraDiscount);
  const beforeRound = round(linesTotal + charge + service - less);
  const total = round(beforeRound + num(header.roundOff));
  const paid = credit ? num(header.paidAmount) : total;
  const due = round(total - paid);

  // ---- Checks before saving (the API checks everything again)
  const problems: string[] = [];
  if (lines.length === 0 && service <= 0) problems.push("Add the parts used or a service amount.");
  lines.forEach((line, index) => {
    const label = `Line ${index + 1} (${line.productName})`;
    const quantity = parseDecimal(line.quantity);
    if (quantity === null || quantity <= 0) problems.push(`${label}: enter a quantity above 0.`);
    const price = parseDecimal(line.unitPrice);
    if (price === null || price < 0) problems.push(`${label}: enter the price.`);
    const discount = parseDecimal(line.discountPercent);
    if (discount === null || discount < 0 || discount > 100) problems.push(`${label}: the discount is 0 to 100%.`);
  });
  if (credit && !customer) problems.push("A credit service invoice needs a customer on file.");
  if (!header.warehouseId) problems.push("Choose the warehouse.");
  if (!header.date) problems.push("Enter the date.");
  if (parseDecimal(header.serviceAmount || "0") === null || service < 0) problems.push("The service amount can't be negative.");
  if (less < 0 || charge < 0) problems.push("The other charges and bill discount can't be negative.");
  if (less > linesTotal + charge + service) problems.push("The bill discount is more than the bill.");
  if (total < 0) problems.push("The total can't be negative.");
  if (credit && (paid < 0 || paid > total)) problems.push("The amount paid now must be between 0 and the total.");

  const submit: FormAction = async (previous, formData) => {
    setShowIssues(true);
    if (problems.length > 0) {
      const more = problems.length > 3 ? ` (and ${problems.length - 3} more)` : "";
      return actionError(`Please fix these first: ${problems.slice(0, 3).join(" ")}${more}`);
    }
    return action(previous, formData);
  };

  function updateLine(key: string, patch: Partial<ServiceInvoiceEditorLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addProduct(product: ProductLookupItem) {
    setLines((current) => {
      // Scanning the same part again adds one more of it.
      const existing = current.find(
        (l) => l.productId === product.id && l.trackingType !== "Batch" && l.unitId === (product.matchedUnitId ?? l.unitId),
      );
      if (existing) return current.map((l) => (l.key === existing.key ? { ...l, quantity: String(num(l.quantity) + 1) } : l));
      return [...current, lineFromProduct(product)];
    });
  }

  function buildLine(line: ServiceInvoiceEditorLine): ServiceInvoiceLineRequest {
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
      remarks: null,
    };
  }

  function payload(): ServiceInvoiceUpsertRequest {
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
      serviceAmount: service,
      extraDiscountAmount: less,
      chargeAmount: charge,
      roundOffAmount: num(header.roundOff),
      paidAmount: paidNow,
      paymentMethod: takesPayment ? header.paymentMethod : null,
      paymentProvider: takesPayment && header.paymentMethod !== "Cash" ? orNull(header.paymentProvider) : null,
      paymentReferenceNo: takesPayment && header.paymentMethod !== "Cash" ? orNull(header.paymentReferenceNo) : null,
      serviceNote: orNull(header.serviceNote),
      remarks: orNull(header.remarks),
      lines: lines.map(buildLine),
    };
  }

  const warehouses = useMemo(
    () => options.warehouses.filter((w) => w.isActive || w.id === header.warehouseId),
    [options.warehouses, header.warehouseId],
  );
  const loadWarehouses = useCallback(
    async (search: string, offset: number) => {
      const query = search.trim().toLocaleLowerCase();
      const filtered = warehouses.filter((warehouse) => !query || warehouse.name.toLocaleLowerCase().includes(query));
      return { items: filtered.slice(offset, offset + 50), totalCount: filtered.length };
    },
    [warehouses],
  );
  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === header.warehouseId) ?? null;
  const dueHint = customer ? `Empty: ${customer.paymentTermsDays} day(s) after the invoice date.` : "Empty: the customer's payment terms.";

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
            <CardHeader title="Service" description="What was serviced or repaired, and the charge for the work." />
            <CardBody className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <Field label="Service note" name="serviceNote">
                <Textarea
                  id="serviceNote"
                  rows={3}
                  maxLength={2000}
                  value={header.serviceNote}
                  placeholder="e.g. Laptop keyboard replaced, OS reinstalled"
                  onChange={(e) => set("serviceNote", e.target.value)}
                />
              </Field>
              <Field label="Service amount" name="serviceAmount" hint="Added to the total.">
                <Input
                  id="serviceAmount"
                  className="text-right"
                  inputMode="decimal"
                  value={header.serviceAmount}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => set("serviceAmount", e.target.value)}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Parts used"
              description={`Optional. ${options.pricesIncludeTax ? "Prices include tax (Inventory Settings)." : "Prices exclude tax; the tax is added on top."}`}
            />
            {/* Laid out by the box's own width: in the popup it is beside the totals, so narrower than the screen. */}
            <CardBody className="@container space-y-4">
              <div className="grid gap-3 @xl:grid-cols-[minmax(0,1fr)_11rem_9.5rem]">
                <ProductSearch onPick={addProduct} warehouseId={header.warehouseId} />
                <div>
                  <label htmlFor="warehouseId" className="sr-only">
                    Parts from warehouse
                  </label>
                  <SearchSelect
                    id="warehouseId"
                    value={selectedWarehouse}
                    onChange={(warehouse) => {
                      set("warehouseId", warehouse.id);
                      // Batches and stock figures are per warehouse.
                      setLines((current) => current.map((l) => ({ ...l, batchId: null, stock: null })));
                    }}
                    load={loadWarehouses}
                    optionKey={(warehouse) => String(warehouse.id)}
                    optionLabel={(warehouse) => warehouse.name}
                    placeholder="Choose a warehouse"
                    searchPlaceholder="Search warehouses…"
                  />
                </div>
                <div>
                  <label htmlFor="date" className="sr-only">
                    Invoice date
                  </label>
                  <Input id="date" type="date" value={header.date} onChange={(e) => set("date", e.target.value)} required />
                </div>
              </div>

              {lines.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Scan a barcode or search a part used on the job. Leave empty for a service-only bill.
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
                    <PartLineRow
                      key={line.key}
                      index={index}
                      line={line}
                      total={amounts[index].total}
                      taxGroups={options.taxGroups}
                      warehouseId={header.warehouseId}
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
              <div role="radiogroup" aria-label="Invoice type" className="grid grid-cols-2 rounded-lg border border-gray-300 p-1 dark:border-gray-700">
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
                    {type === "Cash" ? "Cash" : "Credit (baki)"}
                  </button>
                ))}
              </div>
              <CustomerPicker
                value={customer}
                onChange={setCustomer}
                canAdd={canAddCustomer}
                required={credit}
                includeSuppliers
                endpoint="/api/lookup/service-invoice-customers"
              />
              {credit && !customer && (
                <p className="text-xs text-amber-700 dark:text-amber-400">A credit invoice needs a customer on file, so the due can be collected later.</p>
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
              <SummaryRow label={`Parts (${lines.length})`} value={subtotal} />
              {lineDiscount > 0 && <SummaryRow label="Discount" value={-lineDiscount} />}
              {tax > 0 && <SummaryRow label={options.pricesIncludeTax ? "Tax (included)" : "Tax"} value={tax} />}
              <SummaryRow label="Service amount" value={service} />
              <InlineAmount id="charge" label="Other charges" value={header.charge} onChange={(v) => set("charge", v)} />
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
              {credit && (
                <div className="flex items-baseline justify-between border-t border-gray-200 pt-2 dark:border-gray-800">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Due</span>
                  <span className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{formatAmount(due)}</span>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="flex flex-col gap-2">
            {showIssues && problems.length > 0 && (
              <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
                {problems.slice(0, 5).map((problem) => (
                  <li key={problem} className="flex gap-1.5">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {problem}
                  </li>
                ))}
              </ul>
            )}
            <SubmitButton className="w-full" pendingLabel="Saving…">
              Save service invoice · {formatAmount(total)}
            </SubmitButton>
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

function PartLineRow({
  index,
  line,
  total,
  taxGroups,
  warehouseId,
  onChange,
  onRemove,
}: {
  index: number;
  line: ServiceInvoiceEditorLine;
  total: number;
  taxGroups: TaxGroupOption[];
  warehouseId: number | null;
  onChange: (patch: Partial<ServiceInvoiceEditorLine>) => void;
  onRemove: () => void;
}) {
  const id = (field: string) => `line-${line.key}-${field}`;
  const factor = line.units.find((u) => u.unitId === line.unitId)?.conversionFactor ?? 1;
  const baseQuantity = round(num(line.quantity) * factor);
  const hints: { text: string; warn?: boolean }[] = [];
  if (line.stock !== null) hints.push({ text: `In stock ${formatQuantity(line.stock)} ${line.baseUnitCode}`, warn: baseQuantity > line.stock });
  if (factor !== 1 && baseQuantity > 0) hints.push({ text: `${formatQuantity(baseQuantity)} ${line.baseUnitCode}` });
  const removeButton = (
    <button type="button" aria-label={`Remove ${line.productName}`} onClick={onRemove} className="text-gray-400 hover:text-red-500">
      <Trash2 className="size-4" aria-hidden />
    </button>
  );

  return (
    <div className="space-y-2 px-3 py-2.5">
      <div className={cn("grid grid-cols-2 items-end gap-x-2 gap-y-2", lineColumns)}>
        {/* The part gets the whole width, so its name and stock notes aren't squeezed beside the boxes. */}
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
        <PartBatchSelect id={id("batch")} productId={line.productId} warehouseId={warehouseId} value={line.batchId} onChange={(batchId) => onChange({ batchId })} />
      )}
    </div>
  );
}

/** The lot a batch-tracked part came from (optional). */
function PartBatchSelect({
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
        <option value="">{loading ? "Loading batches…" : batches.length ? "Not recorded" : "No batch in stock here"}</option>
        {batches.map((b) => (
          <option key={b.batchId} value={b.batchId}>
            {b.batchNo} · {formatQuantity(b.quantity)} in stock{b.expiryDate ? ` · exp ${showDate(b.expiryDate)}` : ""}
          </option>
        ))}
        {value && !batches.some((b) => b.batchId === value) && <option value={value}>Batch #{value}</option>}
      </Select>
    </div>
  );
}
