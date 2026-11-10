import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { showDate } from "@/core/utils/date";
import { cn } from "@/core/utils/cn";
import { formatAmount, formatQuantity, round } from "@/core/utils/number";
import type { StockLine, StockTransferLine } from "../../types";

/**
 * Lines of a saved stock document. The API's unit cost is per base unit; quantities are in the
 * line's unit, with the base quantity under them when the unit is a pack.
 */
export function StockLinesTable({
  lines,
  mode,
}: {
  /** Transfer lines carry what was received. */
  lines: (StockLine & Partial<Pick<StockTransferLine, "receivedBaseQuantity">>)[];
  mode: "opening" | "adjustment" | "transfer";
}) {
  const showCost = mode !== "transfer" || lines.some((line) => line.unitCost !== null);
  const showReceived = mode === "transfer" && lines.some((line) => line.receivedBaseQuantity != null);

  return (
    <Table>
      <THead>
        <tr>
          <TH>#</TH>
          <TH>Product</TH>
          <TH className="text-right">{mode === "adjustment" ? "Change" : mode === "transfer" ? "Sent" : "Quantity"}</TH>
          {showReceived && <TH className="text-right">Received</TH>}
          {showReceived && <TH className="text-right">Lost in transit</TH>}
          {showCost && <TH className="text-right">Cost</TH>}
          {showCost && <TH className="text-right">Value</TH>}
        </tr>
      </THead>
      <TBody>
        {lines.map((line) => {
          const removes = line.quantity < 0;
          const sign = mode === "adjustment" ? (removes ? "−" : "+") : "";
          const baseQuantity = Math.abs(line.baseQuantity);
          const value = line.unitCost === null ? null : round((removes ? -1 : 1) * baseQuantity * line.unitCost, 2);
          const received = line.receivedBaseQuantity ?? null;
          const lost = received === null ? 0 : round(baseQuantity - received, 4);
          return (
            <TR key={line.id}>
              <TD className="text-gray-400">{line.lineNo}</TD>
              <TD>
                <span className="font-medium text-gray-800 dark:text-white/90">{line.productName}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {line.productCode}
                  {line.batchNo && ` · batch ${line.batchNo}`}
                  {line.expiryDate && ` · exp ${showDate(line.expiryDate)}`}
                  {line.remarks && ` · ${line.remarks}`}
                </span>
                {line.serialNos.length > 0 && (
                  <span className="block font-mono text-xs break-all text-gray-500 dark:text-gray-400">S/N {line.serialNos.join(", ")}</span>
                )}
              </TD>
              <TD
                className={cn(
                  "text-right whitespace-nowrap tabular-nums",
                  mode === "adjustment" && (removes ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"),
                )}
              >
                {sign}
                {formatQuantity(Math.abs(line.quantity))} {line.unitCode}
                {line.conversionFactor !== 1 && (
                  <span className="block text-xs text-gray-500">
                    {formatQuantity(baseQuantity)} {line.baseUnitCode}
                  </span>
                )}
              </TD>
              {showReceived && (
                <TD className="text-right whitespace-nowrap tabular-nums">
                  {received === null ? "—" : `${formatQuantity(received)} ${line.baseUnitCode}`}
                </TD>
              )}
              {showReceived && (
                <TD className={cn("text-right whitespace-nowrap tabular-nums", lost > 0 && "text-red-600 dark:text-red-400")}>
                  {lost > 0 ? `${formatQuantity(lost)} ${line.baseUnitCode}` : "—"}
                </TD>
              )}
              {showCost && (
                <TD className="text-right whitespace-nowrap tabular-nums">
                  {line.unitCost === null ? (
                    <span className="text-gray-500">Average</span>
                  ) : (
                    <>
                      {formatAmount(line.unitCost)} / {line.baseUnitCode}
                      {line.conversionFactor !== 1 && (
                        <span className="block text-xs text-gray-500">
                          {formatAmount(line.unitCost * line.conversionFactor)} / {line.unitCode}
                        </span>
                      )}
                    </>
                  )}
                </TD>
              )}
              {showCost && <TD className="text-right font-medium tabular-nums">{value === null ? "—" : formatAmount(value)}</TD>}
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
