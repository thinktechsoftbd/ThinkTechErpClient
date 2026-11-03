import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Facts, TotalsList } from "@/core/documents/facts";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManagePurchase } from "@/modules/purchase/access";
import { cancelInvoiceAction, deleteInvoiceAction, postInvoiceAction } from "@/modules/purchase/actions/invoices";
import { purchaseApi } from "@/modules/purchase/api";
import { PurchaseLinesTable } from "@/modules/purchase/components/purchase-lines-table";
import { purchaseLabel } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Purchase Invoice" };

type Props = PageProps<"/purchase/invoices/[invoiceId]">;

export default function PurchaseInvoicePage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InvoiceDetail params={params} />
    </Suspense>
  );
}

async function InvoiceDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).invoiceId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => purchaseApi.invoices.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const invoice = result.data;
  const canManage = canManagePurchase(session);
  const money = (value: number) => `${formatAmount(value)} ${invoice.currency}`;
  const isDraft = invoice.status === "Draft";
  const isPosted = invoice.status === "Posted";

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {invoice.invoiceNo} <DocumentStatusBadge status={invoice.status} />
            {isPosted && <DocumentStatusBadge status={invoice.paymentStatus} />}
          </span>
        }
        description={`${invoice.purchaseType} purchase from ${invoice.supplierName ?? "a walk-in supplier"} · ${formatDate(invoice.invoiceDate)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Invoices", href: "/purchase/invoices" },
          { label: invoice.invoiceNo },
        ]}
        actions={
          canManage && (
            <div className="flex flex-wrap items-start gap-2">
              {isDraft && (
                <>
                  <LinkButton href={`/purchase/invoices/${id}/edit`} variant="outline" size="sm">
                    <Pencil className="size-4" aria-hidden /> Edit
                  </LinkButton>
                  <DocumentActionButton
                    action={postInvoiceAction.bind(null, id)}
                    variant="primary"
                    confirmMessage={
                      invoice.receivesStock
                        ? "Post this invoice? The stock comes in and the dues are recorded. Posted invoices can't be edited."
                        : "Post this bill? The dues are recorded against the goods receipt."
                    }
                  >
                    Post
                  </DocumentActionButton>
                  <DocumentActionButton action={deleteInvoiceAction.bind(null, id)} variant="danger" confirmMessage="Delete this draft invoice?">
                    Delete
                  </DocumentActionButton>
                </>
              )}
              {isPosted && invoice.supplierId && invoice.dueAmount > 0 && (
                <LinkButton href={`/purchase/payments/new?supplierId=${invoice.supplierId}&invoiceId=${id}`} size="sm">
                  Pay supplier
                </LinkButton>
              )}
              {isPosted && invoice.receivesStock && (
                <LinkButton href={`/purchase/returns/new?invoiceId=${id}`} variant="outline" size="sm">
                  Return goods
                </LinkButton>
              )}
              {isPosted && (
                <DocumentActionButton
                  action={cancelInvoiceAction.bind(null, id)}
                  variant="danger"
                  confirmMessage="Cancel this posted invoice? Its stock and dues are reversed. Payments or returns against it must be cancelled first."
                >
                  Cancel invoice
                </DocumentActionButton>
              )}
            </div>
          )
        }
      />

      <div className="space-y-6">
        <Card>
          <CardBody>
            <Facts
              items={[
                { label: "Supplier", value: invoice.supplierName ?? "Walk-in supplier" },
                { label: "Mobile", value: invoice.supplierMobile },
                { label: "Purchase type", value: invoice.purchaseType === "Cash" ? "Cash (paid now)" : "Credit" },
                { label: "Invoice date", value: formatDate(invoice.invoiceDate) },
                { label: "Due date", value: invoice.dueDate ? formatDate(invoice.dueDate) : null },
                { label: "Warehouse", value: invoice.receivesStock ? invoice.warehouseName : "Billed goods receipt (no stock moved)" },
                { label: "Supplier's invoice", value: [invoice.supplierInvoiceNo, invoice.supplierInvoiceDate && formatDate(invoice.supplierInvoiceDate)].filter(Boolean).join(" · ") },
                { label: "VAT invoice (Mushak-6.3)", value: invoice.taxInvoiceNo },
                {
                  label: "Purchase order",
                  value: invoice.purchaseOrderId ? (
                    <Link href={`/purchase/orders/${invoice.purchaseOrderId}`} className="text-brand-500 hover:underline">
                      {invoice.purchaseOrderNo}
                    </Link>
                  ) : null,
                },
                { label: "Currency", value: invoice.exchangeRate !== 1 ? `${invoice.currency} at ${invoice.exchangeRate}` : invoice.currency },
                { label: "Paid on the spot", value: invoice.paidAmount > 0 ? `${money(invoice.paidAmount)} · ${purchaseLabel(invoice.paymentMethod)}${invoice.paymentProvider ? ` (${invoice.paymentProvider})` : ""}${invoice.paymentReferenceNo ? ` · ${invoice.paymentReferenceNo}` : ""}` : null },
                { label: "Payment source", value: invoice.paymentSourceName ? `${invoice.paymentSourceName}${invoice.paymentSourceType ? ` · ${invoice.paymentSourceType}` : ""}` : null },
                { label: "Posted", value: invoice.postedAt ? formatDateTime(invoice.postedAt) : null },
                { label: "Remarks", value: invoice.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Items (${invoice.lines.length})`} />
          <PurchaseLinesTable lines={invoice.lines} mode="invoice" showLandedCost={invoice.receivesStock} />
          <CardBody>
            <TotalsList
              rows={[
                { label: "Items", value: money(invoice.subtotalAmount) },
                { label: "Discount", value: `-${money(invoice.discountAmount)}`, hidden: invoice.discountAmount === 0 },
                { label: "Tax", value: money(invoice.taxAmount), hidden: invoice.taxAmount === 0 },
                { label: "Charges on bill", value: money(invoice.chargeAmount), hidden: invoice.chargeAmount === 0 },
                { label: "Round off", value: money(invoice.roundOffAmount), hidden: invoice.roundOffAmount === 0 },
                { label: "Total", value: money(invoice.totalAmount), strong: true },
                { label: "Settled", value: money(invoice.settledAmount) },
                { label: "Due", value: money(invoice.dueAmount), strong: true },
              ]}
            />
          </CardBody>
        </Card>

        {invoice.charges.length > 0 && (
          <Card>
            <CardHeader title="Landed charges" description="Spread over the stock lines' cost." />
            <Table>
              <THead>
                <tr>
                  <TH>Charge</TH>
                  <TH>Spread by</TH>
                  <TH>Billed by</TH>
                  <TH className="text-right">Amount</TH>
                </tr>
              </THead>
              <TBody>
                {invoice.charges.map((charge) => (
                  <TR key={charge.id}>
                    <TD>{charge.chargeName}</TD>
                    <TD>{charge.allocationMethod === "Quantity" ? "Quantity" : "Line value"}</TD>
                    <TD>{charge.onSupplierBill ? "On the supplier's bill" : (charge.payeeName ?? "Paid separately")}</TD>
                    <TD className="text-right tabular-nums">{money(charge.amount)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        )}

        {invoice.allocations.length > 0 && (
          <Card>
            <CardHeader title="Settled by" />
            <Table>
              <THead>
                <tr>
                  <TH>Date</TH>
                  <TH>Document</TH>
                  <TH className="text-right">Amount</TH>
                </tr>
              </THead>
              <TBody>
                {invoice.allocations.map((allocation) => (
                  <TR key={allocation.id}>
                    <TD>{formatDate(allocation.allocationDate)}</TD>
                    <TD>
                      <Link
                        href={allocation.sourceType === "Payment" ? `/purchase/payments/${allocation.sourceId}` : `/purchase/returns/${allocation.sourceId}`}
                        className="text-brand-500 hover:underline"
                      >
                        {allocation.sourceType} {allocation.sourceNo}
                      </Link>
                    </TD>
                    <TD className="text-right tabular-nums">{money(allocation.amount)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
