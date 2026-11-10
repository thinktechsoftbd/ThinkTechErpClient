import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { showDate } from "@/core/utils/date";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import type { PurchaseLine } from "../types";

/** Lines of a saved purchase document. `mode` picks the progress columns that matter. */
export function PurchaseLinesTable({
  lines,
  mode,
  showTax = true,
  showLandedCost = false,
}: {
  lines: PurchaseLine[];
  mode: "invoice" | "order" | "receipt" | "return";
  showTax?: boolean;
  showLandedCost?: boolean;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>#</TH>
          <TH>Product</TH>
          <TH className="text-right">Quantity</TH>
          <TH className="text-right">Price</TH>
          <TH className="text-right">Discount</TH>
          {showTax && <TH className="text-right">Tax</TH>}
          <TH className="text-right">Total</TH>
          {mode === "order" && <TH className="text-right">Received</TH>}
          {(mode === "order" || mode === "receipt") && <TH className="text-right">Billed</TH>}
          {(mode === "invoice" || mode === "receipt") && <TH className="text-right">Returned</TH>}
          {showLandedCost && <TH className="text-right">Landed cost</TH>}
        </tr>
      </THead>
      <TBody>
        {lines.map((line) => (
          <TR key={line.id}>
            <TD className="text-gray-400">{line.lineNo}</TD>
            <TD>
              <span className="font-medium text-gray-800 dark:text-white/90">{line.productName}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {line.productCode}
                {line.batchNo && ` · batch ${line.batchNo}`}
                {line.expiryDate && ` · exp ${showDate(line.expiryDate)}`}
                {line.serialNos.length > 0 && ` · S/N ${line.serialNos.join(", ")}`}
                {line.description && ` · ${line.description}`}
              </span>
            </TD>
            <TD className="text-right whitespace-nowrap tabular-nums">
              {formatQuantity(line.quantity)} {line.unitCode}
              {line.conversionFactor !== 1 && (
                <span className="block text-xs text-gray-500">
                  {formatQuantity(line.baseQuantity)} {line.baseUnitCode}
                </span>
              )}
            </TD>
            <TD className="text-right tabular-nums">{formatAmount(line.unitPrice)}</TD>
            <TD className="text-right tabular-nums">{line.discountAmount ? formatAmount(line.discountAmount) : "—"}</TD>
            {showTax && (
              <TD className="text-right tabular-nums">
                {line.taxAmount ? formatAmount(line.taxAmount) : "—"}
                {line.taxGroupName && <span className="block text-xs text-gray-500">{line.taxGroupName}</span>}
              </TD>
            )}
            <TD className="text-right font-medium tabular-nums">{formatAmount(line.lineTotal)}</TD>
            {mode === "order" && <TD className="text-right tabular-nums">{formatQuantity(line.receivedQuantity)}</TD>}
            {(mode === "order" || mode === "receipt") && <TD className="text-right tabular-nums">{formatQuantity(line.invoicedQuantity)}</TD>}
            {(mode === "invoice" || mode === "receipt") && <TD className="text-right tabular-nums">{formatQuantity(line.returnedQuantity)}</TD>}
            {showLandedCost && (
              <TD className="text-right whitespace-nowrap tabular-nums">
                {line.productType === "Stock" ? `${formatAmount(line.landedUnitCost)} / ${line.baseUnitCode}` : "—"}
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
