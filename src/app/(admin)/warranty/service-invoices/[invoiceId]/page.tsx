import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Facts, TotalsList } from "@/core/documents/facts";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { customerLabel, salesLabel } from "@/modules/sales/types";
import { canManageServiceInvoices } from "@/modules/warranty/access";
import {
  deleteServiceInvoiceAction,
  finalizeServiceInvoiceAction,
  unpostServiceInvoiceAction,
} from "@/modules/warranty/actions/service-invoices";
import { serviceInvoiceApi } from "@/modules/warranty/service-invoice-api";

export const metadata: Metadata = { title: "Service Invoice" };

type Props = PageProps<"/warranty/service-invoices/[invoiceId]">;

export default function ServiceInvoicePage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ServiceInvoiceDetail params={params} />
    </Suspense>
  );
}

async function ServiceInvoiceDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).invoiceId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => serviceInvoiceApi.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const invoice = result.data;
  const canManage = canManageServiceInvoices(session);
  const money = (value: number) => `${formatAmount(value)} ${invoice.currency}`;
  const isDraft = invoice.status === "Draft";
  // Finalized: posted, with its bill voucher posted. Unposting the voucher puts the invoice back to draft.
  const finalized = invoice.billVoucherStatus === "Posted";
  const isPosted = invoice.status === "Posted";
  const canFinalize = canManage && !finalized && (isDraft || invoice.status === "Posted");
  const finalizeMessage =
    "Finalize this service invoice? It is posted (if still a draft) and its bill voucher is posted from the ledger " +
    "mappings. A posted service invoice can't be changed or deleted.";
  const lineDiscount = invoice.discountAmount - invoice.extraDiscountAmount;

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {invoice.invoiceNo} <DocumentStatusBadge status={invoice.status} />
            {invoice.status !== "Cancelled" && <DocumentStatusBadge status={invoice.paymentStatus} />}
            {finalized && <Badge tone="brand">Finalized</Badge>}
          </span>
        }
        description={`${invoice.saleType} service invoice to ${customerLabel(invoice)} · ${formatDate(invoice.invoiceDate)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Warranty", href: "/warranty" },
          { label: "Service Invoices", href: "/warranty/service-invoices" },
          { label: invoice.invoiceNo },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canManage && isDraft && (
              <>
                <LinkButton href={`/warranty/service-invoices/${id}/edit`} variant="outline" size="sm">
                  <Pencil className="size-4" aria-hidden /> Edit
                </LinkButton>
                <ConfirmDeleteButton action={deleteServiceInvoiceAction.bind(null, id)} itemLabel={`service invoice ${invoice.invoiceNo}`} />
              </>
            )}
            {canFinalize && (
              <DocumentActionButton action={finalizeServiceInvoiceAction.bind(null, id)} variant="primary" confirmMessage={finalizeMessage}>
                Finalize
              </DocumentActionButton>
            )}
            {/* Locked only while finalized and fully paid; a finalized invoice's bill voucher is unposted on the way. */}
            {canManage && isPosted && (!finalized || invoice.paymentStatus !== "Paid") && (
              <DocumentActionButton
                action={unpostServiceInvoiceAction.bind(null, id)}
                variant="outline"
                confirmMessage={`Put this service invoice back to draft, so it can be changed or deleted, then finalized again?${finalized ? ` Its bill voucher ${invoice.billVoucherRefNo} is unposted.` : ""}`}
              >
                Back to draft
              </DocumentActionButton>
            )}
            {canManage && (
              <LinkButton href="/warranty/service-invoices/new" size="sm">
                <Plus className="size-4" aria-hidden /> New service invoice
              </LinkButton>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardBody>
            <Facts
              items={[
                {
                  label: "Bill voucher",
                  value: invoice.billVoucherId !== null ? (
                    <Link href={`/accounting/vouchers?view=${invoice.billVoucherId}`} className="text-brand-500 hover:underline">
                      {invoice.billVoucherRefNo}
                      {invoice.billVoucherStatus === "Draft" ? " (unposted)" : ""}
                    </Link>
                  ) : null,
                },
                {
                  label: "Customer",
                  value: invoice.customerId ? (
                    <span>
                      {invoice.customerName} <span className="text-gray-500">({invoice.customerCode})</span>
                    </span>
                  ) : (
                    `${customerLabel(invoice)} (walk-in)`
                  ),
                },
                { label: "Mobile", value: invoice.customerMobile },
                { label: "Type", value: invoice.saleType === "Cash" ? "Cash (paid in full)" : "Credit (baki)" },
                { label: "Date", value: formatDate(invoice.invoiceDate) },
                { label: "Due date", value: invoice.dueDate ? formatDate(invoice.dueDate) : null },
                { label: "Warehouse", value: invoice.warehouseName },
                {
                  label: "Paid",
                  value:
                    invoice.paidAmount > 0
                      ? `${money(invoice.paidAmount)} · ${salesLabel(invoice.paymentMethod)}${invoice.paymentProvider ? ` (${invoice.paymentProvider})` : ""}${invoice.paymentReferenceNo ? ` · ${invoice.paymentReferenceNo}` : ""}`
                      : null,
                },
                { label: "Payment source", value: invoice.paymentSourceName ? `${invoice.paymentSourceName}${invoice.paymentSourceType ? ` · ${invoice.paymentSourceType}` : ""}` : null },
                { label: "Saved", value: formatDateTime(invoice.updatedAt ?? invoice.createdAt) },
                { label: "Remarks", value: invoice.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Service" />
          <CardBody className="space-y-2 text-sm">
            <p className="whitespace-pre-line text-gray-800 dark:text-white/90">{invoice.serviceNote ?? "No service note."}</p>
            <p className="text-gray-500 dark:text-gray-400">
              Service amount: <span className="font-medium text-gray-800 tabular-nums dark:text-white/90">{money(invoice.serviceAmount)}</span>
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Parts used (${invoice.lines.length})`} />
          {invoice.lines.length > 0 && (
            <Table>
              <THead>
                <tr>
                  <TH>#</TH>
                  <TH>Product</TH>
                  <TH className="text-right">Quantity</TH>
                  <TH className="text-right">Price</TH>
                  <TH className="text-right">Discount</TH>
                  <TH className="text-right">Tax</TH>
                  <TH className="text-right">Total</TH>
                </tr>
              </THead>
              <TBody>
                {invoice.lines.map((line) => (
                  <TR key={line.id}>
                    <TD>{line.lineNo}</TD>
                    <TD>
                      <span className="font-medium text-gray-800 dark:text-white/90">{line.productName}</span>
                      <span className="block text-xs text-gray-500">
                        {line.productCode}
                        {line.batchNo && ` · batch ${line.batchNo}${line.expiryDate ? ` (exp ${formatDate(line.expiryDate)})` : ""}`}
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
                    <TD className="text-right tabular-nums">{line.discountAmount > 0 ? formatAmount(line.discountAmount) : "—"}</TD>
                    <TD className="text-right tabular-nums">
                      {line.taxAmount > 0 ? formatAmount(line.taxAmount) : "—"}
                      {line.taxGroupName && <span className="block text-xs text-gray-500">{line.taxGroupName}</span>}
                    </TD>
                    <TD className="text-right font-medium tabular-nums">{formatAmount(line.lineTotal)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <CardBody>
            <TotalsList
              rows={[
                { label: "Parts", value: money(invoice.subtotalAmount), hidden: invoice.lines.length === 0 },
                { label: "Discount", value: `-${money(lineDiscount)}`, hidden: lineDiscount === 0 },
                { label: "Tax", value: money(invoice.taxAmount), hidden: invoice.taxAmount === 0 },
                { label: "Service amount", value: money(invoice.serviceAmount) },
                { label: "Other charges", value: money(invoice.chargeAmount), hidden: invoice.chargeAmount === 0 },
                { label: "Bill discount (less)", value: `-${money(invoice.extraDiscountAmount)}`, hidden: invoice.extraDiscountAmount === 0 },
                { label: "Round off", value: money(invoice.roundOffAmount), hidden: invoice.roundOffAmount === 0 },
                { label: "Total", value: money(invoice.totalAmount), strong: true },
                { label: "Paid", value: money(invoice.settledAmount) },
                { label: "Due", value: money(invoice.dueAmount), strong: true, hidden: invoice.dueAmount === 0 },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
