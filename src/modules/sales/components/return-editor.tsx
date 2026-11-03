"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Facts } from "@/core/documents/facts";
import { ActionForm, FormMessage } from "@/core/forms/action-form";
import { actionError, type FormAction } from "@/core/forms/action-state";
import { Checkbox, Field, Input, Label, Select, Textarea } from "@/core/forms/fields";
import { buttonClasses } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { cn } from "@/core/utils/cn";
import { formatAmount, formatQuantity, parseDecimal, round, todayIso } from "@/core/utils/number";
import { IntentSubmit, useSubmitIntent } from "@/modules/inventory/components/documents/intent-submit";
import {
  COUNTER_METHODS,
  RETURN_REASONS,
  customerLabel,
  salesLabel,
  type ReturnSettlement,
  type SalesInvoice,
  type SalesLine,
  type SalesReturnUpsertRequest,
} from "../types";

export type ReturnEditorWarehouse = { id: number; name: string; isActive: boolean };

/** A line of a saved draft return, by the sale line it returns. */
export type ReturnEditorLineInitial = {
  salesInvoiceLineId: number;
  quantity: number;
  isRestockable: boolean;
  serialNos: string[];
  remarks: string | null;
};

/** A saved draft (editing) to start from. */
export type ReturnEditorInitial = {
  date?: string;
  warehouseId?: number | null;
  reason?: string;
  settlementType?: ReturnSettlement;
  refundMethod?: string | null;
  refundProvider?: string | null;
  refundReferenceNo?: string | null;
  remarks?: string | null;
  lines?: ReturnEditorLineInitial[];
};

/** What the sale's earlier (posted) returns already took, worked out on the server. */
export type ReturnEditorHistory = {
  /** Paid on the sale (at the counter and by receipts) and not refunded yet; null when not known. */
  refundRoom: number | null;
  /** Serial numbers already brought back, by sale line id. */
  returnedSerials: Record<string, string[]>;
};

type LineState = { quantity: string; restockable: boolean; serialNos: string[] };

/** A line box label: shown on phones, read out only in the desktop table (which has column headings). */
const rowLabel = "mb-1 block text-xs text-gray-500 md:sr-only dark:text-gray-400";
const columns = "md:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_6rem_6.5rem_6rem_6.5rem]";

const orNull = (value: string | undefined | null) => (value && value.trim() ? value.trim() : null);
const isStock = (line: SalesLine) => line.productType === "Stock";
const isSerial = (line: SalesLine) => line.productType === "Stock" && line.trackingType === "Serial";
/** Still on the sale to bring back, in the line's unit (drafts don't count until posted). */
const returnableOf = (line: SalesLine) => Math.max(0, round(line.quantity - line.returnedQuantity));
/** The quantity in the line's unit for this many serial numbers (one per base unit). */
const quantityForSerials = (line: SalesLine, count: number) => round(count / (line.conversionFactor || 1));

const dayFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
/** "2026-10-29" -> "29 Oct 2026", without shifting across time zones. */
function formatDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? dayFormat.format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))) : value;
}

/** The line's amounts for this quantity, in proportion to what was sold (as the API works them out). */
function shareOf(line: SalesLine, quantity: number) {
  const ratio = line.quantity > 0 ? quantity / line.quantity : 0;
  return { tax: round(line.taxAmount * ratio, 2), total: round(line.lineTotal * ratio, 2) };
}

function defaultRefundMethod(sale: SalesInvoice) {
  return sale.paymentMethod && (COUNTER_METHODS as readonly string[]).includes(sale.paymentMethod) ? sale.paymentMethod : "Cash";
}

export function ReturnEditor({
  sale,
  warehouses,
  initial = {},
  history = { refundRoom: null, returnedSerials: {} },
  canPost,
  action,
  cancelHref,
}: {
  /** The posted sale the goods come back from. */
  sale: SalesInvoice;
  warehouses: ReturnEditorWarehouse[];
  initial?: ReturnEditorInitial;
  history?: ReturnEditorHistory;
  /** Show "Save & post return" (the user may post). */
  canPost: boolean;
  action: FormAction;
  cancelHref: string;
}) {
  const hasCustomer = sale.customerId !== null;
  const [header, setHeader] = useState(() => {
    const today = todayIso();
    return {
      date: initial.date ?? (today < sale.invoiceDate ? sale.invoiceDate : today),
      warehouseId: initial.warehouseId ?? sale.warehouseId,
      reason: initial.reason ?? "NotNeeded",
      settlementType: initial.settlementType ?? ((sale.saleType === "Credit" && hasCustomer ? "AdjustDue" : "Refund") as ReturnSettlement),
      refundMethod: initial.refundMethod ?? defaultRefundMethod(sale),
      refundProvider: initial.refundProvider ?? "",
      refundReferenceNo: initial.refundReferenceNo ?? "",
      remarks: initial.remarks ?? "",
    };
  });
  const [lines, setLines] = useState<Record<string, LineState>>(() => {
    const saved = new Map((initial.lines ?? []).map((line) => [line.salesInvoiceLineId, line]));
    return Object.fromEntries(
      sale.lines.map((line) => {
        const draft = saved.get(line.id);
        const state: LineState = draft
          ? { quantity: String(draft.quantity), restockable: draft.isRestockable || !isStock(line), serialNos: draft.serialNos }
          : { quantity: "", restockable: true, serialNos: [] };
        return [String(line.id), state];
      }),
    );
  });
  const [showIssues, setShowIssues] = useState(false);
  const { chosen: chosenIntent, choose: chooseIntent } = useSubmitIntent();
  const set = <K extends keyof typeof header>(key: K, value: (typeof header)[K]) => setHeader((current) => ({ ...current, [key]: value }));
  const updateLine = (id: number, patch: Partial<LineState>) =>
    setLines((current) => ({ ...current, [String(id)]: { ...stateOf(current, id), ...patch } }));

  // A walk-in sale has no account to deduct from.
  const settlement: ReturnSettlement = hasCustomer ? header.settlementType : "Refund";
  const refund = settlement === "Refund";
  const returnedSerials = (line: SalesLine) => history.returnedSerials[String(line.id)] ?? [];
  const availableSerials = (line: SalesLine) => {
    const gone = new Set(returnedSerials(line));
    return line.serialNos.filter((serial) => !gone.has(serial));
  };

  const rows = sale.lines.map((line) => {
    const state = stateOf(lines, line.id);
    const quantity = parseDecimal(state.quantity);
    const taken = quantity !== null && quantity > 0 ? quantity : 0;
    return { line, state, quantity, returnable: returnableOf(line), amounts: shareOf(line, taken), returning: taken > 0 };
  });
  const returning = rows.filter((row) => row.returning);
  const linesTotal = round(returning.reduce((sum, row) => sum + row.amounts.total, 0), 2);
  const tax = round(returning.reduce((sum, row) => sum + row.amounts.tax, 0), 2);
  // The sale's bill discount ("less") is shared in proportion, so the customer gets back what they paid.
  const saleLinesTotal = sale.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const billShare = sale.extraDiscountAmount > 0 && saleLinesTotal > 0 ? round((sale.extraDiscountAmount * linesTotal) / saleLinesTotal, 2) : 0;
  const total = Math.max(0, round(linesTotal - billShare, 2));
  const againstDue = round(Math.min(total, Math.max(0, sale.dueAmount)), 2);
  const toAdvance = round(total - againstDue, 2);
  const nothingLeft = rows.every((row) => row.returnable <= 0);

  // ---- Checks before saving (the API checks everything again)
  const problems: string[] = [];
  if (returning.length === 0) problems.push("Enter the quantity coming back for at least one item.");
  rows.forEach(({ line, state, quantity, returnable }) => {
    if (!state.quantity.trim()) return;
    const label = `Line ${line.lineNo} (${line.productName})`;
    if (quantity === null || quantity < 0) {
      problems.push(`${label}: enter a quantity of 0 or more.`);
      return;
    }
    if (quantity > returnable + 0.0001)
      problems.push(
        returnable > 0
          ? `${label}: only ${formatQuantity(returnable)} ${line.unitCode} can still be returned.`
          : `${label}: everything sold on this line has been returned.`,
      );
    if (isSerial(line) && quantity > 0 && round(quantity * line.conversionFactor) !== state.serialNos.length)
      problems.push(`${label}: tick one serial number per item coming back.`);
  });
  if (!header.date) problems.push("Enter the return date.");
  else if (header.date < sale.invoiceDate) problems.push(`The return date can't be before the sale date (${formatDay(sale.invoiceDate)}).`);
  if (refund && !header.refundMethod) problems.push("Choose how the money is refunded.");

  // Warnings only: the API has the last word.
  const refundWarning =
    refund && history.refundRoom !== null && total > history.refundRoom + 0.005
      ? history.refundRoom <= 0
        ? `Nothing paid on this sale is left to refund.${hasCustomer ? " Deduct the return from the customer's dues instead." : ""}`
        : `Only ${formatAmount(history.refundRoom)} was paid on this sale and not refunded yet. Refund at most that${hasCustomer ? ", or deduct the return from the dues" : ""}.`
      : null;
  const damagedWarning =
    (header.reason === "Damaged" || header.reason === "Expired") && returning.some((row) => isStock(row.line) && row.state.restockable)
      ? `Untick “Can be resold” for ${header.reason === "Damaged" ? "damaged" : "expired"} items so they don't go back into stock.`
      : null;

  const submit: FormAction = async (previous, formData) => {
    if (problems.length > 0) {
      const more = problems.length > 3 ? ` (and ${problems.length - 3} more)` : "";
      return actionError(`Please fix these first: ${problems.slice(0, 3).join(" ")}${more}`);
    }
    return action(previous, formData);
  };

  function payload(): SalesReturnUpsertRequest {
    const remarksOf = new Map((initial.lines ?? []).map((line) => [line.salesInvoiceLineId, line.remarks]));
    const withDetails = refund && header.refundMethod !== "Cash";
    return {
      returnDate: header.date,
      salesInvoiceId: sale.id,
      warehouseId: header.warehouseId,
      reason: header.reason,
      settlementType: settlement,
      refundMethod: refund ? header.refundMethod : null,
      refundProvider: withDetails ? orNull(header.refundProvider) : null,
      refundReferenceNo: withDetails ? orNull(header.refundReferenceNo) : null,
      remarks: orNull(header.remarks),
      lines: returning.map(({ line, state, quantity }) => ({
        salesInvoiceLineId: line.id,
        quantity: quantity ?? 0,
        isRestockable: isStock(line) && state.restockable,
        serialNos: isSerial(line) ? state.serialNos : [],
        remarks: remarksOf.get(line.id) ?? null,
      })),
    };
  }

  function returnAll() {
    setLines((current) => {
      const next = { ...current };
      for (const line of sale.lines) {
        const returnable = returnableOf(line);
        if (returnable <= 0) continue;
        const state = stateOf(current, line.id);
        if (isSerial(line)) {
          const serialNos = availableSerials(line).slice(0, Math.round(returnable * (line.conversionFactor || 1)));
          next[String(line.id)] = { ...state, serialNos, quantity: String(quantityForSerials(line, serialNos.length)) };
        } else next[String(line.id)] = { ...state, quantity: String(returnable) };
      }
      return next;
    });
  }

  function clearAll() {
    setLines((current) =>
      Object.fromEntries(Object.entries(current).map(([key, state]) => [key, { ...state, quantity: "", serialNos: [] }])),
    );
  }

  const warehouseChoices = warehouses.filter((w) => w.isActive || w.id === header.warehouseId);
  const money = (value: number) => `${formatAmount(value)} ${sale.currency}`;

  return (
    <ActionForm action={submit} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload())} />
      <FormMessage />

      {/* Enter in a box must not submit the form half filled in. */}
      <div
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]"
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
        }}
      >
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title={
                <>
                  Sale{" "}
                  <Link href={`/sales/invoices/${sale.id}`} className="text-brand-500 hover:underline">
                    {sale.invoiceNo}
                  </Link>
                </>
              }
              description="Each item comes back at the price, discount and tax it was sold at."
            />
            <CardBody>
              <Facts
                items={[
                  { label: "Sale date", value: formatDay(sale.invoiceDate) },
                  {
                    label: "Customer",
                    value: hasCustomer ? (
                      <span>
                        {sale.customerName} <span className="text-gray-500">({sale.customerCode})</span>
                      </span>
                    ) : (
                      `${customerLabel(sale)} (walk-in)`
                    ),
                  },
                  { label: "Mobile", value: sale.customerMobile },
                  { label: "Sale type", value: sale.saleType === "Cash" ? "Cash" : "Credit (baki)" },
                  { label: "Total", value: money(sale.totalAmount) },
                  { label: "Received", value: money(sale.settledAmount) },
                  { label: "Due", value: sale.dueAmount > 0 ? money(sale.dueAmount) : "Nothing due" },
                  {
                    label: "Paid, not refunded yet",
                    value: history.refundRoom !== null ? money(Math.max(0, history.refundRoom)) : null,
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Items coming back"
              description="Enter how many of each item the customer brings back; leave 0 for items they keep."
              actions={
                <>
                  {returning.length > 0 && (
                    <button type="button" className={buttonClasses("ghost", "sm")} onClick={clearAll}>
                      Clear
                    </button>
                  )}
                  {!nothingLeft && (
                    <button type="button" className={buttonClasses("outline", "sm")} onClick={returnAll}>
                      Return all
                    </button>
                  )}
                </>
              }
            />
            <CardBody className="space-y-4">
              {nothingLeft && (
                <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Everything sold on {sale.invoiceNo} has been returned already.
                </p>
              )}
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                <div
                  className={cn(
                    "hidden gap-2 px-3 py-2 text-xs font-medium tracking-wide text-gray-500 uppercase md:grid dark:text-gray-400",
                    columns,
                  )}
                >
                  <span>Item</span>
                  <span className="text-right">Sold</span>
                  <span className="text-right">Returned</span>
                  <span className="text-right">Returnable</span>
                  <span className="text-right">Return qty</span>
                  <span>Can be resold</span>
                  <span className="text-right">Amount</span>
                </div>
                {rows.map(({ line, state, returnable, amounts, returning: isReturning }) => (
                  <ReturnLineRow
                    key={line.id}
                    line={line}
                    state={state}
                    returnable={returnable}
                    amount={isReturning ? amounts.total : null}
                    returnedSerials={returnedSerials(line)}
                    onChange={(patch) => updateLine(line.id, patch)}
                  />
                ))}
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="returnDate">Return date</Label>
                  <Input
                    id="returnDate"
                    type="date"
                    min={sale.invoiceDate}
                    value={header.date}
                    onChange={(e) => set("date", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Select id="reason" value={header.reason} onChange={(e) => set("reason", e.target.value)}>
                    {RETURN_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {salesLabel(reason)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="warehouseId">Goods go back to</Label>
                <Select
                  id="warehouseId"
                  value={header.warehouseId}
                  onChange={(e) => set("warehouseId", e.target.value ? Number(e.target.value) : sale.warehouseId)}
                >
                  {warehouseChoices.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.id === sale.warehouseId ? " (sold from)" : ""}
                    </option>
                  ))}
                  {!warehouseChoices.some((w) => w.id === sale.warehouseId) && <option value={sale.warehouseId}>{sale.warehouseName}</option>}
                </Select>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Settle by" />
            <CardBody className="space-y-3 text-sm">
              <div role="radiogroup" aria-label="Settle by" className="grid grid-cols-2 rounded-lg border border-gray-300 p-1 dark:border-gray-700">
                {(["Refund", "AdjustDue"] as const).map((type) => {
                  const disabled = type === "AdjustDue" && !hasCustomer;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={settlement === type}
                      disabled={disabled}
                      onClick={() => set("settlementType", type)}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
                        settlement === type
                          ? "bg-brand-500 text-white"
                          : "text-gray-600 hover:bg-gray-100 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-white/5",
                      )}
                    >
                      {type === "Refund" ? "Refund now" : "Deduct from dues"}
                    </button>
                  );
                })}
              </div>
              {!hasCustomer && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  A walk-in sale has no customer account to deduct from, so the money is refunded.
                </p>
              )}
              {refund ? (
                <>
                  <div>
                    <Label htmlFor="refundMethod">Refunded by</Label>
                    <Select id="refundMethod" value={header.refundMethod} onChange={(e) => set("refundMethod", e.target.value)}>
                      {COUNTER_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {salesLabel(method)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {header.refundMethod !== "Cash" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="refundProvider">{header.refundMethod === "MobileWallet" ? "Wallet" : "Bank / card"}</Label>
                        <Input
                          id="refundProvider"
                          value={header.refundProvider}
                          maxLength={100}
                          placeholder={header.refundMethod === "MobileWallet" ? "bKash, Nagad" : "e.g. DBBL"}
                          onChange={(e) => set("refundProvider", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="refundReferenceNo">Transaction ID</Label>
                        <Input
                          id="refundReferenceNo"
                          value={header.refundReferenceNo}
                          maxLength={100}
                          onChange={(e) => set("refundReferenceNo", e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The return settles what {sale.customerName ?? "the customer"} still owes on this sale; anything more becomes their advance.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2.5 text-sm">
              <SummaryRow label={`Items (${returning.length})`} value={formatAmount(linesTotal)} />
              {tax > 0 && <SummaryRow label="Tax (in the items)" value={formatAmount(tax)} />}
              {billShare > 0 && <SummaryRow label="Share of the bill discount" value={`-${formatAmount(billShare)}`} />}
              <div className="flex items-baseline justify-between border-t border-gray-200 pt-3 dark:border-gray-800">
                <span className="text-base font-semibold text-gray-800 dark:text-white/90">{refund ? "To refund" : "Return total"}</span>
                <span className="text-2xl font-bold text-gray-900 tabular-nums dark:text-white">{formatAmount(total)}</span>
              </div>
              {refund ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Refund at most what was paid on this sale
                  {history.refundRoom !== null ? ` (${formatAmount(Math.max(0, history.refundRoom))} not refunded yet)` : ""}.
                </p>
              ) : (
                <>
                  <SummaryRow label="Deducted from the due on this sale" value={formatAmount(againstDue)} />
                  {toAdvance > 0 && <SummaryRow label="To the customer's advance" value={formatAmount(toAdvance)} />}
                </>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">An estimate: the final figures are worked out from the sale when you save.</p>
              {[refundWarning, damagedWarning].filter((warning): warning is string => warning !== null).map((warning) => (
                <p key={warning} className="flex gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  {warning}
                </p>
              ))}
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
            {/* Save draft is first in the DOM (shown below) so no implicit submit ever posts the return. */}
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
                  pendingLabel="Posting…"
                >
                  Save &amp; post return · {formatAmount(total)}
                </IntentSubmit>
              )}
            </div>
            <Link href={cancelHref} className={buttonClasses("ghost", "md", "w-full")}>
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </ActionForm>
  );
}

function stateOf(lines: Record<string, LineState>, id: number): LineState {
  return lines[String(id)] ?? { quantity: "", restockable: true, serialNos: [] };
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="tabular-nums text-gray-800 dark:text-white/90">{value}</span>
    </div>
  );
}

function ReturnLineRow({
  line,
  state,
  returnable,
  amount,
  returnedSerials,
  onChange,
}: {
  line: SalesLine;
  state: LineState;
  returnable: number;
  /** Null: not coming back. */
  amount: number | null;
  returnedSerials: string[];
  onChange: (patch: Partial<LineState>) => void;
}) {
  const id = (field: string) => `return-${line.id}-${field}`;
  const serial = isSerial(line);
  const stock = isStock(line);
  const quantity = parseDecimal(state.quantity) ?? 0;
  const baseQuantity = round(quantity * line.conversionFactor);
  const done = returnable <= 0;
  const details = [
    line.productCode,
    line.batchNo && `batch ${line.batchNo}${line.expiryDate ? ` (exp ${formatDay(line.expiryDate)})` : ""}`,
    line.conversionFactor !== 1 && quantity > 0 && `${formatQuantity(baseQuantity)} ${line.baseUnitCode}`,
  ].filter(Boolean);

  return (
    <div className={cn("space-y-2 px-3 py-3", done && "opacity-60")}>
      <div className={cn("grid grid-cols-3 items-center gap-2", columns)}>
        <div className="col-span-3 min-w-0 md:col-span-1">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
            <span className="mr-1.5 text-gray-400">{line.lineNo}.</span>
            {line.productName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {details.join(" · ")}
            {stock && quantity > 0 && !state.restockable && (
              <span className="text-amber-700 dark:text-amber-400"> · damaged: not back in stock</span>
            )}
            {!stock && <span> · not a stock item</span>}
          </p>
        </div>
        <div className="md:text-right">
          <span className={rowLabel}>Sold</span>
          <span className="text-sm whitespace-nowrap text-gray-700 tabular-nums dark:text-gray-300">
            {formatQuantity(line.quantity)} {line.unitCode}
          </span>
        </div>
        <div className="md:text-right">
          <span className={rowLabel}>Returned before</span>
          <span className="text-sm text-gray-700 tabular-nums dark:text-gray-300">
            {line.returnedQuantity > 0 ? formatQuantity(line.returnedQuantity) : "—"}
          </span>
        </div>
        <div className="md:text-right">
          <span className={rowLabel}>Returnable</span>
          <span className={cn("text-sm whitespace-nowrap tabular-nums", done ? "text-gray-500" : "font-medium text-gray-800 dark:text-white/90")}>
            {done ? "All returned" : `${formatQuantity(returnable)} ${line.unitCode}`}
          </span>
        </div>
        <div>
          <label htmlFor={id("qty")} className={rowLabel}>
            Return qty
          </label>
          <Input
            id={id("qty")}
            className="text-right"
            inputMode="decimal"
            placeholder="0"
            value={state.quantity}
            readOnly={serial}
            disabled={done && !state.quantity}
            title={serial ? "Tick the serial numbers coming back" : `Up to ${formatQuantity(returnable)} ${line.unitCode}`}
            onFocus={(e) => e.target.select()}
            onChange={(e) => onChange({ quantity: e.target.value })}
          />
        </div>
        <div>
          {stock ? (
            <Checkbox
              id={id("resell")}
              checked={state.restockable}
              onChange={(e) => onChange({ restockable: e.target.checked })}
              title="Untick for damaged goods that can't be sold again: they don't go back into stock."
              label={<span className="md:sr-only">Can be resold</span>}
            />
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
          )}
        </div>
        <div className="text-right text-sm font-semibold text-gray-800 tabular-nums md:pr-1 dark:text-white/90">
          <span className={rowLabel}>Amount</span>
          {amount === null ? "—" : formatAmount(amount)}
        </div>
      </div>

      {serial && (
        <ReturnSerialPicker
          line={line}
          returned={returnedSerials}
          limit={Math.round(returnable * (line.conversionFactor || 1))}
          value={state.serialNos}
          onChange={(serialNos) => onChange({ serialNos, quantity: serialNos.length ? String(quantityForSerials(line, serialNos.length)) : "" })}
        />
      )}
    </div>
  );
}

/** The serial numbers sold on the line; each one ticked is one item coming back. */
function ReturnSerialPicker({
  line,
  returned,
  limit,
  value,
  onChange,
}: {
  line: SalesLine;
  /** Already brought back on a posted return. */
  returned: string[];
  /** At most this many can still come back. */
  limit: number;
  value: string[];
  onChange: (serialNos: string[]) => void;
}) {
  const [filter, setFilter] = useState("");
  const selected = new Set(value);
  const gone = new Set(returned);
  const text = filter.trim().toLowerCase();
  const shown = line.serialNos.filter((serial) => !text || serial.toLowerCase().includes(text));
  // Numbers on a draft that aren't on the sale line any more still show, so they can be unticked.
  const stray = value.filter((serial) => !line.serialNos.includes(serial));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Serial numbers coming back ({value.length} of {limit} ticked)
        </span>
        {line.serialNos.length > 12 && (
          <div className="w-44">
            <Input aria-label="Find a serial number" className="h-8 text-sm" placeholder="Find or scan" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
        )}
      </div>
      {line.serialNos.length === 0 && stray.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">The sale doesn&apos;t list the serial numbers sold on this line.</p>
      ) : (
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-auto">
          {[...stray, ...shown].map((serial) => {
            const on = selected.has(serial);
            const already = gone.has(serial) && !on;
            const full = !on && value.length >= limit;
            return (
              <button
                key={serial}
                type="button"
                aria-pressed={on}
                disabled={already || full}
                onClick={() => onChange(on ? value.filter((v) => v !== serial) : [...value, serial])}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50",
                  on
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5",
                  already && "line-through",
                )}
                title={already ? "Already returned" : undefined}
              >
                {serial}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
