"use client";

import { useState } from "react";
import { ActionForm, FormMessage } from "@/core/forms/action-form";
import { actionError, type FormAction } from "@/core/forms/action-state";
import { Input } from "@/core/forms/fields";
import { Button } from "@/core/ui/button";
import { CardBody } from "@/core/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatQuantity, parseDecimal, round } from "@/core/utils/number";
import type { StockTransferLine, StockTransferReceiveRequest } from "../../types";
import { IntentSubmit } from "./intent-submit";

/**
 * Receiving an in-transit transfer: what arrived per line, in base units (everything, unless
 * changed). A shortfall is written off as lost in transit. Serial lines arrive in full.
 */
export function ReceiveTransferForm({
  lines,
  toWarehouseName,
  action,
}: {
  lines: StockTransferLine[];
  toWarehouseName: string;
  action: FormAction;
}) {
  const sentOf = (line: StockTransferLine) => Math.abs(line.baseQuantity);
  const full = () => Object.fromEntries(lines.map((line) => [line.id, String(sentOf(line))]));
  const [received, setReceived] = useState<Record<number, string>>(full);

  const rows = lines.map((line) => {
    const sent = sentOf(line);
    const serial = line.trackingType === "Serial";
    const value = serial ? sent : parseDecimal(received[line.id]);
    const valid = value !== null && value >= 0 && value <= sent;
    return { line, sent, serial, value, valid, short: valid && value !== null ? round(sent - value, 4) : 0 };
  });
  const shortLines = rows.filter((r) => r.short > 0);
  const invalid = rows.filter((r) => !r.valid);

  const payload: StockTransferReceiveRequest = {
    lines: rows.filter((r) => !r.serial).map((r) => ({ lineId: r.line.id, receivedBaseQuantity: r.value ?? 0 })),
  };
  const problems = invalid.map((r) => `${r.line.productName}: enter 0 to ${formatQuantity(r.sent)}.`);

  const submit: FormAction = async (previous, formData) => {
    const found = formData.get("problems");
    if (typeof found === "string" && found) return actionError(`Check the quantity received. ${found.split("\n").slice(0, 3).join(" ")}`);
    formData.delete("problems");
    return action(previous, formData);
  };

  const confirmMessage = shortLines.length
    ? `Receive this transfer at ${toWarehouseName}? ${shortLines.length} line(s) arrived short; the shortfall is written off as lost in transit.`
    : `Receive everything at ${toWarehouseName}? The stock is added there now.`;

  return (
    <ActionForm action={submit}>
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <input type="hidden" name="problems" value={problems.join("\n")} />
      <CardBody className="pb-0">
        <FormMessage />
      </CardBody>
      <Table>
        <THead>
          <tr>
            <TH>Product</TH>
            <TH className="text-right">Sent</TH>
            <TH className="text-right">Received</TH>
            <TH className="text-right">Short</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map(({ line, sent, serial, valid, short }) => (
            <TR key={line.id}>
              <TD>
                <span className="font-medium text-gray-800 dark:text-white/90">{line.productName}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {line.productCode}
                  {line.batchNo && ` · batch ${line.batchNo}`}
                  {line.expiryDate && ` · exp ${line.expiryDate}`}
                </span>
              </TD>
              <TD className="text-right whitespace-nowrap tabular-nums">
                {formatQuantity(sent)} {line.baseUnitCode}
              </TD>
              <TD className="text-right">
                {serial ? (
                  <span className="text-sm text-gray-500 dark:text-gray-400">All {formatQuantity(sent)} (serial numbers)</span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Input
                      inputMode="decimal"
                      value={received[line.id] ?? ""}
                      onChange={(e) => setReceived((current) => ({ ...current, [line.id]: e.target.value }))}
                      aria-label={`Quantity of ${line.productName} received, in ${line.baseUnitCode}`}
                      aria-invalid={!valid || undefined}
                      className={cn("h-9 w-28 px-3 text-right", !valid && "border-red-400 dark:border-red-500")}
                    />
                    <span className="text-xs text-gray-500">{line.baseUnitCode}</span>
                  </span>
                )}
              </TD>
              <TD className={cn("text-right whitespace-nowrap tabular-nums", short > 0 && "text-red-600 dark:text-red-400")}>
                {short > 0 ? `${formatQuantity(short)} ${line.baseUnitCode}` : "—"}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <CardBody className="flex flex-col gap-3 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {shortLines.length
            ? `${shortLines.length} line(s) short: the missing stock is recorded as lost in transit.`
            : "Everything sent is received. Change a quantity if less arrived."}
        </p>
        <div className="flex flex-col gap-2 sm:w-64">
          <IntentSubmit variant="primary" pendingLabel="Receiving…" confirmMessage={problems.length ? undefined : confirmMessage}>
            Receive stock
          </IntentSubmit>
          {shortLines.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setReceived(full())}>
              Reset to everything sent
            </Button>
          )}
        </div>
      </CardBody>
    </ActionForm>
  );
}
