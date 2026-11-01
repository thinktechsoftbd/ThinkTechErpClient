import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Facts, TotalsList } from "@/core/documents/facts";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { EmptyState, PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManageSales } from "@/modules/sales/access";
import { cancelReceiptAction, setReceiptChequeStatusAction } from "@/modules/sales/actions/receipts";
import { salesApi } from "@/modules/sales/api";
import { customerLedgerHref } from "@/modules/sales/components/customers/customers-table";
import { ChequeStatusBadge } from "@/modules/sales/components/receipts/cheque-status-badge";
import { salesLabel } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Customer Receipt" };

type Props = PageProps<"/sales/receipts/[receiptId]">;

export default function CustomerReceiptPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReceiptDetail params={params} />
    </Suspense>
  );
}

async function ReceiptDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).receiptId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => salesApi.receipts.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const receipt = result.data;
  const canManage = canManageSales(session);
  const money = (value: number) => `${formatAmount(value)} ${receipt.currency}`;
  const isPosted = receipt.status === "Posted";
  const isRefund = receipt.receiptType === "Refund";
  const isCheque = receipt.paymentMethod === "Cheque";
  const pendingCheque = isPosted && isCheque && receipt.chequeStatus === "Pending";

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {receipt.receiptNo} <DocumentStatusBadge status={receipt.status} />
            {isRefund && <Badge tone="brand">Refund</Badge>}
            <ChequeStatusBadge status={receipt.chequeStatus} />
          </span>
        }
        description={`${isRefund ? "Refund to" : "Money receipt from"} ${receipt.customerName} · ${formatDate(receipt.receiptDate)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inventory", href: "/inventory" },
          { label: "Customer Receipts", href: "/sales/receipts" },
          { label: receipt.receiptNo },
        ]}
        actions={
          canManage &&
          isPosted && (
            <div className="flex flex-wrap items-start gap-2">
              {pendingCheque && (
                <>
                  <DocumentActionButton
                    action={setReceiptChequeStatusAction.bind(null, id, "Cleared")}
                    variant="primary"
                    confirmMessage="Mark this cheque as cleared by the bank?"
                  >
                    Mark cleared
                  </DocumentActionButton>
                  <DocumentActionButton
                    action={setReceiptChequeStatusAction.bind(null, id, "Bounced")}
                    variant="danger"
                    confirmMessage={
                      isRefund
                        ? "Mark this cheque as bounced? The refund no longer counts and the customer's advance is restored."
                        : "Mark this cheque as bounced? It is taken off its invoices, which become due again from the customer."
                    }
                  >
                    Mark bounced
                  </DocumentActionButton>
                </>
              )}
              <DocumentActionButton
                action={cancelReceiptAction.bind(null, id)}
                variant={pendingCheque ? "outline" : "danger"}
                confirmMessage={
                  isRefund
                    ? "Cancel this refund? The customer's advance is restored."
                    : "Cancel this receipt? It is taken off its invoices, which become due again from the customer."
                }
              >
                {isRefund ? "Cancel refund" : "Cancel receipt"}
              </DocumentActionButton>
            </div>
          )
        }
      />

      <div className="space-y-6">
        <Card>
          <CardBody>
            <Facts
              items={[
                {
                  label: "Customer",
                  value: (
                    <Link href={customerLedgerHref(receipt.customerId)} className="text-brand-500 hover:underline" title="Open the customer's ledger">
                      {receipt.customerName}
                      <span className="ml-1 text-xs text-gray-500">({receipt.customerCode})</span>
                    </Link>
                  ),
                },
                { label: "Mobile", value: receipt.customerMobile },
                { label: "Type", value: isRefund ? "Refund to customer (advance paid back)" : "Money receipt from customer" },
                { label: isRefund ? "Refund date" : "Receipt date", value: formatDate(receipt.receiptDate) },
                {
                  label: isRefund ? "Paid by" : "Received by",
                  value: `${salesLabel(receipt.paymentMethod)}${receipt.paymentProvider ? ` (${receipt.paymentProvider})` : ""}`,
                },
                { label: isCheque ? "Cheque no" : "Reference no", value: receipt.referenceNo },
                { label: "Cheque date", value: receipt.chequeDate ? formatDate(receipt.chequeDate) : null },
                { label: "Cheque status", value: receipt.chequeStatus ? <ChequeStatusBadge status={receipt.chequeStatus} /> : null },
                { label: "Currency", value: receipt.exchangeRate !== 1 ? `${receipt.currency} at ${receipt.exchangeRate}` : receipt.currency },
                { label: "Posted", value: receipt.postedAt ? formatDateTime(receipt.postedAt) : null },
                { label: "Remarks", value: receipt.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader
              title={isRefund ? "Invoices" : `Settled invoices (${receipt.allocations.length})`}
              description={isRefund ? undefined : "The invoices whose dues this receipt collected."}
            />
            {isRefund ? (
              <EmptyState title="A refund isn't allocated to invoices" description="It reduces the advance the customer had left with you." />
            ) : receipt.allocations.length === 0 ? (
              <EmptyState
                title="Not allocated to any invoice"
                description={isPosted ? "The whole receipt stays as an advance from the customer." : undefined}
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Invoice</TH>
                    <TH>Date</TH>
                    <TH className="text-right">Invoice total</TH>
                    <TH className="text-right">Settled</TH>
                  </tr>
                </THead>
                <TBody>
                  {receipt.allocations.map((allocation) => (
                    <TR key={allocation.salesInvoiceId}>
                      <TD>
                        <Link href={`/sales/invoices/${allocation.salesInvoiceId}`} className="font-medium text-brand-500 hover:underline">
                          {allocation.invoiceNo}
                        </Link>
                      </TD>
                      <TD className="whitespace-nowrap">{formatDate(allocation.invoiceDate)}</TD>
                      <TD className="text-right tabular-nums">{formatAmount(allocation.invoiceTotal)}</TD>
                      <TD className="text-right tabular-nums">{formatAmount(allocation.amount)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          <Card className="self-start">
            <CardHeader title="Amounts" />
            <CardBody>
              <TotalsList
                rows={
                  isRefund
                    ? [{ label: "Refund paid", value: money(receipt.amount), strong: true }]
                    : [
                        { label: "Received", value: money(receipt.amount) },
                        { label: "Tax deducted at source", value: money(receipt.taxDeductedAmount), hidden: receipt.taxDeductedAmount === 0 },
                        { label: "Settles", value: money(receipt.amount + receipt.taxDeductedAmount), strong: true },
                        { label: "Allocated to invoices", value: money(receipt.allocatedAmount) },
                        { label: "Unallocated (advance)", value: money(receipt.unallocatedAmount), strong: true },
                      ]
                }
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
