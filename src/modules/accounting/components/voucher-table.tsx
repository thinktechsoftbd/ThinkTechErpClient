import Link from "next/link";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Badge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import type { Voucher } from "../types";
import { VoucherBulkBar, VoucherCheckbox, VoucherRowActions, VoucherSelectAll, VoucherSelection, type VoucherRow } from "./voucher-list-actions";

/**
 * Vouchers in a list, with the parties on their lines and how the money moved. With `manage`, users who
 * may post (ACCOUNTING.P) get checkboxes to post or unpost several at once, and each row gets its icons.
 */
export function VoucherTable({
  vouchers,
  showType = true,
  manage,
}: {
  vouchers: Voucher[];
  showType?: boolean;
  manage?: { canManage: boolean; canPost: boolean };
}) {
  const selectable = !!manage?.canPost;
  const withActions = !!manage && (manage.canManage || manage.canPost);
  const rows: VoucherRow[] = vouchers.map(({ id, voucherRefNo, status }) => ({ id, voucherRefNo, status }));

  const table = (
    <Table>
      <THead>
        <tr>
          {selectable && (
            <TH className="w-10 pr-0">
              <VoucherSelectAll />
            </TH>
          )}
          <TH>Voucher Ref. Number</TH>
          <TH>Voucher Date</TH>
          {showType && <TH>Type</TH>}
          <TH>Particulars</TH>
          <TH className="text-right">Amount</TH>
          <TH>Status</TH>
          {withActions && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {vouchers.map((voucher, index) => (
          <TR key={voucher.id}>
            {selectable && (
              <TD className="w-10 pr-0">
                <VoucherCheckbox row={rows[index]} />
              </TD>
            )}
            <TD>
              <Link
                href={`/accounting/vouchers/${voucher.id}`}
                className="font-medium whitespace-nowrap text-brand-500 tabular-nums hover:underline"
              >
                {voucher.voucherRefNo}
              </Link>
            </TD>
            <TD className="whitespace-nowrap">{formatDate(voucher.voucherDate)}</TD>
            {showType && (
              <TD>
                <Badge tone="gray">{voucher.voucherType}</Badge>
              </TD>
            )}
            <TD className="max-w-md">
              {voucher.partyNames && <span className="block font-medium text-gray-800 dark:text-white/90">{voucher.partyNames}</span>}
              <span className="block truncate text-gray-600 dark:text-gray-400">{voucher.narration ?? "—"}</span>
              {(voucher.paymentMethod || voucher.chequeNo) && (
                <span className="block text-xs text-gray-500">{voucher.chequeNo ? `Cheque no ${voucher.chequeNo}` : voucher.paymentMethod}</span>
              )}
            </TD>
            <TD className="text-right whitespace-nowrap tabular-nums">{formatAmount(voucher.totalAmount)}</TD>
            <TD>
              <DocumentStatusBadge status={voucher.status} />
            </TD>
            {withActions && manage && (
              <TD className="py-2 text-right">
                <VoucherRowActions row={rows[index]} canManage={manage.canManage} canPost={manage.canPost} />
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );

  if (!selectable) return table;
  return (
    <VoucherSelection rows={rows}>
      <VoucherBulkBar />
      {table}
    </VoucherSelection>
  );
}
