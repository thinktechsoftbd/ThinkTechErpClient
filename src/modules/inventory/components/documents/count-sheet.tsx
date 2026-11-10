"use client";

import { Search } from "lucide-react";
import { showDate } from "@/core/utils/date";
import { useState, type KeyboardEvent } from "react";
import { ActionForm, FormMessage } from "@/core/forms/action-form";
import { actionError, type FormAction } from "@/core/forms/action-state";
import { Field, Input, Select, Textarea } from "@/core/forms/fields";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatAmount, formatQuantity, parseDecimal, round } from "@/core/utils/number";
import type { StockCount, StockCountLine, StockCountUpdateRequest } from "../../types";
import { IntentSubmit, useSubmitIntent } from "./intent-submit";

type View = "all" | "pending" | "difference";

type Row = {
  line: StockCountLine;
  /** null: not counted; NaN: not a valid number. */
  counted: number | null;
  difference: number | null;
  value: number | null;
};

const orNull = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

function readCounted(text: string | undefined): number | null {
  if (!text || !text.trim()) return null;
  const value = parseDecimal(text);
  return value === null || value < 0 ? Number.NaN : value;
}

/**
 * The count sheet: the system quantity the API took when the count started, the quantity found
 * (base units; empty = not counted), the difference and its value at the line's cost.
 * Read-only once the count is posted or cancelled.
 */
export function CountSheet({ count, action }: { count: StockCount; action?: FormAction }) {
  const editable = Boolean(action) && count.status === "InProgress";
  const [counted, setCounted] = useState<Record<number, string>>(() =>
    Object.fromEntries(count.lines.map((l) => [l.id, l.countedQuantity === null ? "" : String(l.countedQuantity)])),
  );
  const [notes, setNotes] = useState<Record<number, string>>(() =>
    Object.fromEntries(count.lines.map((l) => [l.id, l.remarks ?? ""])),
  );
  const [remarks, setRemarks] = useState(count.remarks ?? "");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("all");
  const { chosen: chosenIntent, choose: chooseIntent } = useSubmitIntent();

  const rows: Row[] = count.lines.map((line) => {
    const value = editable ? readCounted(counted[line.id]) : line.countedQuantity;
    const difference = value === null || Number.isNaN(value) ? null : round(value - line.systemQuantity, 4);
    return { line, counted: value, difference, value: difference === null ? null : round(difference * line.unitCost, 2) };
  });

  const countedRows = rows.filter((r) => r.counted !== null && !Number.isNaN(r.counted));
  const gain = rows.reduce((sum, r) => sum + (r.value && r.value > 0 ? r.value : 0), 0);
  const loss = rows.reduce((sum, r) => sum + (r.value && r.value < 0 ? r.value : 0), 0);
  const withDifference = rows.filter((r) => r.difference !== null && r.difference !== 0).length;
  const invalid = rows.filter((r) => r.counted !== null && Number.isNaN(r.counted));
  const notCounted = rows.length - countedRows.length - invalid.length;

  const text = search.trim().toLowerCase();
  const visible = rows.filter((r) => {
    if (view === "pending" && r.counted !== null) return false;
    if (view === "difference" && (r.difference === null || r.difference === 0)) return false;
    if (!text) return true;
    return [r.line.productName, r.line.productCode, r.line.batchNo ?? ""].some((v) => v.toLowerCase().includes(text));
  });

  const payload: StockCountUpdateRequest = {
    remarks: orNull(remarks),
    lines: rows.map((r) => ({
      lineId: r.line.id,
      countedQuantity: r.counted === null || Number.isNaN(r.counted) ? null : r.counted,
      remarks: orNull(notes[r.line.id]),
    })),
  };
  const problems = invalid.map((r) => `${r.line.productName}${r.line.batchNo ? ` (batch ${r.line.batchNo})` : ""}: enter 0 or more.`);

  const submit: FormAction = async (previous, formData) => {
    const found = formData.get("problems");
    if (typeof found === "string" && found) {
      const list = found.split("\n");
      return actionError(`Fix the counted quantity of ${list.slice(0, 3).join(" ")}${list.length > 3 ? ` (and ${list.length - 3} more)` : ""}`);
    }
    formData.delete("problems");
    return action ? action(previous, formData) : actionError("This count can't be changed.");
  };

  /** Enter moves to the next counted box instead of submitting, so a sheet can be keyed in quickly. */
  function nextOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input[data-counted]"));
    const index = inputs.indexOf(event.currentTarget);
    inputs[index + 1]?.focus();
    inputs[index + 1]?.select();
  }

  const summary = (
    <dl className="space-y-2.5 text-sm">
      <SummaryRow label="Lines counted" value={`${formatQuantity(countedRows.length)} of ${formatQuantity(rows.length)}`} />
      <SummaryRow label="Lines with a difference" value={formatQuantity(withDifference)} />
      <SummaryRow label="Found more (gain)" value={formatAmount(gain)} tone={gain > 0 ? "gain" : undefined} />
      <SummaryRow label="Found less (loss)" value={formatAmount(loss)} tone={loss < 0 ? "loss" : undefined} />
      <div className="border-t border-gray-200 pt-2.5 dark:border-gray-800">
        <SummaryRow label="Net difference" value={formatAmount(round(gain + loss, 2))} strong />
      </div>
    </dl>
  );

  const table = (
    <Card>
      <CardHeader
        title={`Count sheet (${rows.length} line${rows.length === 1 ? "" : "s"})`}
        description={
          editable
            ? "Count the shelf and enter what you find, in the base unit (kg, pcs…). Leave a line empty if you didn't count it."
            : "Quantities are in the base unit."
        }
        actions={
          <>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a product"
                aria-label="Find a product on the sheet"
                className="h-9 pl-9"
              />
            </div>
            <div className="w-44">
              <Select value={view} onChange={(e) => setView(e.target.value as View)} aria-label="Show lines" className="h-9">
                <option value="all">All lines</option>
                <option value="pending">Not counted yet</option>
                <option value="difference">With a difference</option>
              </Select>
            </div>
          </>
        }
      />
      {rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          No products to count. Serial-tracked products are left out of counts.
        </p>
      ) : visible.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No lines match.</p>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Product</TH>
              <TH>Batch</TH>
              <TH className="text-right">System qty</TH>
              <TH className="text-right">Counted</TH>
              <TH className="text-right">Difference</TH>
              <TH className="text-right">Value</TH>
              <TH>Note</TH>
            </tr>
          </THead>
          <TBody>
            {visible.map(({ line, counted: value, difference, value: amount }) => {
              const bad = value !== null && Number.isNaN(value);
              return (
                <TR key={line.id}>
                  <TD>
                    <span className="font-medium text-gray-800 dark:text-white/90">{line.productName}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{line.productCode}</span>
                  </TD>
                  <TD className="text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
                    {line.batchNo ?? "—"}
                    {line.expiryDate && <span className="block">exp {showDate(line.expiryDate)}</span>}
                  </TD>
                  <TD className="text-right whitespace-nowrap tabular-nums">
                    {formatQuantity(line.systemQuantity)} <span className="text-xs text-gray-500">{line.baseUnitCode}</span>
                  </TD>
                  <TD className="text-right">
                    {editable ? (
                      <Input
                        data-counted
                        inputMode="decimal"
                        value={counted[line.id] ?? ""}
                        onChange={(e) => setCounted((current) => ({ ...current, [line.id]: e.target.value }))}
                        onKeyDown={nextOnEnter}
                        aria-label={`Counted quantity of ${line.productName}${line.batchNo ? `, batch ${line.batchNo}` : ""}`}
                        aria-invalid={bad || undefined}
                        className={cn("ml-auto h-9 w-28 px-3 text-right", bad && "border-red-400 dark:border-red-500")}
                      />
                    ) : (
                      <span className="tabular-nums">{value === null ? "Not counted" : formatQuantity(value)}</span>
                    )}
                  </TD>
                  <TD
                    className={cn(
                      "text-right whitespace-nowrap tabular-nums",
                      difference !== null && difference > 0 && "text-green-700 dark:text-green-400",
                      difference !== null && difference < 0 && "text-red-600 dark:text-red-400",
                    )}
                  >
                    {difference === null ? "—" : `${difference > 0 ? "+" : ""}${formatQuantity(difference)}`}
                  </TD>
                  <TD className="text-right whitespace-nowrap tabular-nums">{amount === null || amount === 0 ? "—" : formatAmount(amount)}</TD>
                  <TD>
                    {editable ? (
                      <Input
                        value={notes[line.id] ?? ""}
                        maxLength={500}
                        onChange={(e) => setNotes((current) => ({ ...current, [line.id]: e.target.value }))}
                        aria-label={`Note for ${line.productName}`}
                        className="h-9 min-w-40 px-3"
                      />
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{line.remarks ?? ""}</span>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </Card>
  );

  if (!editable) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">{table}</div>
        <Card className="xl:self-start">
          <CardHeader title="Summary" />
          <CardBody>{summary}</CardBody>
        </Card>
      </div>
    );
  }

  const postMessage = [
    "Post this count?",
    "A stock adjustment is created for the differences and the stock is corrected.",
    notCounted > 0 ? `${notCounted} line(s) are not counted and are left as they are.` : "",
    "A posted count can't be changed.",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ActionForm action={submit} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <input type="hidden" name="problems" value={problems.join("\n")} />
      <FormMessage />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {table}
          <Card>
            <CardBody>
              <Field label="Remarks" name="remarks">
                <Textarea id="remarks" rows={2} maxLength={1000} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </Field>
            </CardBody>
          </Card>
        </div>
        <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader title="Summary" />
            <CardBody>{summary}</CardBody>
          </Card>
          <div className="flex flex-col gap-2">
            {invalid.length > 0 && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {invalid.length} counted quantit{invalid.length === 1 ? "y is" : "ies are"} not a number of 0 or more.
              </p>
            )}
            <IntentSubmit intent="save" chosen={chosenIntent} onChoose={chooseIntent} variant="outline" pendingLabel="Saving…">
              Save counts
            </IntentSubmit>
            <IntentSubmit
              intent="post"
              chosen={chosenIntent}
              onChoose={chooseIntent}
              variant="primary"
              pendingLabel="Posting…"
              confirmMessage={problems.length ? undefined : postMessage}
            >
              Save & post count
            </IntentSubmit>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Save as often as you like while counting. Posting adjusts the stock to what you counted.
            </p>
          </div>
        </div>
      </div>
    </ActionForm>
  );
}

function SummaryRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "gain" | "loss" }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", strong && "font-semibold text-gray-800 dark:text-white/90")}>
      <dt className={strong ? "" : "text-gray-500 dark:text-gray-400"}>{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          tone === "gain" && "text-green-700 dark:text-green-400",
          tone === "loss" && "text-red-600 dark:text-red-400",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
