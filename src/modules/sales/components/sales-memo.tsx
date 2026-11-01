import { formatDate } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { customerLabel, salesLabel, type SalesInvoice } from "../types";

/**
 * The printed memo of a sale (cash memo / invoice). Hidden on screen; the page prints only this.
 * Sized to read well on A5/A4 and on 80 mm receipt printers alike.
 */
export function SalesMemo({ invoice, shopName }: { invoice: SalesInvoice; shopName: string }) {
  const rows: { label: string; value: number; strong?: boolean; show: boolean }[] = [
    { label: "Subtotal", value: invoice.subtotalAmount, show: true },
    { label: "Discount", value: -(invoice.discountAmount - invoice.extraDiscountAmount), show: invoice.discountAmount - invoice.extraDiscountAmount > 0 },
    { label: "Tax", value: invoice.taxAmount, show: invoice.taxAmount > 0 },
    { label: "Delivery / labour", value: invoice.chargeAmount, show: invoice.chargeAmount > 0 },
    { label: "Less", value: -invoice.extraDiscountAmount, show: invoice.extraDiscountAmount > 0 },
    { label: "Round off", value: invoice.roundOffAmount, show: invoice.roundOffAmount !== 0 },
    { label: "Total", value: invoice.totalAmount, strong: true, show: true },
    { label: `Paid${invoice.paymentMethod ? ` (${salesLabel(invoice.paymentMethod)})` : ""}`, value: invoice.paidAmount, show: true },
    { label: "Due", value: invoice.totalAmount - invoice.paidAmount, strong: true, show: invoice.totalAmount - invoice.paidAmount > 0 },
  ];

  return (
    <div className="hidden text-[12px] leading-snug text-black print:block">
      <div className="text-center">
        <p className="text-base font-bold">{shopName}</p>
        <p className="mt-0.5 font-medium">{invoice.saleType === "Cash" ? "Cash Memo" : "Credit Invoice"}</p>
      </div>

      <div className="mt-3 flex justify-between gap-4">
        <div>
          <p>
            <span className="font-semibold">No:</span> {invoice.invoiceNo}
          </p>
          <p>
            <span className="font-semibold">Date:</span> {formatDate(invoice.invoiceDate)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{customerLabel(invoice)}</p>
          {invoice.customerMobile && <p>{invoice.customerMobile}</p>}
          {invoice.customerAddress && <p>{invoice.customerAddress}</p>}
        </div>
      </div>

      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="border-y border-black text-left">
            <th className="py-1 pr-1">#</th>
            <th className="py-1 pr-1">Item</th>
            <th className="py-1 pr-1 text-right">Qty</th>
            <th className="py-1 pr-1 text-right">Rate</th>
            <th className="py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id} className="align-top">
              <td className="py-0.5 pr-1">{line.lineNo}</td>
              <td className="py-0.5 pr-1">
                {line.productName}
                {line.batchNo && <span className="block text-[10px]">Batch {line.batchNo}{line.expiryDate ? ` · exp ${formatDate(line.expiryDate)}` : ""}</span>}
                {line.serialNos.length > 0 && <span className="block text-[10px]">SN {line.serialNos.join(", ")}</span>}
                {line.discountAmount > 0 && <span className="block text-[10px]">less {formatAmount(line.discountAmount)}</span>}
              </td>
              <td className="py-0.5 pr-1 text-right whitespace-nowrap">
                {formatQuantity(line.quantity)} {line.unitCode}
              </td>
              <td className="py-0.5 pr-1 text-right">{formatAmount(line.unitPrice)}</td>
              <td className="py-0.5 text-right">{formatAmount(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-2 ml-auto w-full max-w-64 border-t border-black pt-1">
        {rows
          .filter((row) => row.show)
          .map((row) => (
            <div key={row.label} className={row.strong ? "flex justify-between font-bold" : "flex justify-between"}>
              <dt>{row.label}</dt>
              <dd>{formatAmount(row.value)}</dd>
            </div>
          ))}
      </dl>

      {invoice.saleType === "Credit" && invoice.dueDate && (
        <p className="mt-2">
          <span className="font-semibold">Payment due by:</span> {formatDate(invoice.dueDate)}
        </p>
      )}
      {invoice.remarks && <p className="mt-2">{invoice.remarks}</p>}
      <p className="mt-4 text-center">Thank you for your purchase.</p>
    </div>
  );
}
