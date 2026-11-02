"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { ProductSearch } from "@/core/documents/product-search";
import { ActionForm, FormMessage } from "@/core/forms/action-form";
import { actionError, type FormAction } from "@/core/forms/action-state";
import { Field, Input, Label, Select, Textarea } from "@/core/forms/fields";
import { buttonClasses } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { cn } from "@/core/utils/cn";
import { formatAmount, formatQuantity, parseDecimal, round, todayIso } from "@/core/utils/number";
import {
  ADJUSTMENT_REASONS,
  label,
  type BatchStockItem,
  type ProductLookupItem,
  type SerialStockItem,
  type StockAdjustmentUpsertRequest,
  type StockLine,
  type StockLineRequest,
  type StockTransferUpsertRequest,
} from "@/modules/inventory/types";
import { IntentSubmit, useLookupList, useSubmitIntent } from "./intent-submit";

/** opening: stock at go-live with its cost; adjustment: signed changes; transfer: warehouse to warehouse. */
export type StockEditorMode = "opening" | "adjustment" | "transfer";

export type StockEditorOptions = {
  warehouses: { id: number; name: string; isActive: boolean }[];
  defaultWarehouseId: number | null;
};

/** A saved draft to edit (its lines, plus their products with all units), or nothing for a new one. */
export type StockEditorInitial = {
  date?: string;
  /** The warehouse (opening, adjustment) or the source warehouse (transfer). */
  warehouseId?: number | null;
  toWarehouseId?: number | null;
  reason?: string;
  remarks?: string;
  lines?: StockLine[];
  products?: ProductLookupItem[];
};

type EditorUnit = { unitId: number; unitCode: string; conversionFactor: number };

type EditorLine = {
  key: string;
  productId: number;
  productCode: string;
  productName: string;
  trackingType: string;
  hasExpiry: boolean;
  allowDecimal: boolean;
  baseUnitCode: string;
  units: EditorUnit[];
  unitId: number;
  /** Adjustments only: the sign of the quantity. */
  direction: "add" | "remove";
  /** Always entered without a sign. */
  quantity: string;
  /** Per unit of the line's unit (e.g. per bag). */
  unitCost: string;
  /** Batch products adding stock: a new batch number or one already in the warehouse. */
  batchSource: "new" | "existing";
  batchId: number | null;
  /** A saved line's batch number, shown when that batch is no longer listed. */
  batchLabel: string | null;
  batchNo: string;
  manufactureDate: string;
  expiryDate: string;
  /** One per line or comma separated. */
  serialNos: string;
  remarks: string;
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

const factorOf = (line: EditorLine) => line.units.find((u) => u.unitId === line.unitId)?.conversionFactor ?? 1;
const unitCodeOf = (line: EditorLine) => line.units.find((u) => u.unitId === line.unitId)?.unitCode ?? line.baseUnitCode;

/** Whether the line brings stock in (needs a cost and a new or existing batch) rather than taking stock out. */
const addsStock = (mode: StockEditorMode, line: EditorLine) =>
  mode === "opening" || (mode === "adjustment" && line.direction === "add");

/** Whether the batch comes from what is in stock in the warehouse (a removal, a transfer, or picked). */
const batchFromStock = (mode: StockEditorMode, line: EditorLine) =>
  line.trackingType === "Batch" && (!addsStock(mode, line) || line.batchSource === "existing");

const gridColumns: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

function unitsOf(product: ProductLookupItem): EditorUnit[] {
  return product.units.map((u) => ({ unitId: u.unitId, unitCode: u.unitCode, conversionFactor: u.conversionFactor }));
}

/** A line for a product picked in the search box. Opening stock and transfers start in the purchase pack (bag, box). */
function lineFromProduct(product: ProductLookupItem, mode: StockEditorMode): EditorLine {
  const unit =
    product.units.find((u) => u.unitId === product.matchedUnitId) ??
    (mode === "adjustment" ? undefined : product.units.find((u) => u.isPurchaseDefault)) ??
    product.units.find((u) => u.unitId === product.baseUnitId) ??
    product.units[0];
  const factor = unit?.conversionFactor ?? 1;
  return {
    key: newKey(),
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    trackingType: product.trackingType,
    hasExpiry: product.hasExpiry,
    allowDecimal: product.allowDecimal,
    baseUnitCode: product.baseUnitCode,
    units: unitsOf(product),
    unitId: unit?.unitId ?? product.baseUnitId,
    direction: "remove",
    // Opening stock is counted, so there is no sensible default.
    quantity: mode === "opening" ? "" : "1",
    unitCost: mode === "opening" && product.lastPurchaseCost > 0 ? String(round(product.lastPurchaseCost * factor, 4)) : "",
    batchSource: "new",
    batchId: null,
    batchLabel: null,
    batchNo: "",
    manufactureDate: "",
    expiryDate: "",
    serialNos: "",
    remarks: "",
  };
}

/** A saved draft's line. The response's unit cost is per base unit; the editor's is per the line's unit. */
function lineFromSaved(line: StockLine, product: ProductLookupItem | undefined): EditorLine {
  const units = product ? unitsOf(product) : [];
  if (!units.some((u) => u.unitId === line.unitId))
    units.push({ unitId: line.unitId, unitCode: line.unitCode, conversionFactor: line.conversionFactor });
  return {
    key: `s${line.id}`,
    productId: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    trackingType: line.trackingType,
    hasExpiry: line.hasExpiry,
    allowDecimal: product?.allowDecimal ?? true,
    baseUnitCode: line.baseUnitCode,
    units,
    unitId: line.unitId,
    direction: line.quantity < 0 ? "remove" : "add",
    quantity: String(Math.abs(line.quantity)),
    unitCost: line.unitCost === null ? "" : String(round(line.unitCost * line.conversionFactor, 4)),
    batchSource: line.batchId ? "existing" : "new",
    batchId: line.batchId,
    batchLabel: line.batchNo,
    batchNo: line.batchId ? "" : (line.batchNo ?? ""),
    manufactureDate: line.batchId ? "" : (line.manufactureDate ?? ""),
    expiryDate: line.batchId ? "" : (line.expiryDate ?? ""),
    serialNos: line.serialNos.join("\n"),
    remarks: line.remarks ?? "",
  };
}

/** What the API would refuse on this line, in plain words. */
function lineIssues(line: EditorLine, mode: StockEditorMode): string[] {
  const issues: string[] = [];
  const quantity = parseDecimal(line.quantity);
  const factor = factorOf(line);
  const adds = addsStock(mode, line);
  if (quantity === null || quantity <= 0) issues.push("Enter a quantity above 0 (without a sign).");
  else if (!line.allowDecimal && !Number.isInteger(round(quantity * factor, 6)))
    issues.push(`${line.baseUnitCode} is counted in whole numbers.`);

  const cost = parseDecimal(line.unitCost);
  if (mode === "opening" && (cost === null || cost < 0)) issues.push(`Enter the cost per ${unitCodeOf(line)}.`);
  else if (mode === "adjustment" && adds && line.unitCost.trim() && (cost === null || cost < 0))
    issues.push("The cost must be a number, or leave it empty to use the average cost.");

  if (line.trackingType === "Batch") {
    if (batchFromStock(mode, line)) {
      if (!line.batchId) issues.push("Choose the batch.");
    } else {
      if (!line.batchNo.trim()) issues.push("Enter the batch / lot number.");
      if (line.hasExpiry && !line.expiryDate) issues.push("Enter the expiry date.");
    }
  }

  if (line.trackingType === "Serial" && quantity !== null && quantity > 0) {
    const serials = splitSerials(line.serialNos);
    const base = round(quantity * factor, 6);
    if (serials.length !== base)
      issues.push(`Enter ${formatQuantity(base)} serial number${base === 1 ? "" : "s"} (one per item); ${serials.length} entered.`);
    if (new Set(serials).size !== serials.length) issues.push("A serial number is entered twice.");
  }
  return issues;
}

function buildLine(line: EditorLine, mode: StockEditorMode): StockLineRequest {
  const quantity = num(line.quantity);
  const adds = addsStock(mode, line);
  const isBatch = line.trackingType === "Batch";
  const fromStock = batchFromStock(mode, line);
  const newBatch = isBatch && !fromStock;
  return {
    productId: line.productId,
    unitId: line.unitId,
    quantity: mode === "adjustment" && line.direction === "remove" ? -quantity : quantity,
    batchId: fromStock ? line.batchId : null,
    batchNo: newBatch ? orNull(line.batchNo) : null,
    manufactureDate: newBatch ? orNull(line.manufactureDate) : null,
    expiryDate: newBatch ? orNull(line.expiryDate) : null,
    unitCost: mode === "opening" ? num(line.unitCost) : mode === "adjustment" && adds ? parseDecimal(line.unitCost) : null,
    serialNos: line.trackingType === "Serial" ? splitSerials(line.serialNos) : [],
    remarks: orNull(line.remarks),
  };
}

const copy: Record<
  StockEditorMode,
  { section: string; dateLabel: string; items: string; postLabel: string; postPending: string; empty: string }
> = {
  opening: {
    section: "Opening stock",
    dateLabel: "Opening date",
    items: "Count what is in the warehouse and enter it with its cost. The cost is per the unit you choose (e.g. per bag), not per kg.",
    postLabel: "Save & post",
    postPending: "Posting…",
    empty: "Search or scan a product to add the first item.",
  },
  adjustment: {
    section: "Adjustment details",
    dateLabel: "Date",
    items: "Remove stock that is damaged, expired, lost or used, or add stock that was found. Removals are valued at the average cost.",
    postLabel: "Save & post",
    postPending: "Posting…",
    empty: "Search or scan the product to adjust.",
  },
  transfer: {
    section: "Transfer details",
    dateLabel: "Transfer date",
    items: "Stock leaves the source when you dispatch it and arrives when the other warehouse receives it.",
    postLabel: "Save & dispatch",
    postPending: "Dispatching…",
    empty: "Search or scan a product to send.",
  },
};

export function StockDocumentEditor({
  mode,
  action,
  options,
  initial = {},
  canPost,
  cancelHref,
  returnTo,
}: {
  mode: StockEditorMode;
  action: FormAction;
  options: StockEditorOptions;
  initial?: StockEditorInitial;
  /** Show "Save & post" / "Save & dispatch" (the user may post). */
  canPost: boolean;
  cancelHref: string;
  /** In a popup over the list: saving returns to the list; Cancel closes the popup. */
  returnTo?: string;
}) {
  const router = useRouter();
  const firstWarehouse = options.defaultWarehouseId ?? options.warehouses.find((w) => w.isActive)?.id ?? null;
  const [header, setHeader] = useState(() => ({
    date: initial.date ?? todayIso(),
    warehouseId: initial.warehouseId ?? firstWarehouse,
    toWarehouseId: initial.toWarehouseId ?? null,
    reason: initial.reason ?? (mode === "adjustment" ? "Damage" : "Opening"),
    remarks: initial.remarks ?? "",
  }));
  const [lines, setLines] = useState<EditorLine[]>(() => {
    const products = new Map((initial.products ?? []).map((p) => [p.id, p]));
    return (initial.lines ?? []).map((line) => lineFromSaved(line, products.get(line.productId)));
  });
  const [showIssues, setShowIssues] = useState(false);
  const { chosen: chosenIntent, choose: chooseIntent } = useSubmitIntent();
  const text = copy[mode];
  const set = <K extends keyof typeof header>(key: K, value: (typeof header)[K]) =>
    setHeader((current) => ({ ...current, [key]: value }));

  // ---- Validation (mirrors the API's rules so mistakes show before saving)
  const issues = lines.map((line) => lineIssues(line, mode));
  const headerIssues: string[] = [];
  if (!header.date) headerIssues.push("Enter the date.");
  if (!header.warehouseId)
    headerIssues.push(mode === "transfer" ? "Choose the warehouse the stock leaves from." : "Choose the warehouse.");
  if (mode === "transfer" && !header.toWarehouseId) headerIssues.push("Choose the warehouse the stock goes to.");
  if (mode === "transfer" && header.warehouseId && header.warehouseId === header.toWarehouseId)
    headerIssues.push("The stock must go to a different warehouse.");
  if (lines.length === 0) headerIssues.push("Add at least one item.");
  const problems = [
    ...headerIssues,
    ...issues.flatMap((list, index) => (list.length ? [`Line ${index + 1} (${lines[index].productName}): ${list[0]}`] : [])),
  ];
  const problemCount = headerIssues.length + issues.reduce((sum, list) => sum + list.length, 0);

  // ---- Totals
  const values = lines.map((line) => {
    const cost = parseDecimal(line.unitCost);
    return addsStock(mode, line) && cost !== null ? round(num(line.quantity) * cost, 2) : null;
  });
  const enteredValue = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const adding = mode === "adjustment" ? lines.filter((l) => l.direction === "add").length : 0;
  const removing = mode === "adjustment" ? lines.length - adding : 0;

  function payload(): StockAdjustmentUpsertRequest | StockTransferUpsertRequest {
    const built = lines.map((line) => buildLine(line, mode));
    if (mode === "transfer") {
      return {
        transferDate: header.date,
        fromWarehouseId: header.warehouseId ?? 0,
        toWarehouseId: header.toWarehouseId ?? 0,
        remarks: orNull(header.remarks),
        lines: built,
      };
    }
    return {
      adjustmentDate: header.date,
      warehouseId: header.warehouseId ?? 0,
      reason: mode === "opening" ? "Opening" : header.reason,
      remarks: orNull(header.remarks),
      lines: built,
    };
  }

  // Refuses in the browser while the form has problems; the hidden "problems" field carries them.
  const submit: FormAction = async (previous, formData) => {
    const found = formData.get("problems");
    if (typeof found === "string" && found) {
      const list = found.split("\n");
      const more = list.length > 3 ? ` (and ${list.length - 3} more)` : "";
      return actionError(`Please fix these first: ${list.slice(0, 3).join(" ")}${more}`);
    }
    formData.delete("problems");
    return action(previous, formData);
  };

  function updateLine(key: string, patch: Partial<EditorLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function changeUnit(line: EditorLine, unitId: number) {
    const from = factorOf(line);
    const to = line.units.find((u) => u.unitId === unitId)?.conversionFactor ?? 1;
    const cost = parseDecimal(line.unitCost);
    updateLine(line.key, { unitId, unitCost: cost === null ? line.unitCost : String(round((cost / from) * to, 4)) });
  }

  /** Batches picked from stock belong to a warehouse: a new (source) warehouse needs them picked again. */
  function changeWarehouse(warehouseId: number | null) {
    setHeader((current) => ({
      ...current,
      warehouseId,
      // A transfer can't go to the warehouse it leaves from.
      toWarehouseId: current.toWarehouseId === warehouseId ? null : current.toWarehouseId,
    }));
    setLines((current) =>
      current.map((line) => (batchFromStock(mode, line) && line.batchId ? { ...line, batchId: null, batchLabel: null } : line)),
    );
  }

  function pickProduct(product: ProductLookupItem) {
    const existing = lines.find(
      (l) => l.productId === product.id && l.trackingType === "None" && (mode !== "adjustment" || l.direction === "remove"),
    );
    if (existing && product.trackingType === "None") updateLine(existing.key, { quantity: String(num(existing.quantity) + 1) });
    else setLines((current) => [...current, lineFromProduct(product, mode)]);
  }

  const warehouseChoices = (selected: number | null) => options.warehouses.filter((w) => w.isActive || w.id === selected);
  const reasons: string[] = [...ADJUSTMENT_REASONS];
  if (mode === "adjustment" && !reasons.includes(header.reason)) reasons.push(header.reason);
  const fromName = options.warehouses.find((w) => w.id === header.warehouseId)?.name;
  const toName = options.warehouses.find((w) => w.id === header.toWarehouseId)?.name;

  return (
    <ActionForm action={submit} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload())} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <input type="hidden" name="problems" value={problems.join("\n")} />
      <FormMessage />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title={text.section} />
            <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label={text.dateLabel}
                name="date"
                required
                hint={mode === "opening" ? "Usually the day you start using the system." : undefined}
              >
                <Input id="date" type="date" value={header.date} onChange={(e) => set("date", e.target.value)} required />
              </Field>

              <Field label={mode === "transfer" ? "From warehouse" : "Warehouse"} name="warehouseId" required>
                <Select
                  id="warehouseId"
                  value={header.warehouseId ?? ""}
                  onChange={(e) => changeWarehouse(e.target.value ? Number(e.target.value) : null)}
                  required
                >
                  <option value="" disabled>
                    Choose a warehouse
                  </option>
                  {warehouseChoices(header.warehouseId).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {mode === "transfer" && (
                <Field label="To warehouse" name="toWarehouseId" required>
                  <Select
                    id="toWarehouseId"
                    value={header.toWarehouseId ?? ""}
                    onChange={(e) => set("toWarehouseId", e.target.value ? Number(e.target.value) : null)}
                    required
                  >
                    <option value="" disabled>
                      Choose a warehouse
                    </option>
                    {warehouseChoices(header.toWarehouseId)
                      .filter((w) => w.id !== header.warehouseId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                  </Select>
                </Field>
              )}

              {mode === "adjustment" && (
                <Field label="Reason" name="reason" required>
                  <Select id="reason" value={header.reason} onChange={(e) => set("reason", e.target.value)}>
                    {reasons.map((r) => (
                      <option key={r} value={r}>
                        {label(r)}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Items" description={text.items} />
            <CardBody className="space-y-4">
              <ProductSearch
                stockOnly
                warehouseId={header.warehouseId}
                onPick={pickProduct}
                disabled={mode === "transfer" && !header.warehouseId}
              />
              {lines.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  {text.empty}
                </p>
              ) : (
                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <LineRow
                      key={line.key}
                      index={index}
                      line={line}
                      mode={mode}
                      value={values[index]}
                      warehouseId={header.warehouseId}
                      issues={showIssues ? issues[index] : []}
                      onChange={(patch) => updateLine(line.key, patch)}
                      onUnit={(unitId) => changeUnit(line, unitId)}
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
                <Textarea id="remarks" rows={3} maxLength={1000} value={header.remarks} onChange={(e) => set("remarks", e.target.value)} />
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader title="Summary" />
            <CardBody className="space-y-2.5 text-sm">
              <SummaryRow label="Items" value={String(lines.length)} />
              {mode === "adjustment" && (
                <>
                  <SummaryRow label="Adding stock" value={String(adding)} />
                  <SummaryRow label="Removing stock" value={String(removing)} />
                  {enteredValue > 0 && <SummaryRow label="Value added (cost entered)" value={formatAmount(enteredValue)} />}
                </>
              )}
              {mode === "opening" && (
                <div className="border-t border-gray-200 pt-2.5 dark:border-gray-800">
                  <SummaryRow label="Stock value" value={formatAmount(enteredValue)} strong />
                </div>
              )}
              {mode === "transfer" && (
                <p className="text-gray-500 dark:text-gray-400">
                  {fromName && toName ? (
                    <>
                      From <strong className="text-gray-700 dark:text-gray-300">{fromName}</strong> to{" "}
                      <strong className="text-gray-700 dark:text-gray-300">{toName}</strong>, at the average cost.
                    </>
                  ) : (
                    "Choose both warehouses."
                  )}
                </p>
              )}
              {mode === "adjustment" && removing > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Removals are valued at the average cost when posted.</p>
              )}
            </CardBody>
          </Card>

          <div className="flex flex-col gap-2">
            {showIssues && problemCount > 0 && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {problemCount} thing{problemCount === 1 ? "" : "s"} to fix before saving.
              </p>
            )}
            {/* Save draft comes first in the DOM (shown below) so Enter in a field saves, never posts. */}
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
                  pendingLabel={text.postPending}
                >
                  {text.postLabel}
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {mode === "transfer"
                ? "A draft moves nothing. Dispatching takes the stock out of the source warehouse."
                : "A draft moves nothing. Posting updates the stock."}
            </p>
          </div>
        </div>
      </div>
    </ActionForm>
  );
}

function SummaryRow({ label: text, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", strong && "font-semibold text-gray-800 dark:text-white/90")}>
      <span className={strong ? "" : "text-gray-500 dark:text-gray-400"}>{text}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function LineRow({
  index,
  line,
  mode,
  value,
  warehouseId,
  issues,
  onChange,
  onUnit,
  onRemove,
}: {
  index: number;
  line: EditorLine;
  mode: StockEditorMode;
  /** Quantity x cost, when the line adds stock at a cost entered. */
  value: number | null;
  warehouseId: number | null;
  issues: string[];
  onChange: (patch: Partial<EditorLine>) => void;
  onUnit: (unitId: number) => void;
  onRemove: () => void;
}) {
  const factor = factorOf(line);
  const unitCode = unitCodeOf(line);
  const baseQuantity = round(num(line.quantity) * factor);
  const adds = addsStock(mode, line);
  const showCost = mode === "opening" || (mode === "adjustment" && adds);
  const showValue = mode !== "transfer";
  const id = (field: string) => `line-${line.key}-${field}`;
  const serials = splitSerials(line.serialNos);
  const columns = (mode === "adjustment" ? 1 : 0) + 3 + (showCost ? 1 : 0) + (showValue ? 1 : 0);

  function toggleSerial(serialNo: string) {
    const next = serials.includes(serialNo) ? serials.filter((s) => s !== serialNo) : [...serials, serialNo];
    // Serial items are usually entered one piece each: keep the quantity in step.
    onChange(factor === 1 ? { serialNos: next.join("\n"), quantity: String(next.length) } : { serialNos: next.join("\n") });
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        issues.length ? "border-red-300 dark:border-red-500/40" : "border-gray-200 dark:border-gray-800",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-800 dark:text-white/90">
            <span className="mr-2 text-gray-400">{index + 1}.</span>
            {line.productName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {line.productCode}
            {line.trackingType !== "None" && ` · ${line.trackingType === "Batch" ? "batch" : "serial"} tracked`}
            {factor !== 1 && baseQuantity > 0 && ` · ${formatQuantity(baseQuantity)} ${line.baseUnitCode}`}
          </p>
        </div>
        <button type="button" aria-label={`Remove ${line.productName}`} onClick={onRemove} className="text-gray-400 hover:text-red-500">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      <div className={cn("mt-3 grid gap-3 sm:grid-cols-3", gridColumns[columns])}>
        {mode === "adjustment" && (
          <div>
            <Label htmlFor={id("direction")}>Change</Label>
            <Select
              id={id("direction")}
              className={cn("h-10", line.direction === "remove" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400")}
              value={line.direction}
              onChange={(e) => onChange({ direction: e.target.value as "add" | "remove" })}
            >
              <option value="remove">Remove (−)</option>
              <option value="add">Add (+)</option>
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor={id("unit")}>Unit</Label>
          <Select id={id("unit")} className="h-10" value={line.unitId} onChange={(e) => onUnit(Number(e.target.value))}>
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
          <Input
            id={id("qty")}
            className="h-10"
            inputMode="decimal"
            value={line.quantity}
            placeholder="0"
            onChange={(e) => onChange({ quantity: e.target.value })}
          />
        </div>
        {showCost && (
          <div>
            <Label htmlFor={id("cost")}>
              Cost per {unitCode}
              {mode === "opening" ? " *" : ""}
            </Label>
            <Input
              id={id("cost")}
              className="h-10"
              inputMode="decimal"
              value={line.unitCost}
              placeholder={mode === "adjustment" ? "Average" : "0.00"}
              onChange={(e) => onChange({ unitCost: e.target.value })}
            />
          </div>
        )}
        <div>
          <Label htmlFor={id("note")}>Note</Label>
          <Input id={id("note")} className="h-10" value={line.remarks} maxLength={500} onChange={(e) => onChange({ remarks: e.target.value })} />
        </div>
        {showValue && (
          <div className="text-right">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Value</span>
            <span className="block py-2.5 text-sm font-semibold text-gray-800 tabular-nums dark:text-white/90">
              {value !== null ? formatAmount(value) : <span className="font-normal text-gray-500">Average cost</span>}
            </span>
          </div>
        )}
      </div>

      {line.trackingType === "Batch" && adds && (
        <div className="mt-3 space-y-3">
          <div role="radiogroup" aria-label="Batch" className="inline-flex rounded-lg border border-gray-300 p-1 dark:border-gray-700">
            {(["new", "existing"] as const).map((source) => (
              <button
                key={source}
                type="button"
                role="radio"
                aria-checked={line.batchSource === source}
                onClick={() => onChange({ batchSource: source })}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium",
                  line.batchSource === source
                    ? "bg-brand-500 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
                )}
              >
                {source === "new" ? "New batch" : "Batch already in stock"}
              </button>
            ))}
          </div>
          {line.batchSource === "new" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor={id("batch")}>Batch / lot no *</Label>
                <Input id={id("batch")} className="h-10" value={line.batchNo} maxLength={60} onChange={(e) => onChange({ batchNo: e.target.value })} />
              </div>
              <div>
                <Label htmlFor={id("mfg")}>Manufactured</Label>
                <Input id={id("mfg")} className="h-10" type="date" value={line.manufactureDate} onChange={(e) => onChange({ manufactureDate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor={id("exp")}>Expiry{line.hasExpiry ? " *" : ""}</Label>
                <Input id={id("exp")} className="h-10" type="date" value={line.expiryDate} onChange={(e) => onChange({ expiryDate: e.target.value })} />
              </div>
            </div>
          ) : (
            <StockBatchSelect
              id={id("batchId")}
              productId={line.productId}
              warehouseId={warehouseId}
              baseUnitCode={line.baseUnitCode}
              value={line.batchId}
              fallbackLabel={line.batchLabel}
              onChange={(batchId, batchLabel) => onChange({ batchId, batchLabel })}
            />
          )}
        </div>
      )}

      {line.trackingType === "Batch" && !adds && (
        <div className="mt-3 sm:max-w-md">
          <StockBatchSelect
            id={id("batchId")}
            productId={line.productId}
            warehouseId={warehouseId}
            baseUnitCode={line.baseUnitCode}
            value={line.batchId}
            fallbackLabel={line.batchLabel}
            onChange={(batchId, batchLabel) => onChange({ batchId, batchLabel })}
          />
        </div>
      )}

      {line.trackingType === "Serial" && (
        <div className="mt-3 space-y-2">
          <Label htmlFor={id("serials")}>
            Serial numbers ({serials.length} of {formatQuantity(baseQuantity)})
          </Label>
          <Textarea
            id={id("serials")}
            rows={2}
            value={line.serialNos}
            placeholder={adds ? "Scan or type one serial number per line" : "Pick below, or scan one serial number per line"}
            onChange={(e) => onChange({ serialNos: e.target.value })}
          />
          {!adds && <SerialPicker productId={line.productId} warehouseId={warehouseId} selected={serials} onToggle={toggleSerial} />}
        </div>
      )}

      {issues.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-xs text-red-600 dark:text-red-400">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Batches of the product in stock in the warehouse, first to expire first. */
function StockBatchSelect({
  id,
  productId,
  warehouseId,
  baseUnitCode,
  value,
  fallbackLabel,
  onChange,
}: {
  id: string;
  productId: number;
  warehouseId: number | null;
  baseUnitCode: string;
  value: number | null;
  fallbackLabel: string | null;
  onChange: (batchId: number | null, batchLabel: string | null) => void;
}) {
  const { items: batches, loading } = useLookupList<BatchStockItem>(
    warehouseId ? `/api/lookup/batches?productId=${productId}&warehouseId=${warehouseId}` : null,
  );
  const selected = batches.find((b) => b.batchId === value);

  return (
    <div>
      <Label htmlFor={id}>Batch *</Label>
      <Select
        id={id}
        className="h-10"
        value={value ?? ""}
        onChange={(e) => {
          const batchId = e.target.value ? Number(e.target.value) : null;
          onChange(batchId, batches.find((b) => b.batchId === batchId)?.batchNo ?? null);
        }}
      >
        <option value="">
          {!warehouseId ? "Choose the warehouse first" : loading ? "Loading batches…" : batches.length ? "Choose the batch" : "No batch in stock here"}
        </option>
        {batches.map((b) => (
          <option key={b.batchId} value={b.batchId}>
            {b.batchNo} · {formatQuantity(b.quantity)} {baseUnitCode}
            {b.expiryDate ? ` · exp ${b.expiryDate}` : ""}
          </option>
        ))}
        {value && !selected && <option value={value}>{fallbackLabel ?? `Batch #${value}`}</option>}
      </Select>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {selected?.expiryDate ? `Expires ${selected.expiryDate}. ` : ""}The first to expire is listed first.
      </p>
    </div>
  );
}

/** Serial numbers of the product in stock in the warehouse, to pick for a removal or transfer. */
function SerialPicker({
  productId,
  warehouseId,
  selected,
  onToggle,
}: {
  productId: number;
  warehouseId: number | null;
  selected: string[];
  onToggle: (serialNo: string) => void;
}) {
  const { items, loading } = useLookupList<SerialStockItem>(
    warehouseId ? `/api/lookup/serials?productId=${productId}&warehouseId=${warehouseId}` : null,
  );
  if (!warehouseId) return null;
  if (loading) return <p className="text-xs text-gray-500 dark:text-gray-400">Loading serial numbers in stock…</p>;
  if (items.length === 0) return <p className="text-xs text-gray-500 dark:text-gray-400">No serial numbers of this product in stock here.</p>;

  return (
    <div>
      <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">In stock here ({items.length}). Click to pick:</p>
      <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
        {items.map((item) => {
          const picked = selected.includes(item.serialNo);
          return (
            <button
              key={item.serialNumberId}
              type="button"
              aria-pressed={picked}
              onClick={() => onToggle(item.serialNo)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs",
                picked
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5",
              )}
            >
              {picked && <Check className="size-3" aria-hidden />}
              {item.serialNo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
