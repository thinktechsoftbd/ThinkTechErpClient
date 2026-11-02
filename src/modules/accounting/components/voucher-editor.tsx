"use client";

import Link from "next/link";
import { Plus, Scale, X } from "lucide-react";
import { useRef, useState } from "react";
import { ActionForm, FormMessage } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Field, Input, Select, Textarea } from "@/core/forms/fields";
import { buttonClasses } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatAmount, parseDecimal, round, todayIso } from "@/core/utils/number";
import { IntentSubmit, useSubmitIntent } from "@/modules/inventory/components/documents/intent-submit";
import type { LookupOption } from "@/modules/settings/types";
import {
  DEFAULT_VOUCHER_TYPE,
  LOCAL_CURRENCY,
  PAY_TYPES,
  isBankVoucherType,
  isChequeMethod,
  type LedgerHeadOption,
  type LookupValueOption,
  type PartyOption,
  type PayType,
  type VoucherUpsertRequest,
} from "../types";
import { LedgerHeadPicker } from "./ledger-head-picker";
import { PartySelect } from "./pickers";

export type EditorLine = {
  /** React key: unique while the editor is open. */
  key: number;
  /** The saved line, when editing a draft. */
  id: number | null;
  /** The ledger head (a sub class), searched on the server. */
  account: LedgerHeadOption | null;
  partyId: string;
  debit: string;
  credit: string;
  /** A Currency lookup id; empty = BDT. */
  currencyId: string;
  /** Local exchange rate; the amounts themselves are always in BDT. */
  rate: string;
  narration: string;
};

export type VoucherEditorInitial = {
  /** The voucher's organization; null = the one chosen in the header. */
  organizationId: number | null;
  /** Empty until the voucher is first saved. */
  voucherRefNo: string;
  /** Lookup ids as strings; empty = none chosen. */
  voucherTypeId: string;
  voucherDate: string;
  paymentMethodId: string;
  chequeNo: string;
  chequeDate: string;
  payType: string;
  narration: string;
  lines: Omit<EditorLine, "key">[];
};

/** An organization the user works in, with its suppliers and customers (parties belong to one organization). */
export type VoucherOrganization = { id: number; name: string; parties: PartyOption[] };

const amount = (value: string) => Math.max(0, parseDecimal(value) ?? 0);

/** The active values, plus the chosen one if it has since been made inactive. */
const choices = (values: LookupValueOption[], selected: string) =>
  values.filter((value) => value.isActive || String(value.id) === selected);

/**
 * A voucher: the organization, type and payment method (from the Voucher Type and Payment Method lookup
 * lists), and debit/credit lines (in BDT) on ledger heads (sub classes). A bank voucher paid by cheque
 * needs the cheque no, cheque date and pay type. A line may name one of the organization's suppliers or
 * customers, and records its currency and local exchange rate. Submits JSON in the hidden "payload" field
 * and the organization in "organizationId", with intent "save" (draft) or "post".
 */
export function VoucherEditor({
  action,
  parties,
  currencies,
  voucherTypes,
  paymentMethods,
  organizations,
  lockOrganization = false,
  initial,
  cancelHref,
}: {
  action: FormAction;
  /** The parties of the organization chosen in the header, when there are no organizations to choose from. */
  parties: PartyOption[];
  currencies: LookupOption[];
  voucherTypes: LookupValueOption[];
  paymentMethods: LookupValueOption[];
  /** The user's organizations, each with its parties; empty = the voucher goes to the header's organization. */
  organizations: VoucherOrganization[];
  /** A saved voucher stays in its organization. */
  lockOrganization?: boolean;
  initial: VoucherEditorInitial;
  cancelHref: string;
}) {
  const localCurrencyId = String(currencies.find((currency) => currency.name.toUpperCase() === LOCAL_CURRENCY)?.id ?? "");
  const emptyLine = (): Omit<EditorLine, "key"> => ({
    id: null,
    account: null,
    partyId: "",
    debit: "",
    credit: "",
    currencyId: localCurrencyId,
    rate: "1",
    narration: "",
  });
  const defaultTypeId =
    voucherTypes.find((type) => type.isActive && type.name === DEFAULT_VOUCHER_TYPE)?.id ?? voucherTypes.find((type) => type.isActive)?.id;
  const [header, setHeader] = useState(() => ({
    organizationId: String(initial.organizationId ?? organizations[0]?.id ?? ""),
    voucherTypeId: initial.voucherTypeId || (defaultTypeId ? String(defaultTypeId) : ""),
    voucherDate: initial.voucherDate || todayIso(),
    paymentMethodId: initial.paymentMethodId,
    chequeNo: initial.chequeNo,
    chequeDate: initial.chequeDate,
    payType: initial.payType,
    narration: initial.narration,
  }));
  const [lines, setLines] = useState<EditorLine[]>(() =>
    (initial.lines.length ? initial.lines : [emptyLine(), emptyLine()]).map((line, index) => ({ ...line, key: index + 1 })),
  );
  // Keys of added lines start after the starting lines', so no two lines ever share one.
  const nextKey = useRef(lines.length + 1);
  const { chosen, choose } = useSubmitIntent();

  const set = <K extends keyof typeof header>(key: K, value: (typeof header)[K]) => setHeader((current) => ({ ...current, [key]: value }));
  const organization = organizations.find((item) => String(item.id) === header.organizationId);
  const partyOptions = organization?.parties ?? parties;
  const voucherType = voucherTypes.find((type) => String(type.id) === header.voucherTypeId);
  const paymentMethod = paymentMethods.find((method) => String(method.id) === header.paymentMethodId);
  const isCheque = isChequeMethod(paymentMethod?.name);
  const chequeRequired = isCheque && isBankVoucherType(voucherType?.name);

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
    const key = nextKey.current++;
    setLines((current) => [...current, { ...line, key }]);
  }

  function changeOrganization(organizationId: string) {
    set("organizationId", organizationId);
    // Parties belong to one organization: lines naming another's lose them.
    const available = new Set((organizations.find((item) => String(item.id) === organizationId)?.parties ?? []).map((party) => String(party.id)));
    setLines((current) => current.map((line) => (line.partyId && !available.has(line.partyId) ? { ...line, partyId: "" } : line)));
  }

  function payload(): VoucherUpsertRequest {
    return {
      voucherTypeId: Number(header.voucherTypeId) || 0,
      voucherDate: header.voucherDate,
      paymentMethodId: header.paymentMethodId ? Number(header.paymentMethodId) : null,
      chequeNo: isCheque ? header.chequeNo.trim() || null : null,
      chequeDate: isCheque ? header.chequeDate || null : null,
      payType: isCheque ? ((header.payType || null) as PayType | null) : null,
      narration: header.narration.trim() || null,
      lines: lines
        .filter((line) => line.account || amount(line.debit) > 0 || amount(line.credit) > 0)
        .map((line) => ({
          id: line.id,
          accountId: line.account?.id ?? 0,
          partyId: line.partyId ? Number(line.partyId) : null,
          debitAmount: round(amount(line.debit), 4),
          creditAmount: round(amount(line.credit), 4),
          currencyLookupDataId: line.currencyId ? Number(line.currencyId) : null,
          localExchangeRate: parseDecimal(line.rate) ?? null,
          lineNarration: line.narration.trim() || null,
        })),
    };
  }

  return (
    <ActionForm action={action} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload())} />
      <input type="hidden" name="organizationId" value={organizations.length > 0 ? header.organizationId : ""} />
      <FormMessage />

      <Card>
        <CardHeader title="Voucher" />
        <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {organizations.length > 0 && (
            <Field
              label="Organization"
              name="organizationId"
              required
              className="lg:col-span-2"
              hint={lockOrganization ? "A saved voucher stays in its organization." : undefined}
            >
              <Select
                id="organizationId"
                value={header.organizationId}
                disabled={lockOrganization || organizations.length === 1}
                onChange={(event) => changeOrganization(event.target.value)}
              >
                {organizations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Voucher type" name="voucherTypeId" required className="lg:col-span-2">
            <Select id="voucherTypeId" value={header.voucherTypeId} onChange={(event) => set("voucherTypeId", event.target.value)} required>
              <option value="">Choose the voucher type…</option>
              {choices(voucherTypes, header.voucherTypeId).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                  {type.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Voucher Ref. Number"
            name="voucherRefNo"
            hint={initial.voucherRefNo ? undefined : "Numbered when the voucher is first saved."}
          >
            <Input id="voucherRefNo" value={initial.voucherRefNo} placeholder="Auto-generated" readOnly className="tabular-nums" />
          </Field>
          <Field label="Voucher Date" name="voucherDate" required>
            <Input
              id="voucherDate"
              type="date"
              value={header.voucherDate}
              onChange={(event) => set("voucherDate", event.target.value)}
              required
            />
          </Field>
          <Field
            label="Payment method"
            name="paymentMethodId"
            className="lg:col-span-2"
            hint={chequeRequired ? "A bank voucher paid by cheque needs the cheque no, date and pay type." : undefined}
          >
            <Select id="paymentMethodId" value={header.paymentMethodId} onChange={(event) => set("paymentMethodId", event.target.value)}>
              <option value="">None</option>
              {choices(paymentMethods, header.paymentMethodId).map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                  {method.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </Select>
          </Field>
          {isCheque && (
            <>
              <Field label="Cheque no" name="chequeNo" required={chequeRequired}>
                <Input
                  id="chequeNo"
                  value={header.chequeNo}
                  maxLength={50}
                  onChange={(event) => set("chequeNo", event.target.value)}
                  required={chequeRequired}
                />
              </Field>
              <Field label="Cheque date" name="chequeDate" required={chequeRequired}>
                <Input
                  id="chequeDate"
                  type="date"
                  value={header.chequeDate}
                  onChange={(event) => set("chequeDate", event.target.value)}
                  required={chequeRequired}
                />
              </Field>
              <Field label="Pay type" name="payType" required={chequeRequired} className="lg:col-span-2">
                <Select id="payType" value={header.payType} onChange={(event) => set("payType", event.target.value)} required={chequeRequired}>
                  <option value="">Choose…</option>
                  {PAY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}
          <Field label="Narration" name="narration" className="sm:col-span-2 lg:col-span-4">
            <Textarea
              id="narration"
              rows={2}
              maxLength={500}
              value={header.narration}
              placeholder="What the voucher is for"
              onChange={(event) => set("narration", event.target.value)}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`Entries (${lines.length})`}
          description="Each line debits or credits one ledger head, in BDT. Debits must equal credits to post."
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
              <TH className="min-w-60">Currency · rate</TH>
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
              const isLocal = !line.currencyId || line.currencyId === localCurrencyId;
              return (
                <TR key={line.key}>
                  <TD className="text-gray-500 tabular-nums">{index + 1}</TD>
                  <TD>
                    <LedgerHeadPicker
                      value={line.account}
                      aria-label={`Line ${index + 1} ledger head`}
                      className="h-10"
                      onChange={(head) => update(line.key, { account: head })}
                    />
                  </TD>
                  <TD>
                    <PartySelect
                      parties={partyOptions}
                      placeholder="None"
                      value={line.partyId}
                      aria-label={`Line ${index + 1} supplier or customer`}
                      className="h-10"
                      onChange={(event) => update(line.key, { partyId: event.target.value })}
                    />
                  </TD>
                  <TD>
                    {/* Select and Input are w-full, so the grid sizes them. */}
                    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
                      <Select
                        value={line.currencyId}
                        aria-label={`Line ${index + 1} currency`}
                        className="h-10"
                        onChange={(event) =>
                          update(line.key, {
                            currencyId: event.target.value,
                            ...(event.target.value === localCurrencyId ? { rate: "1" } : {}),
                          })
                        }
                      >
                        {!localCurrencyId && <option value="">{LOCAL_CURRENCY}</option>}
                        {currencies.map((currency) => (
                          <option key={currency.id} value={currency.id}>
                            {currency.name}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={line.rate}
                        inputMode="decimal"
                        readOnly={isLocal}
                        title={isLocal ? "BDT lines are at rate 1" : "BDT per unit of the currency"}
                        aria-label={`Line ${index + 1} local exchange rate`}
                        className={cn("h-10 text-right tabular-nums", isLocal && "text-gray-400")}
                        onChange={(event) => update(line.key, { rate: event.target.value })}
                      />
                    </div>
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
              <TD colSpan={5} className="text-right">
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
