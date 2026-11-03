"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { FieldError } from "@/core/forms/action-form";
import { Input } from "@/core/forms/fields";
import { Button } from "@/core/ui/button";
import { LedgerHeadPicker } from "@/modules/accounting/components/ledger-head-picker";
import type { LedgerHeadOption } from "@/modules/accounting/types";
import type { PaymentSourceLine } from "../../types";

type EditorRow = { key: number; id: number | null; paymentFor: string; head: LedgerHeadOption | null };

const muted = "text-gray-500 dark:text-gray-400";

/** A saved line as the picker's value: the head's code, name and class path. */
function rowFrom(line: PaymentSourceLine, key: number): EditorRow {
  return {
    key,
    id: line.id,
    paymentFor: line.paymentFor,
    head: { id: line.accSubClassId, code: line.accountCode, name: line.accountName, nature: "", path: line.accountPath },
  };
}

/**
 * The detail rows of a payment source: what each payment is for and the ledger head it posts to. Saved
 * lines keep their id, so the API updates them in place. The rows are posted as JSON in the hidden
 * "lines" field.
 */
export function PaymentSourceLinesEditor({ initial }: { initial: PaymentSourceLine[] }) {
  const [rows, setRows] = useState<EditorRow[]>(() => initial.map((line, index) => rowFrom(line, index + 1)));
  const [nextKey, setNextKey] = useState(initial.length + 1);

  const update = (key: number, change: Partial<EditorRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
  const add = () => {
    setRows((current) => [...current, { key: nextKey, id: null, paymentFor: "", head: null }]);
    setNextKey((key) => key + 1);
  };

  const payload = rows.map((row) => ({ id: row.id, paymentFor: row.paymentFor.trim(), accSubClassId: row.head?.id ?? 0 }));

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400">
        Payment for, and the ledger head it posts to
      </legend>
      <input type="hidden" name="lines" value={JSON.stringify(payload)} />

      {rows.length === 0 ? (
        <p className={`rounded-xl border border-dashed border-gray-300 px-4 py-5 text-center text-sm dark:border-gray-700 ${muted}`}>
          No lines yet. Add one for each kind of payment made from this source.
        </p>
      ) : (
        <ol className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {rows.map((row, index) => (
            <li key={row.key} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,3fr)_2rem] sm:items-center">
              <span className="hidden size-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 sm:flex dark:bg-white/5 dark:text-gray-300">
                {index + 1}
              </span>
              <Input
                value={row.paymentFor}
                maxLength={150}
                placeholder="Payment for, e.g. Supplier payment"
                aria-label={`Line ${index + 1} payment for`}
                className="h-10"
                onChange={(event) => update(row.key, { paymentFor: event.target.value })}
              />
              <LedgerHeadPicker
                value={row.head}
                onChange={(head) => update(row.key, { head })}
                placeholder="Search a ledger head…"
                aria-label={`Line ${index + 1} ledger head`}
                className="h-10"
              />
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                className="inline-flex size-8 items-center justify-center justify-self-end rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                aria-label={`Remove line ${index + 1}`}
                title="Remove"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      )}

      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" aria-hidden /> Add line
      </Button>
      <FieldError name="lines" />
    </fieldset>
  );
}
