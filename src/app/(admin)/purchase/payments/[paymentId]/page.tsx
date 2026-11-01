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
import { canManagePurchase } from "@/modules/purchase/access";
import { cancelPaymentAction, setChequeStatusAction } from "@/modules/purchase/actions/payments";
import { purchaseApi } from "@/modules/purchase/api";
import { purchaseLabel } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Supplier Payment" };

type Props = PageProps<"/purchase/payments/[paymentId]">;

export default function SupplierPaymentPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PaymentDetail params={params} />
    </Suspense>
  );
}

async function PaymentDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).paymentId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => purchaseApi.payments.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const payment = result.data;
  const canManage = canManagePurchase(session);
  const money = (value: number) => `${formatAmount(value)} ${payment.currency}`;
  const isPosted = payment.status === "Posted";
  const isRefund = payment.paymentType === "Refund";
  const isCheque = payment.paymentMethod === "Cheque";
  const pendingCheque = isPosted && isCheque && payment.chequeStatus === "Pending";

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {payment.paymentNo} <DocumentStatusBadge status={payment.status} />
            {isRefund && <Badge tone="brand">Refund</Badge>}
            {payment.chequeStatus && <DocumentStatusBadge status={payment.chequeStatus} />}
          </span>
        }
        description={`${isRefund ? "Refund from" : "Payment to"} ${payment.supplierName} · ${formatDate(payment.paymentDate)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Supplier Payments", href: "/purchase/payments" },
          { label: payment.paymentNo },
        ]}
        actions={
          canManage &&
          isPosted && (
            <div className="flex flex-wrap items-start gap-2">
              {pendingCheque && (
                <>
                  <DocumentActionButton
                    action={setChequeStatusAction.bind(null, id, "Cleared")}
                    variant="primary"
                    confirmMessage="Mark this cheque as cleared by the bank?"
                  >
                    Mark cleared
                  </DocumentActionButton>
                  <DocumentActionButton
                    action={setChequeStatusAction.bind(null, id, "Bounced")}
                    variant="danger"
                    confirmMessage={
                      isRefund
                        ? "Mark this cheque as bounced? The refund no longer counts."
                        : "Mark this cheque as bounced? It is taken off its invoices, which become due again."
                    }
                  >
                    Mark bounced
                  </DocumentActionButton>
                </>
              )}
              <DocumentActionButton
                action={cancelPaymentAction.bind(null, id)}
                variant={pendingCheque ? "outline" : "danger"}
                confirmMessage={
                  isRefund
                    ? "Cancel this refund? The supplier's advance is restored."
                    : "Cancel this payment? It is taken off its invoices, which become due again."
                }
              >
                Cancel payment
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
                { label: "Supplier", value: payment.supplierName },
                { label: "Type", value: isRefund ? "Refund from supplier (advance paid back)" : "Payment to supplier" },
                { label: "Payment date", value: formatDate(payment.paymentDate) },
                {
                  label: isRefund ? "Received by" : "Paid by",
                  value: `${purchaseLabel(payment.paymentMethod)}${payment.paymentProvider ? ` (${payment.paymentProvider})` : ""}`,
                },
                { label: isCheque ? "Cheque no" : "Reference no", value: payment.referenceNo },
                { label: "Cheque date", value: payment.chequeDate ? formatDate(payment.chequeDate) : null },
                { label: "Cheque status", value: payment.chequeStatus ? <DocumentStatusBadge status={payment.chequeStatus} /> : null },
                { label: "Currency", value: payment.exchangeRate !== 1 ? `${payment.currency} at ${payment.exchangeRate}` : payment.currency },
                { label: "Posted", value: payment.postedAt ? formatDateTime(payment.postedAt) : null },
                { label: "Remarks", value: payment.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader
              title={isRefund ? "Invoices" : `Settled invoices (${payment.allocations.length})`}
              description={isRefund ? undefined : "The invoices this payment settled."}
            />
            {isRefund ? (
              <EmptyState title="A refund isn't allocated to invoices" description="It reduces the advance the supplier was holding." />
            ) : payment.allocations.length === 0 ? (
              <EmptyState
                title="Not allocated to any invoice"
                description={isPosted ? "The whole payment stays as an advance with the supplier." : undefined}
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
                  {payment.allocations.map((allocation) => (
                    <TR key={allocation.purchaseInvoiceId}>
                      <TD>
                        <Link href={`/purchase/invoices/${allocation.purchaseInvoiceId}`} className="font-medium text-brand-500 hover:underline">
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
                    ? [{ label: "Refund received", value: money(payment.amount), strong: true }]
                    : [
                        { label: "Paid", value: money(payment.amount) },
                        { label: "Tax deducted at source", value: money(payment.taxDeductedAmount), hidden: payment.taxDeductedAmount === 0 },
                        { label: "Settles", value: money(payment.amount + payment.taxDeductedAmount), strong: true },
                        { label: "Allocated to invoices", value: money(payment.allocatedAmount) },
                        { label: "Unallocated (advance)", value: money(payment.unallocatedAmount), strong: true },
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
