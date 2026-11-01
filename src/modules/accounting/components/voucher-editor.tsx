"use client";

import Link from "next/link";
import { Plus, Scale, X } from "lucide-react";
import { useState } from "react";
import { ActionForm, FormMessage } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Field, Input, Select, Textarea } from "@/core/forms/fields";
import { buttonClasses } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatAmount, parseDecimal, round, todayIso } from "@/core/utils/number";
import { IntentSubmit, useSubmitIntent } from "@/modules/inventory/components/documents/intent-submit";
import {
  GENERAL_VOUCHER_TYPES,
  VOUCHER_TYPE_HINTS,
  type GeneralVoucherType,
  type LedgerHeadOption,
  type PartyOption,
  type VoucherUpsertRequest,
} from "../types";
import { LedgerHeadSelect, PartySelect } from "./pickers";

export type EditorLine = {
  key: number;
  accountId: string;
  partyId: string;
  debit: string;
  credit: string;
  narration: string;
};

export type VoucherEditorInitial = {
  voucherType: GeneralVoucherType;
  voucherDate: string;
  referenceNo: string;
  narration: string;
  lines: Omit<EditorLine, "key">[];
};

const amount = (value: string) => Math.max(0, parseDecimal(value) ?? 0);
const emptyLine = (): Omit<EditorLine, "key"> => ({ accountId: "", partyId: "", debit: "", credit: "", narration: "" });

/**
 * A Journal, Payment, Receipt or Contra voucher: a header and debit/credit lines on ledger heads
 * (sub classes). Lines on a head that keeps a supplier or customer ledger name the party.
 * Submits JSON in the hidden "payload" field, with intent "save" (draft) or "post".
 */
export function VoucherEditor({
  action,
  heads,
  suppliers,
  customers,
  initial,
  cancelHref,
}: {
  action: FormAction;
  heads: LedgerHeadOption[];
  suppliers: PartyOption[];
  customers: PartyOption[];
  initial?: VoucherEditorInitial;
  cancelHref: string;
}) {
  const [header, setHeader] = useState(() => ({
    voucherType: initial?.voucherType ?? ("Journal" as GeneralVoucherType),
    voucherDate: initial?.voucherDate || todayIso(),
    referenceNo: initial?.referenceNo ?? "",
    narration: initial?.narration ?? "",
  }));
  const [nextKey, setNextKey] = useState(() => (initial?.lines.length ?? 2) + 1);
  const [lines, setLines] = useState<EditorLine[]>(() =>
    (initial?.lines.length ? initial.lines : [emptyLine(), emptyLine()]).map((line, index) => ({ ...line, key: index + 1 })),
  );
  const { chosen, choose } = useSubmitIntent();

  const headById = new Map(heads.map((head) => [String(head.id), head]));
  const totalDebit = round(lines.reduce((sum, line) => sum + amount(line.debit), 0), 2);
  const totalCredit = round(lines.reduce((sum, line) => sum + amount(line.credit), 0), 2);
  const difference = round(totalDebit - totalCredit, 2);
  const balanced = difference === 0 && totalDebit > 0;

  const update = (key: number, change: Partial<EditorLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)));

  function addLine() {
    // The new line takes what is still needed to balance, on the short side.
    const line = emptyLine();
    if (difference > 0) line.credit = difference.toFixed(2);
    if (difference < 0) line.debit = (-difference).toFixed(2);
    setLines((current) => [...current, { ...line, key: nextKey }]);
    setNextKey((key) => key + 1);
  }

  function payload(): VoucherUpsertRequest {
    return {
      voucherType: header.voucherType,
      voucherDate: header.voucherDate,
      referenceNo: header.referenceNo.trim() || null,
      narration: header.narration.trim() || null,
      lines: lines
        .filter((line) => line.accountId || amount(line.debit) > 0 || amount(line.credit) > 0)
        .map((line) => {
          const partyType = headById.get(line.accountId)?.partyType;
          const partyId = line.partyId ? Number(line.partyId) : null;
          return {
            accountId: Number(line.accountId) || 0,
            supplierId: partyType === "Supplier" ? partyId : null,
            customerId: partyType === "Customer" ? partyId : null,
            debitAmount: round(amount(line.debit), 4),
            creditAmount: round(amount(line.credit), 4),
            lineNarration: line.narration.trim() || null,
          };
        }),
    };
  }

  return (
    <ActionForm action={action} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload())} />
      <FormMessage />

      <Card>
        <CardHeader title="Voucher" />
        <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Voucher type" name="voucherType" required hint={VOUCHER_TYPE_HINTS[header.voucherType]}>
            <Select
              id="voucherType"
              value={header.voucherType}
              onChange={(event) => setHeader({ ...header, voucherType: event.target.value as GeneralVoucherType })}
            >
              {GENERAL_VOUCHER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type} voucher
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date" name="voucherDate" required>
            <Input
              id="voucherDate"
              type="date"
              value={header.voucherDate}
              onChange={(event) => setHeader({ ...header, voucherDate: event.target.value })}
              required
            />
          </Field>
          <Field label="Reference no" name="referenceNo" hint="Bill, cheque or transfer number" className="lg:col-span-2">
            <Input
              id="referenceNo"
              value={header.referenceNo}
              maxLength={100}
              onChange={(event) => setHeader({ ...header, referenceNo: event.target.value })}
            />
          </Field>
          <Field label="Narration" name="narration" className="sm:col-span-2 lg:col-span-4">
            <Textarea
              id="narration"
              rows={2}
              maxLength={500}
              value={header.narration}
              placeholder="What the voucher is for"
              onChange={(event) => setHeader({ ...header, narration: event.target.value })}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`Entries (${lines.length})`}
          description="Each line debits or credits one ledger head. Debits must equal credits to post."
          actions={
            <button type="button" onClick={addLine} className={buttonClasses("outline", "sm")}>
              <Plus className="size-4" aria-hidden /> Add line
            </button>
          }
        />
        <Table>
          <THead>
            <tr>
              <TH className="w-10">#</TH>
              <TH className="min-w-64">Ledger head</TH>
              <TH className="min-w-48">Supplier / customer</TH>
              <TH className="min-w-48">Line narration</TH>
              <TH className="w-36 text-right">Debit</TH>
              <TH className="w-36 text-right">Credit</TH>
              <TH className="w-10">
                <span className="sr-only">Remove</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {lines.map((line, index) => {
              const head = headById.get(line.accountId);
              const parties = head?.partyType === "Supplier" ? suppliers : head?.partyType === "Customer" ? customers : null;
              return (
                <TR key={line.key}>
                  <TD className="text-gray-500 tabular-nums">{index + 1}</TD>
                  <TD>
                    <LedgerHeadSelect
                      heads={heads}
                      value={line.accountId}
                      aria-label={`Line ${index + 1} ledger head`}
                      className="h-10"
                      onChange={(event) => {
                        const next = headById.get(event.target.value);
                        update(line.key, { accountId: event.target.value, ...(next?.partyType !== head?.partyType ? { partyId: "" } : {}) });
                      }}
                    />
                  </TD>
                  <TD>
                    {parties ? (
                      <PartySelect
                        parties={parties}
                        placeholder={`Choose the ${head?.partyType?.toLowerCase()}…`}
                        value={line.partyId}
                        aria-label={`Line ${index + 1} ${head?.partyType?.toLowerCase()}`}
                        className={cn("h-10", !line.partyId && "border-amber-300 dark:border-amber-500/40")}
                        onChange={(event) => update(line.key, { partyId: event.target.value })}
                      />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TD>
                  <TD>
                    <Input
                      value={line.narration}
                      maxLength={300}
                      placeholder="Optional"
                      aria-label={`Line ${index + 1} narration`}
                      className="h-10"
                      onChange={(event) => update(line.key, { narration: event.target.value })}
                    />
                  </TD>
                  <TD>
                    <Input
                      value={line.debit}
                      inputMode="decimal"
                      aria-label={`Line ${index + 1} debit`}
                      className="h-10 text-right tabular-nums"
                      onChange={(event) =>
                        update(line.key, { debit: event.target.value, ...(event.target.value.trim() ? { credit: "" } : {}) })
                      }
                    />
                  </TD>
                  <TD>
                    <Input
                      value={line.credit}
                      inputMode="decimal"
                      aria-label={`Line ${index + 1} credit`}
                      className="h-10 text-right tabular-nums"
                      onChange={(event) =>
                        update(line.key, { credit: event.target.value, ...(event.target.value.trim() ? { debit: "" } : {}) })
                      }
                    />
                  </TD>
                  <TD>
                    <button
                      type="button"
                      onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                      disabled={lines.length <= 2}
                      className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-500/10"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-white/[0.02]">
            <tr className="[&>td]:font-semibold [&>td]:text-gray-800 dark:[&>td]:text-white/90">
              <TD colSpan={4} className="text-right">
                Total
              </TD>
              <TD className="text-right tabular-nums">{formatAmount(totalDebit)}</TD>
              <TD className="text-right tabular-nums">{formatAmount(totalCredit)}</TD>
              <TD />
            </tr>
          </tfoot>
        </Table>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={cn(
            "inline-flex items-center gap-2 text-sm font-medium",
            balanced ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400",
          )}
          role="status"
        >
          <Scale className="size-4" aria-hidden />
          {balanced
            ? "Balanced: debits equal credits."
            : totalDebit === 0 && totalCredit === 0
              ? "Enter the amounts."
              : `Out of balance by ${formatAmount(Math.abs(difference))} (${difference > 0 ? "more debit" : "more credit"}).`}
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <Link href={cancelHref} className={buttonClasses("ghost")}>
            Cancel
          </Link>
          <div className="sm:w-40">
            <IntentSubmit intent="save" chosen={chosen} onChoose={choose} variant="outline" pendingLabel="Saving…">
              Save draft
            </IntentSubmit>
          </div>
          <div className="sm:w-44">
            <IntentSubmit
              intent="post"
              chosen={chosen}
              onChoose={choose}
              variant="primary"
              pendingLabel="Posting…"
              confirmMessage="Post this voucher? A posted voucher can't be edited, only cancelled."
            >
              Save &amp; post
            </IntentSubmit>
          </div>
        </div>
      </div>
    </ActionForm>
  );
}
