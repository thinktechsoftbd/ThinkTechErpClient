import { Maximize2, Pencil } from "lucide-react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Facts } from "@/core/documents/facts";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { QueryModal } from "@/core/ui/query-modal";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { NUM, ReportTable, TotalsFoot } from "@/modules/inventory/components/reports/report-parts";
import { canManageAccounting, canPostVouchers } from "../access";
import { cancelVoucherAction, deleteVoucherAction, postVoucherAction, unpostVoucherAction } from "../actions/vouchers";
import { accountingApi } from "../api";
import { LOCAL_CURRENCY, payTypeLabel, type Voucher } from "../types";
import { sideAmount } from "./balance";

/** Ref. number, status and type: the voucher page's title and the popup's. */
export function VoucherTitle({ voucher }: { voucher: Voucher }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      {voucher.voucherRefNo} <DocumentStatusBadge status={voucher.status} />
      <Badge tone="gray">{voucher.voucherType}</Badge>
    </span>
  );
}

export function voucherSubtitle(voucher: Voucher) {
  return `${voucher.partyNames ? `${voucher.partyNames} · ` : ""}${formatDate(voucher.voucherDate)}`;
}

/** Edit, Delete, Post, Unpost and Cancel, as the user's permissions and the voucher's status allow. */
export function VoucherActions({
  voucher,
  canManage,
  canPost,
  editHref,
}: {
  voucher: Voucher;
  canManage: boolean;
  canPost: boolean;
  editHref: string;
}) {
  const isDraft = voucher.status === "Draft";
  return (
    <>
      {canManage && isDraft && (
        <>
          <LinkButton href={editHref} variant="outline" size="sm">
            <Pencil className="size-4" aria-hidden /> Edit
          </LinkButton>
          <DocumentActionButton action={deleteVoucherAction.bind(null, voucher.id)} variant="ghost" confirmMessage="Delete this draft voucher?">
            Delete
          </DocumentActionButton>
        </>
      )}
      {canPost && isDraft && (
        <DocumentActionButton
          action={postVoucherAction.bind(null, voucher.id)}
          variant="primary"
          confirmMessage="Post this voucher to the ledgers? To change it afterwards, unpost it first."
        >
          Post
        </DocumentActionButton>
      )}
      {canPost && voucher.status === "Posted" && (
        <DocumentActionButton
          action={unpostVoucherAction.bind(null, voucher.id)}
          confirmMessage="Unpost this voucher? Its entries leave the ledgers and it becomes a draft again."
        >
          Unpost
        </DocumentActionButton>
      )}
      {canManage && voucher.status === "Posted" && (
        <DocumentActionButton
          action={cancelVoucherAction.bind(null, voucher.id)}
          variant="danger"
          confirmMessage="Cancel this voucher? Its entries are taken out of the ledgers."
        >
          Cancel voucher
        </DocumentActionButton>
      )}
    </>
  );
}

/** The voucher's details and its debit and credit entries. */
export function VoucherDetails({ voucher }: { voucher: Voucher }) {
  const totalDebit = voucher.lines.reduce((sum, line) => sum + line.debitAmount, 0);
  const totalCredit = voucher.lines.reduce((sum, line) => sum + line.creditAmount, 0);
  const hasParties = voucher.lines.some((line) => line.partyName);
  // Amounts are always in BDT; the currency column only shows when a line names another currency or rate.
  const hasCurrency = voucher.lines.some((line) => (line.currency ?? LOCAL_CURRENCY) !== LOCAL_CURRENCY || line.localExchangeRate !== 1);
  const leading = 3 + (hasParties ? 1 : 0) + (hasCurrency ? 1 : 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <Facts
            items={[
              { label: "Voucher Ref. Number", value: voucher.voucherRefNo },
              { label: "Voucher type", value: voucher.voucherType },
              { label: "Voucher Date", value: formatDate(voucher.voucherDate) },
              { label: "Payment method", value: voucher.paymentMethod },
              { label: "Cheque no", value: voucher.chequeNo },
              { label: "Cheque date", value: voucher.chequeDate ? formatDate(voucher.chequeDate) : null },
              { label: "Pay type", value: payTypeLabel(voucher.payType) },
              { label: "Amount", value: formatAmount(voucher.totalAmount) },
              { label: "Posted", value: voucher.postedAt ? formatDateTime(voucher.postedAt) : null },
              { label: "Cancelled", value: voucher.cancelledAt ? formatDateTime(voucher.cancelledAt) : null },
              { label: "Narration", value: voucher.narration },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Entries (${voucher.lines.length})`} />
        <ReportTable>
          <THead>
            <tr>
              <TH>Code</TH>
              <TH>Ledger head</TH>
              {hasParties && <TH>Supplier / customer</TH>}
              {hasCurrency && <TH>Currency · rate</TH>}
              <TH>Narration</TH>
              <TH className="text-right">Debit</TH>
              <TH className="text-right">Credit</TH>
            </tr>
          </THead>
          <TBody>
            {voucher.lines.map((line) => (
              <TR key={line.id}>
                <TD className="font-mono text-xs whitespace-nowrap text-gray-500">{line.accountCode}</TD>
                <TD className="font-medium text-gray-800 dark:text-white/90">{line.accountName}</TD>
                {hasParties && <TD>{line.partyName ?? "—"}</TD>}
                {hasCurrency && (
                  <TD className="whitespace-nowrap tabular-nums">
                    {line.currency ?? LOCAL_CURRENCY} · {line.localExchangeRate}
                  </TD>
                )}
                <TD className="text-gray-600 dark:text-gray-400">{line.lineNarration ?? ""}</TD>
                <TD className={NUM}>{sideAmount(line.debitAmount)}</TD>
                <TD className={NUM}>{sideAmount(line.creditAmount)}</TD>
              </TR>
            ))}
          </TBody>
          <TotalsFoot>
            <TD colSpan={leading} className="text-right">
              Total
            </TD>
            <TD className={NUM}>{formatAmount(totalDebit)}</TD>
            <TD className={NUM}>{formatAmount(totalCredit)}</TD>
          </TotalsFoot>
        </ReportTable>
      </Card>
    </div>
  );
}

/**
 * A voucher in a popup over the vouchers list (`?view=<id>`); closing it goes to `closeHref`, the list
 * as it was. Edit opens the edit popup on top; saving there, or deleting here, returns to the list.
 */
export async function VoucherViewModal({ id, closeHref }: { id: number; closeHref: string }) {
  const [session, result] = await Promise.all([requireSession(), tryApi(() => accountingApi.vouchers.get(id))]);
  // Gone (e.g. deleted meanwhile): just the list.
  if (!result.ok && result.error.status === 404) return null;
  if (!result.ok) {
    return (
      <QueryModal closeHref={closeHref} title="Voucher">
        <ApiErrorState error={result.error} />
      </QueryModal>
    );
  }

  const voucher = result.data;
  return (
    <QueryModal closeHref={closeHref} title={<VoucherTitle voucher={voucher} />} description={voucherSubtitle(voucher)}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-end gap-2">
          <LinkButton href={`/accounting/vouchers/${id}`} variant="outline" size="sm" title="Open the voucher's page, e.g. to print it">
            <Maximize2 className="size-4" aria-hidden /> Full page
          </LinkButton>
          <VoucherActions
            voucher={voucher}
            canManage={canManageAccounting(session)}
            canPost={canPostVouchers(session)}
            editHref={`/accounting/vouchers/${id}/edit?from=list`}
          />
        </div>
        <VoucherDetails voucher={voucher} />
      </div>
    </QueryModal>
  );
}
