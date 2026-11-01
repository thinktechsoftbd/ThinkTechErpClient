"use client";

import Link from "next/link";
import { Info, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Field, Input, Select, Textarea } from "@/core/forms/fields";
import { buttonClasses } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { formatAmount, parseDecimal, round, todayIso } from "@/core/utils/number";
import { PAYMENT_METHODS, accountingLabel, type BillVoucherRequest, type LedgerHeadOption, type PartyOption } from "../types";
import { LedgerHeadSelect, PartySelect } from "./pickers";

const referenceLabel: Record<string, string> = {
  Cash: "Money receipt / voucher no",
  Bank: "Transfer reference",
  Cheque: "Cheque no",
  MobileWallet: "Transaction ID",
  Card: "Approval / transaction no",
  Other: "Reference no",
};

type BalanceState = { key: string; balance: number | null; error?: string };

/**
 * A supplier bill payment (Dr the supplier's payable head, Cr cash or bank) or a customer bill
 * collection (Dr cash or bank, Cr the customer's receivable head), posted in one step. Shows the
 * party's balance on the chosen head. Submits JSON in the hidden "payload" field.
 */
export function BillForm({
  kind,
  action,
  parties,
  heads,
  initialPartyId,
  cancelHref,
}: {
  kind: "payment" | "collection";
  action: FormAction;
  parties: PartyOption[];
  /** Every sub class: the party's head and the cash or bank head are both chosen from them. */
  heads: LedgerHeadOption[];
  initialPartyId: number | null;
  cancelHref: string;
}) {
  const isPayment = kind === "payment";
  const partyWord = isPayment ? "supplier" : "customer";

  const [form, setForm] = useState(() => ({
    voucherDate: todayIso(),
    partyId: initialPartyId ? String(initialPartyId) : "",
    partyAccountId: "",
    cashAccountId: "",
    paymentMethod: "Cash",
    referenceNo: "",
    chequeDate: "",
    amount: "",
    narration: "",
  }));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  // The party's balance on the chosen head, from the posted vouchers.
  const balanceKey = form.partyId && form.partyAccountId ? `${form.partyAccountId}:${form.partyId}` : "";
  const [loaded, setLoaded] = useState<BalanceState>({ key: "", balance: null });
  useEffect(() => {
    if (!balanceKey) return;
    let cancelled = false;
    const params = new URLSearchParams({ accountId: form.partyAccountId, partyId: form.partyId });
    fetch(`/api/lookup/party-balance?${params}`, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) setLoaded({ key: balanceKey, balance: null, error: data?.error ?? "Couldn't load the balance." });
        else setLoaded({ key: balanceKey, balance: typeof data?.balance === "number" ? data.balance : 0 });
      })
      .catch(() => !cancelled && setLoaded({ key: balanceKey, balance: null, error: "Couldn't load the balance." }));
    return () => {
      cancelled = true;
    };
  }, [balanceKey, form.partyAccountId, form.partyId, isPayment]);
  const balance = balanceKey && loaded.key === balanceKey ? loaded : null;

  // A payable head carries a credit (−) balance for what is owed; a receivable head a debit (+) one.
  const due = balance?.balance === null || balance?.balance === undefined ? null : round(isPayment ? -balance.balance : balance.balance, 2);

  const isCheque = form.paymentMethod === "Cheque";
  const payload: BillVoucherRequest = {
    voucherDate: form.voucherDate,
    partyId: Number(form.partyId) || 0,
    partyAccountId: Number(form.partyAccountId) || 0,
    cashAccountId: Number(form.cashAccountId) || 0,
    amount: round(parseDecimal(form.amount) ?? 0, 4),
    paymentMethod: form.paymentMethod,
    referenceNo: form.referenceNo.trim() || null,
    chequeDate: isCheque && form.chequeDate ? form.chequeDate : null,
    narration: form.narration.trim() || null,
  };

  return (
    <ActionForm action={action} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <FormMessage />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader title={isPayment ? "Payment" : "Collection"} />
          <CardBody className="grid gap-5 sm:grid-cols-2">
            <Field label={isPayment ? "Supplier" : "Customer"} name="partyId" required className="sm:col-span-2">
              <PartySelect
                id="partyId"
                parties={parties}
                placeholder={`Choose the ${partyWord}…`}
                value={form.partyId}
                onChange={(event) => set("partyId", event.target.value)}
                required
              />
            </Field>
            <Field
              label={isPayment ? "Payable head (Dr)" : "Receivable head (Cr)"}
              name="partyAccountId"
              required
              hint={`The sub class the ${partyWord}'s balance is kept on, such as ${isPayment ? "Accounts Payable" : "Accounts Receivable"}.`}
            >
              <LedgerHeadSelect
                id="partyAccountId"
                heads={heads}
                value={form.partyAccountId}
                onChange={(event) => set("partyAccountId", event.target.value)}
                required
              />
            </Field>
            <Field
              label={isPayment ? "Paid from (Cr)" : "Deposited to (Dr)"}
              name="cashAccountId"
              required
              hint="The cash-in-hand or bank sub class."
            >
              <LedgerHeadSelect
                id="cashAccountId"
                heads={heads}
                value={form.cashAccountId}
                onChange={(event) => set("cashAccountId", event.target.value)}
                required
              />
            </Field>
            <Field label="Date" name="voucherDate" required>
              <Input id="voucherDate" type="date" value={form.voucherDate} onChange={(event) => set("voucherDate", event.target.value)} required />
            </Field>
            <Field label={isPayment ? "Paid by" : "Received by"} name="paymentMethod" required>
              <Select id="paymentMethod" value={form.paymentMethod} onChange={(event) => set("paymentMethod", event.target.value)}>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {accountingLabel(method)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={referenceLabel[form.paymentMethod] ?? "Reference no"} name="referenceNo">
              <Input id="referenceNo" value={form.referenceNo} maxLength={100} onChange={(event) => set("referenceNo", event.target.value)} />
            </Field>
            {isCheque && (
              <Field label="Cheque date" name="chequeDate" required>
                <Input id="chequeDate" type="date" value={form.chequeDate} onChange={(event) => set("chequeDate", event.target.value)} required />
              </Field>
            )}
            <Field label="Narration" name="narration" className="sm:col-span-2" hint={`Leave empty for “Bill ${isPayment ? "payment to" : "collection from"} …”.`}>
              <Textarea id="narration" rows={2} maxLength={500} value={form.narration} onChange={(event) => set("narration", event.target.value)} />
            </Field>
          </CardBody>
        </Card>

        <div className="space-y-6 lg:self-start">
          <Card>
            <CardHeader title="Amount" />
            <CardBody className="space-y-5">
              <Field label={isPayment ? "Amount paid" : "Amount received"} name="amount" required>
                <Input
                  id="amount"
                  value={form.amount}
                  inputMode="decimal"
                  onChange={(event) => set("amount", event.target.value)}
                  className="text-right text-base font-medium tabular-nums"
                  required
                />
              </Field>
              <div className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-white/[0.03]">
                {!balanceKey ? (
                  <p className="flex gap-2 text-gray-500 dark:text-gray-400">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Choose the {partyWord} and head to see their balance.
                  </p>
                ) : !balance ? (
                  <p className="flex items-center gap-2 text-gray-500">
                    <LoaderCircle className="size-4 animate-spin" aria-hidden /> Loading the balance…
                  </p>
                ) : balance.error ? (
                  <p className="text-red-600 dark:text-red-400">{balance.error}</p>
                ) : (
                  <dl className="space-y-1.5">
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-600 dark:text-gray-400">
                        {due !== null && due < 0 ? `Advance ${isPayment ? "with the supplier" : "from the customer"}` : isPayment ? "Owed to the supplier" : "Owed by the customer"}
                      </dt>
                      <dd className="font-medium tabular-nums text-gray-800 dark:text-white/90">{formatAmount(Math.abs(due ?? 0))}</dd>
                    </div>
                    {due !== null && due > 0 && (
                      <button
                        type="button"
                        onClick={() => set("amount", due.toFixed(2))}
                        className="text-xs font-medium text-brand-500 hover:underline"
                      >
                        {isPayment ? "Pay" : "Collect"} the full {formatAmount(due)}
                      </button>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">Per the posted vouchers on this head.</p>
                  </dl>
                )}
              </div>
            </CardBody>
          </Card>
          <div className="flex flex-col gap-3">
            <SubmitButton pendingLabel="Posting…" className="w-full">
              {isPayment ? "Post payment" : "Post collection"}
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
