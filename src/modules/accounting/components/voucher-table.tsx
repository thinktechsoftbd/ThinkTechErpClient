import Link from "next/link";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Badge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { accountingLabel, type Voucher } from "../types";

/** Vouchers in a list: bill payments and collections show the party and how the money moved. */
export function VoucherTable({ vouchers, showType = true }: { vouchers: Voucher[]; showType?: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Voucher</TH>
          <TH>Date</TH>
          {showType && <TH>Type</TH>}
          <TH>Particulars</TH>
          <TH className="text-right">Amount</TH>
          <TH>Status</TH>
        </tr>
      </THead>
      <TBody>
        {vouchers.map((voucher) => {
          const party = voucher.supplierName ?? voucher.customerName;
          return (
            <TR key={voucher.id}>
              <TD>
                <Link href={`/accounting/vouchers/${voucher.id}`} className="font-medium whitespace-nowrap text-brand-500 hover:underline">
                  {voucher.voucherNo}
                </Link>
              </TD>
              <TD className="whitespace-nowrap">{formatDate(voucher.voucherDate)}</TD>
              {showType && (
                <TD>
                  <Badge tone={voucher.voucherType.startsWith("Bill") ? "brand" : "gray"}>{accountingLabel(voucher.voucherType)}</Badge>
                </TD>
              )}
              <TD className="max-w-md">
                {party && <span className="block font-medium text-gray-800 dark:text-white/90">{party}</span>}
                <span className="block truncate text-gray-600 dark:text-gray-400">{voucher.narration ?? "—"}</span>
                {(voucher.paymentMethod || voucher.referenceNo) && (
                  <span className="block text-xs text-gray-500">
                    {[voucher.paymentMethod && accountingLabel(voucher.paymentMethod), voucher.referenceNo].filter(Boolean).join(" · ")}
                  </span>
                )}
              </TD>
              <TD className="text-right whitespace-nowrap tabular-nums">{formatAmount(voucher.totalAmount)}</TD>
              <TD>
                <DocumentStatusBadge status={voucher.status} />
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
