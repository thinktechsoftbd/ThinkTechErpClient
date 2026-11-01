"use client";

import Link from "next/link";
import { Info, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Checkbox, Field, Input, Select, Textarea } from "@/core/forms/fields";
import { buttonClasses } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatAmount, parseDecimal, round, todayIso } from "@/core/utils/number";
import {
  RECEIPT_METHODS,
  salesLabel,
  type CustomerOption,
  type CustomerReceiptCreateRequest,
  type OpenSalesInvoice,
} from "../../types";
import { CustomerPicker } from "../customer-picker";

type ReceiptType = CustomerReceiptCreateRequest["receiptType"];

type OpenInvoicesState = {
  items: OpenSalesInvoice[];
  status: "ready" | "loading" | "error";
  error?: string;
};

const num = (value: string, fallback = 0) => parseDecimal(value) ?? fallback;
const orNull = (value: string) => (value.trim() ? value.trim() : null);
const sum = (values: number[]) => round(values.reduce((total, value) => total + value, 0), 2);

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
/** "2026-10-29" -> "29 Oct 2026", without shifting it across time zones. */
function shortDate(value: string | null) {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  return match ? dateFormat.format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))) : (value ?? "—");
}

/** Spreads `available` over the invoices in their order (the API lists the oldest due first). */
function oldestFirst(invoices: OpenSalesInvoice[], available: number) {
  const result = new Map<number, number>();
  let left = round(available, 2);
  for (const invoice of invoices) {
    if (left <= 0) break;
    const amount = round(Math.min(invoice.dueAmount, left), 2);
    if (amount > 0) result.set(invoice.id, amount);
    left = round(left - amount, 2);
  }
  return result;
}

const providerLabel: Record<string, string> = {
  Bank: "Bank",
  Cheque: "Bank",
  MobileWallet: "Wallet",
  Card: "Card / bank",
  Other: "Received through",
};
const referenceLabel: Record<string, string> = {
  Cash: "Money receipt book no",
  Bank: "Transfer reference",
  Cheque: "Cheque no",
  MobileWallet: "Transaction ID",
  Card: "Approval / transaction no",
  Other: "Reference no",
};

/**
 * Records a money receipt from a customer (or a refund of their advance) and collects their dues
 * with it: an amount per invoice, or the oldest dues first. Submits JSON in the hidden "payload" field.
 */
export function ReceiptForm({
  action,
  currencies,
  baseCurrencyId,
  initial,
  cancelHref,
}: {
  action: FormAction;
  currencies: { id: number; name: string }[];
  baseCurrencyId: number | null;
  initial: {
    customer: CustomerOption | null;
    /** The preselected customer's open invoices (loaded on the server). */
    invoices: OpenSalesInvoice[];
    invoicesError?: string;
    /** Collect this invoice (its due amount becomes the receipt). */
    invoiceId: number | null;
  };
  cancelHref: string;
}) {
  const preselected = initial.invoiceId ? initial.invoices.find((invoice) => invoice.id === initial.invoiceId) : undefined;

  const [customer, setCustomer] = useState<CustomerOption | null>(initial.customer);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoicesState>({
    items: initial.invoices,
    status: initial.invoicesError ? "error" : "ready",
    error: initial.invoicesError,
  });
  const [form, setForm] = useState(() => ({
    receiptDate: todayIso(),
    receiptType: "Receipt" as ReceiptType,
    paymentMethod: "Cash",
    paymentProvider: "",
    referenceNo: "",
    chequeDate: "",
    currencyId: preselected?.currencyLookupDataId ?? baseCurrencyId,
    exchangeRate: "1",
    amount: preselected ? String(preselected.dueAmount) : "",
    taxDeducted: "0",
    remarks: "",
  }));
  const [allocations, setAllocations] = useState<Record<number, string>>(() =>
    preselected ? { [preselected.id]: String(preselected.dueAmount) } : {},
  );
  const [autoAllocate, setAutoAllocate] = useState(!preselected);
  // Only the latest open-invoice request may land (the customer can change while one is in flight).
  const requestRef = useRef(0);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  const customerId = customer?.id ?? null;
  const isRefund = form.receiptType === "Refund";
  const isCheque = form.paymentMethod === "Cheque";
  const foreign = form.currencyId !== null && baseCurrencyId !== null && form.currencyId !== baseCurrencyId;
  const currencyName = (id: number) => currencies.find((c) => c.id === id)?.name ?? `#${id}`;
  const today = todayIso();

  // Invoices in another currency than the receipt can't be settled by it.
  const eligible = openInvoices.items.filter((i) => form.currencyId === null || i.currencyLookupDataId === form.currencyId);
  const otherCurrency = openInvoices.items.length - eligible.length;

  const amount = num(form.amount);
  const taxDeducted = isRefund ? 0 : num(form.taxDeducted);
  const settles = round(amount + taxDeducted, 2);
  const explicit = eligible
    .map((invoice) => ({ salesInvoiceId: invoice.id, amount: round(num(allocations[invoice.id] ?? ""), 2) }))
    .filter((allocation) => allocation.amount > 0);
  const preview = autoAllocate ? oldestFirst(eligible, settles) : new Map(explicit.map((a) => [a.salesInvoiceId, a.amount]));
  const allocated = sum([...preview.values()]);
  const unallocated = round(settles - allocated, 2);
  const totalDue = sum(eligible.map((invoice) => invoice.dueAmount));

  const body: CustomerReceiptCreateRequest = {
    receiptDate: form.receiptDate,
    customerId: customerId ?? 0,
    receiptType: form.receiptType,
    paymentMethod: form.paymentMethod,
    paymentProvider: form.paymentMethod !== "Cash" ? orNull(form.paymentProvider) : null,
    referenceNo: orNull(form.referenceNo),
    chequeDate: isCheque ? orNull(form.chequeDate) : null,
    currencyLookupDataId: form.currencyId,
    exchangeRate: foreign ? num(form.exchangeRate, 1) : 1,
    amount: round(amount, 2),
    taxDeductedAmount: round(taxDeducted, 2),
    remarks: orNull(form.remarks),
    allocations: isRefund || autoAllocate ? [] : explicit,
    autoAllocate: !isRefund && autoAllocate,
  };

  function loadInvoices(id: number | null) {
    const request = ++requestRef.current;
    if (!id) {
      setOpenInvoices({ items: [], status: "ready" });
      return;
    }
    setOpenInvoices({ items: [], status: "loading" });
    fetch(`/api/lookup/customer-invoices?customerId=${id}`, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : null;
          throw new Error(message ?? "The open invoices couldn't be loaded.");
        }
        return Array.isArray(data) ? (data as OpenSalesInvoice[]) : [];
      })
      .then((items) => {
        if (request === requestRef.current) setOpenInvoices({ items, status: "ready" });
      })
      .catch((error: unknown) => {
        if (request === requestRef.current)
          setOpenInvoices({
            items: [],
            status: "error",
            error: error instanceof Error ? error.message : "The open invoices couldn't be loaded.",
          });
      });
  }

  function changeCustomer(picked: CustomerOption | null) {
    setCustomer(picked);
    setAllocations({});
    loadInvoices(picked?.id ?? null);
  }

  function allocateOldest() {
    const spread = oldestFirst(eligible, settles);
    setAllocations(Object.fromEntries([...spread].map(([id, value]) => [id, String(value)])));
    setAutoAllocate(false);
  }

  function clearAllocations() {
    setAllocations({});
    setAutoAllocate(false);
  }

  function toggleAuto(checked: boolean) {
    // Switching to manual starts from what auto-allocation would do, so it can be adjusted.
    if (!checked) setAllocations(Object.fromEntries([...preview].map(([id, value]) => [id, String(value)])));
    setAutoAllocate(checked);
  }

  return (
    <ActionForm action={action} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(body)} />
      <FormMessage />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Receipt details" description="Recorded and posted in one step. Cancel it later if it was entered by mistake." />
            <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Type</span>
                <div role="radiogroup" aria-label="Receipt type" className="inline-flex rounded-lg border border-gray-300 p-1 dark:border-gray-700">
                  {(["Receipt", "Refund"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={form.receiptType === type}
                      onClick={() => set("receiptType", type)}
                      className={cn(
                        "rounded-md px-4 py-1.5 text-sm font-medium",
                        form.receiptType === type
                          ? "bg-brand-500 text-white"
                          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
                      )}
                    >
                      {type === "Receipt" ? "Receipt from customer" : "Refund to customer"}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {isRefund
                    ? "You pay back an advance the customer left with you. A refund isn't allocated to invoices."
                    : "Money received from the customer. It collects their dues on open invoices; anything left over stays as their advance."}
                </p>
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                {customer && <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Customer *</span>}
                <CustomerPicker value={customer} onChange={changeCustomer} canAdd={false} required includeInactive />
                <FieldError name="customerId" />
              </div>

              <Field label={isRefund ? "Refund date" : "Receipt date"} name="receiptDate" required>
                <Input id="receiptDate" type="date" value={form.receiptDate} onChange={(e) => set("receiptDate", e.target.value)} required />
              </Field>

              <Field label={isRefund ? "Paid by" : "Received by"} name="paymentMethod" required>
                <Select id="paymentMethod" value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                  {RECEIPT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {salesLabel(method)}
                    </option>
                  ))}
                </Select>
              </Field>

              {form.paymentMethod !== "Cash" && (
                <Field label={providerLabel[form.paymentMethod] ?? "Provider"} name="paymentProvider">
                  <Input
                    id="paymentProvider"
                    value={form.paymentProvider}
                    maxLength={100}
                    placeholder={form.paymentMethod === "MobileWallet" ? "e.g. bKash, Nagad" : "e.g. DBBL, BRAC Bank"}
                    onChange={(e) => set("paymentProvider", e.target.value)}
                  />
                </Field>
              )}

              <Field
                label={isRefund && form.paymentMethod === "Cash" ? "Voucher no" : (referenceLabel[form.paymentMethod] ?? "Reference no")}
                name="referenceNo"
                required={isCheque}
              >
                <Input id="referenceNo" value={form.referenceNo} maxLength={100} onChange={(e) => set("referenceNo", e.target.value)} required={isCheque} />
              </Field>

              {isCheque && (
                <Field label="Cheque date" name="chequeDate" required hint="The cheque starts as pending: mark it cleared or bounced once the bank confirms.">
                  <Input id="chequeDate" type="date" value={form.chequeDate} onChange={(e) => set("chequeDate", e.target.value)} required />
                </Field>
              )}

              {currencies.length > 1 && (
                <>
                  <Field label="Currency" name="currencyId">
                    <Select id="currencyId" value={form.currencyId ?? ""} onChange={(e) => set("currencyId", e.target.value ? Number(e.target.value) : null)}>
                      {currencies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {foreign && (
                    <Field label="Exchange rate" name="exchangeRate" hint="1 of this currency in the base currency.">
                      <Input id="exchangeRate" inputMode="decimal" value={form.exchangeRate} onChange={(e) => set("exchangeRate", e.target.value)} />
                    </Field>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="grid gap-5 sm:grid-cols-2">
              <Field label={isRefund ? "Amount refunded" : "Amount received"} name="amount" required hint="More than 0.">
                <Input id="amount" inputMode="decimal" value={form.amount} placeholder="0.00" onChange={(e) => set("amount", e.target.value)} required />
              </Field>
              {!isRefund && (
                <Field
                  label="Tax deducted at source"
                  name="taxDeductedAmount"
                  hint="VAT or AIT the customer withheld for you (VDS/TDS). It settles their dues like cash."
                >
                  <Input id="taxDeductedAmount" inputMode="decimal" value={form.taxDeducted} onChange={(e) => set("taxDeducted", e.target.value)} />
                </Field>
              )}
            </CardBody>
          </Card>

          {!isRefund && (
            <Card>
              <CardHeader
                title="Collect dues"
                description={
                  customer
                    ? `${eligible.length} open invoice(s) · ${formatAmount(totalDue)} due`
                    : "Choose a customer to see their open invoices."
                }
                actions={
                  eligible.length > 0 && (
                    <>
                      <button type="button" className={buttonClasses("outline", "sm")} onClick={allocateOldest} disabled={settles <= 0}>
                        Allocate oldest first
                      </button>
                      <button type="button" className={buttonClasses("ghost", "sm")} onClick={clearAllocations}>
                        Clear
                      </button>
                    </>
                  )
                }
              />
              {openInvoices.status === "loading" ? (
                <p className="flex items-center gap-2 px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden /> Loading the open invoices…
                </p>
              ) : openInvoices.status === "error" ? (
                <div className="flex flex-wrap items-center gap-3 px-6 py-6 text-sm text-red-600 dark:text-red-400">
                  {openInvoices.error}
                  <button type="button" className={buttonClasses("outline", "sm")} onClick={() => loadInvoices(customerId)}>
                    Try again
                  </button>
                </div>
              ) : !customer ? null : eligible.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
                  No open invoices{otherCurrency > 0 ? " in this currency" : ""}. The receipt stays as an advance from the customer.
                </p>
              ) : (
                <>
                  <div className="px-5 pt-4 sm:px-6">
                    <Checkbox
                      label="Auto-allocate: collect the oldest dues first when it's saved"
                      checked={autoAllocate}
                      onChange={(e) => toggleAuto(e.target.checked)}
                    />
                  </div>
                  <Table className="mt-3">
                    <THead>
                      <tr>
                        <TH>Invoice</TH>
                        <TH>Date</TH>
                        <TH>Due date</TH>
                        <TH className="text-right">Total</TH>
                        <TH className="text-right">Due</TH>
                        <TH className="w-40 text-right">Collect</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {eligible.map((invoice) => {
                        const value = autoAllocate ? String(preview.get(invoice.id) ?? "") : (allocations[invoice.id] ?? "");
                        const over = !autoAllocate && num(value) > invoice.dueAmount;
                        const overdue = invoice.dueDate !== null && invoice.dueDate < today;
                        return (
                          <TR key={invoice.id}>
                            <TD>
                              <Link href={`/sales/invoices/${invoice.id}`} target="_blank" className="font-medium text-brand-500 hover:underline">
                                {invoice.invoiceNo}
                              </Link>
                            </TD>
                            <TD className="whitespace-nowrap">{shortDate(invoice.invoiceDate)}</TD>
                            <TD className="whitespace-nowrap">
                              {invoice.dueDate ? shortDate(invoice.dueDate) : "—"}
                              {overdue && <span className="block text-xs text-red-600 dark:text-red-400">Overdue</span>}
                            </TD>
                            <TD className="text-right tabular-nums">{formatAmount(invoice.totalAmount)}</TD>
                            <TD className="text-right tabular-nums">{formatAmount(invoice.dueAmount)}</TD>
                            <TD className="text-right">
                              <Input
                                aria-label={`Amount for ${invoice.invoiceNo}`}
                                inputMode="decimal"
                                className={cn("h-9 text-right", over && "border-red-400 dark:border-red-500")}
                                value={value}
                                placeholder="0.00"
                                disabled={autoAllocate}
                                onChange={(e) => setAllocations((current) => ({ ...current, [invoice.id]: e.target.value }))}
                              />
                              {over && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">More than due</span>}
                              {!autoAllocate && num(value) === 0 && settles > allocated && (
                                <button
                                  type="button"
                                  className="mt-1 text-xs text-brand-500 hover:underline"
                                  onClick={() =>
                                    setAllocations((current) => ({
                                      ...current,
                                      [invoice.id]: String(round(Math.min(invoice.dueAmount, settles - allocated), 2)),
                                    }))
                                  }
                                >
                                  Collect {formatAmount(Math.min(invoice.dueAmount, round(settles - allocated, 2)))}
                                </button>
                              )}
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                  {autoAllocate && (
                    <p className="flex items-start gap-2 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:text-gray-400">
                      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      The amounts above show how the oldest dues would be collected; the API does the allocation when the receipt is saved.
                    </p>
                  )}
                </>
              )}
              {otherCurrency > 0 && openInvoices.status === "ready" && (
                <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:border-gray-800 dark:text-gray-400">
                  {otherCurrency} open invoice(s) in another currency
                  {openInvoices.items
                    .filter((i) => !eligible.includes(i))
                    .map((i) => i.currencyLookupDataId)
                    .filter((id, index, ids) => ids.indexOf(id) === index)
                    .map((id) => ` (${currencyName(id)})`)
                    .join("")}{" "}
                  can&apos;t be settled by this receipt: change the currency to collect them.
                </p>
              )}
            </Card>
          )}

          <Card>
            <CardBody>
              <Field label="Remarks" name="remarks">
                <Textarea id="remarks" rows={3} maxLength={1000} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader title="Summary" />
            <CardBody className="space-y-2.5 text-sm">
              {isRefund ? (
                <SummaryRow label="Refund paid" value={amount} strong />
              ) : (
                <>
                  <SummaryRow label="Received" value={amount} />
                  {taxDeducted > 0 && <SummaryRow label="Tax deducted" value={taxDeducted} />}
                  <div className="border-t border-gray-200 pt-2.5 dark:border-gray-800">
                    <SummaryRow label="Settles" value={settles} strong />
                  </div>
                  <SummaryRow label={autoAllocate ? "Allocated (estimated)" : "Allocated to invoices"} value={allocated} />
                  {unallocated >= 0 ? (
                    <SummaryRow label="Unallocated (advance)" value={unallocated} strong />
                  ) : (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                      Allocated {formatAmount(-unallocated)} more than the receipt plus the tax deducted.
                    </p>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          <div className="flex flex-col gap-2">
            <SubmitButton pendingLabel="Saving…" className="w-full">
              {isRefund ? "Record refund" : "Record receipt"}
            </SubmitButton>
            <Link href={cancelHref} className={buttonClasses("ghost", "md", "w-full")}>
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </ActionForm>
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
