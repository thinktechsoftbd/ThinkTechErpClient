"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useState } from "react";
import { FieldError } from "@/core/forms/action-form";
import { Select } from "@/core/forms/fields";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/utils/cn";
import { formatAmount, formatQuantity, round } from "@/core/utils/number";
import { purchaseLabel } from "../../types";

/** A tax rate the editor can add (from the organization's tax rates). */
export type TaxRateChoice = {
  id: number;
  code: string;
  name: string;
  taxType: string;
  ratePercent: number;
  isRecoverable: boolean;
  isActive: boolean;
};

export type TaxGroupRateRow = { taxRateId: number; isCompound: boolean };

const muted = "text-gray-500 dark:text-gray-400";
const iconButton =
  "inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200";

/** The first rate has no tax before it, so it is never compound. */
function normalize(rows: TaxGroupRateRow[]) {
  return rows.map((row, index) => (index === 0 && row.isCompound ? { ...row, isCompound: false } : row));
}

/**
 * Tax on an amount of 100, rate by rate, as the API calculates it: a compound rate applies on
 * the amount plus the taxes before it (e.g. VAT on top of SD).
 */
function previewOn100(rows: TaxGroupRateRow[], byId: Map<number, TaxRateChoice>) {
  let running = 0;
  let nonRecoverable = 0;
  const lines = rows.map((row, index) => {
    const rate = byId.get(row.taxRateId);
    const percent = rate?.ratePercent ?? 0;
    const compound = index > 0 && row.isCompound;
    const taxable = compound ? 100 + running : 100;
    const tax = (taxable * percent) / 100;
    running += tax;
    if (rate && !rate.isRecoverable) nonRecoverable += tax;
    return { row, rate, compound, taxable, tax };
  });
  return { lines, total: round(running, 4), nonRecoverable: round(nonRecoverable, 4) };
}

/**
 * Ordered rates of a tax group: add from a select, mark compound, reorder, remove. The rows are
 * posted as JSON in the hidden "rates" field; no rows makes an exempt group.
 */
export function TaxGroupRatesEditor({ catalog, initial }: { catalog: TaxRateChoice[]; initial: TaxGroupRateRow[] }) {
  const [rows, setRows] = useState<TaxGroupRateRow[]>(() => normalize(initial));
  const [pick, setPick] = useState("");

  const byId = new Map(catalog.map((rate) => [rate.id, rate]));
  const available = catalog.filter((rate) => rate.isActive && !rows.some((row) => row.taxRateId === rate.id));
  const preview = previewOn100(rows, byId);

  const update = (next: TaxGroupRateRow[]) => setRows(normalize(next));
  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };
  const add = () => {
    const id = Number(pick);
    if (!byId.has(id) || rows.some((row) => row.taxRateId === id)) return;
    update([...rows, { taxRateId: id, isCompound: false }]);
    setPick("");
  };

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400">Rates, in the order they apply</legend>
      <input type="hidden" name="rates" value={JSON.stringify(rows)} />

      {rows.length === 0 ? (
        <p className={`rounded-xl border border-dashed border-gray-300 px-4 py-5 text-center text-sm dark:border-gray-700 ${muted}`}>
          No rates: this is an <span className="font-medium text-gray-700 dark:text-gray-300">Exempt</span> group (no tax).
        </p>
      ) : (
        <ol className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {rows.map((row, index) => {
            const rate = byId.get(row.taxRateId);
            const label = rate ? `${rate.code} ${formatQuantity(rate.ratePercent)}%` : `Rate #${row.taxRateId}`;
            return (
              <li key={row.taxRateId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:flex-nowrap">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {label}
                    {rate && rate.name !== rate.code && <span className={`ml-2 font-normal ${muted}`}>{rate.name}</span>}
                  </p>
                  <p className={`text-xs ${muted}`}>
                    {rate ? purchaseLabel(rate.taxType) : "Tax"}
                    {rate && !rate.isRecoverable && " · adds to cost"}
                    {rate && !rate.isActive && " · inactive"}
                  </p>
                </div>
                <label
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 text-sm",
                    index === 0 ? "cursor-not-allowed text-gray-400 dark:text-gray-600" : "cursor-pointer text-gray-700 dark:text-gray-300",
                  )}
                  title={
                    index === 0
                      ? "The first rate can't be compound: there is no tax before it."
                      : "Charged on the amount plus the taxes above it."
                  }
                >
                  <input
                    type="checkbox"
                    checked={index > 0 && row.isCompound}
                    disabled={index === 0}
                    onChange={(event) =>
                      update(rows.map((item, i) => (i === index ? { ...item, isCompound: event.target.checked } : item)))
                    }
                    className="size-4 rounded border-gray-300 accent-brand-500 disabled:opacity-40 dark:border-gray-700"
                  />
                  Compound
                </label>
                <span className="inline-flex shrink-0 items-center">
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${label} up`}
                    title="Move up"
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() => move(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label={`Move ${label} down`}
                    title="Move down"
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={cn(iconButton, "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400")}
                    onClick={() => update(rows.filter((_, i) => i !== index))}
                    aria-label={`Remove ${label}`}
                    title="Remove"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex gap-2">
        {/* Widths live on wrappers: the shared controls are w-full. */}
        <div className="min-w-0 flex-1">
          <Select
            value={pick}
            onChange={(event) => setPick(event.target.value)}
            aria-label="Tax rate to add"
            className="h-9"
            disabled={available.length === 0}
          >
            <option value="">{available.length === 0 ? "No more active tax rates to add" : "Choose a tax rate to add"}</option>
            {available.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.code} · {formatQuantity(rate.ratePercent)}% · {rate.name}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={add} disabled={!pick}>
          <Plus className="size-4" aria-hidden /> Add
        </Button>
      </div>
      <FieldError name="rates" />

      <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-white/[0.03]">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-gray-700 dark:text-gray-300">Effective rate</span>
          {rows.length === 0 ? (
            <Badge>Exempt</Badge>
          ) : (
            <span className="text-base font-semibold text-gray-800 tabular-nums dark:text-white/90">
              {formatQuantity(preview.total)}%
            </span>
          )}
        </div>
        {rows.length > 0 && (
          <ul className={`mt-2 space-y-0.5 text-xs tabular-nums ${muted}`}>
            <li>On an amount of 100.00:</li>
            {preview.lines.map((line) => (
              <li key={line.row.taxRateId} className="flex justify-between gap-3">
                <span>
                  {line.rate?.code ?? `#${line.row.taxRateId}`} {formatQuantity(line.rate?.ratePercent ?? 0)}% on{" "}
                  {formatAmount(line.taxable)}
                  {line.compound && " (compound)"}
                </span>
                <span>{formatAmount(line.tax)}</span>
              </li>
            ))}
            {preview.nonRecoverable > 0 && (
              <li className="pt-1 text-amber-700 dark:text-amber-400">
                {formatQuantity(preview.nonRecoverable)}% is not recoverable and adds to the cost of the goods.
              </li>
            )}
          </ul>
        )}
      </div>
    </fieldset>
  );
}
