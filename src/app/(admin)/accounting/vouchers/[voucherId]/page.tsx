import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Facts } from "@/core/documents/facts";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManageAccounting, canPostVouchers } from "@/modules/accounting/access";
import { cancelVoucherAction, deleteVoucherAction, postVoucherAction, unpostVoucherAction } from "@/modules/accounting/actions/vouchers";
import { accountingApi } from "@/modules/accounting/api";
import { sideAmount } from "@/modules/accounting/components/balance";
import { LOCAL_CURRENCY, payTypeLabel } from "@/modules/accounting/types";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { NUM, ReportTable, TotalsFoot } from "@/modules/inventory/components/reports/report-parts";

export const metadata: Metadata = { title: "Voucher" };

type Props = PageProps<"/accounting/vouchers/[voucherId]">;

export default function VoucherPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <VoucherDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function VoucherDetail({ params, searchParams }: Props) {
  const id = parseIdParam((await params).voucherId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  const [session, result] = await Promise.all([requireSession(), tryApi(() => accountingApi.vouchers.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const voucher = result.data;
  const canManage = canManageAccounting(session);
  const canPost = canPostVouchers(session);
  const isDraft = voucher.status === "Draft";
  const totalDebit = voucher.lines.reduce((sum, line) => sum + line.debitAmount, 0);
  const totalCredit = voucher.lines.reduce((sum, line) => sum + line.creditAmount, 0);
  const hasParties = voucher.lines.some((line) => line.partyName);
  // Amounts are always in BDT; the currency column only shows when a line names another currency or rate.
  const hasCurrency = voucher.lines.some((line) => (line.currency ?? LOCAL_CURRENCY) !== LOCAL_CURRENCY || line.localExchangeRate !== 1);
  const leading = 3 + (hasParties ? 1 : 0) + (hasCurrency ? 1 : 0);

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {voucher.voucherRefNo} <DocumentStatusBadge status={voucher.status} />
            <Badge tone="gray">{voucher.voucherType}</Badge>
          </span>
        }
        description={`${voucher.partyNames ? `${voucher.partyNames} · ` : ""}${formatDate(voucher.voucherDate)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Accounting", href: "/accounting" },
          { label: "Vouchers", href: "/accounting/vouchers" },
          { label: voucher.voucherRefNo },
        ]}
        actions={
          <div className="flex flex-wrap items-start gap-2 print:hidden">
            <LinkButton href="/accounting/vouchers" variant="outline" size="sm">
              <ArrowLeft className="size-4" aria-hidden /> Back to list
            </LinkButton>
            <PrintButton />
            {canManage && isDraft && (
              <>
                <LinkButton href={`/accounting/vouchers/${id}/edit`} variant="outline" size="sm">
                  <Pencil className="size-4" aria-hidden /> Edit
                </LinkButton>
                <DocumentActionButton action={deleteVoucherAction.bind(null, id)} variant="ghost" confirmMessage="Delete this draft voucher?">
                  Delete
                </DocumentActionButton>
              </>
            )}
            {canPost && isDraft && (
              <DocumentActionButton
                action={postVoucherAction.bind(null, id)}
                variant="primary"
                confirmMessage="Post this voucher to the ledgers? To change it afterwards, unpost it first."
              >
                Post
              </DocumentActionButton>
            )}
            {canPost && voucher.status === "Posted" && (
              <DocumentActionButton
                action={unpostVoucherAction.bind(null, id)}
                confirmMessage="Unpost this voucher? Its entries leave the ledgers and it becomes a draft again."
              >
                Unpost
              </DocumentActionButton>
            )}
            {canManage && voucher.status === "Posted" && (
              <DocumentActionButton
                action={cancelVoucherAction.bind(null, id)}
                variant="danger"
                confirmMessage="Cancel this voucher? Its entries are taken out of the ledgers."
              >
                Cancel voucher
              </DocumentActionButton>
            )}
          </div>
        }
      />

      {notice && (
        <Alert tone="error" className="mb-6">
          {notice}
        </Alert>
      )}

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
    </>
  );
}
