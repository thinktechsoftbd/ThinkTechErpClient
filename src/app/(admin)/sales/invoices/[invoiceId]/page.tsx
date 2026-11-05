import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Facts, TotalsList } from "@/core/documents/facts";
import { getCurrentOrganization } from "@/core/org/organization";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { appConfig } from "@/core/config/app";
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { canManageSales } from "@/modules/sales/access";
import { cancelSaleAction, deleteSaleAction, finalizeSaleAction, postSaleAction } from "@/modules/sales/actions/invoices";
import { salesApi } from "@/modules/sales/api";
import { SalesMemo } from "@/modules/sales/components/sales-memo";
import { customerLabel, salesLabel } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Sale" };

type Props = PageProps<"/sales/invoices/[invoiceId]">;

export default function SalePage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SaleDetail params={params} />
    </Suspense>
  );
}

async function SaleDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).invoiceId);
  if (id === null) notFound();
  const [session, result, organization] = await Promise.all([
    requireSession(),
    tryApi(() => salesApi.invoices.get(id)),
    getCurrentOrganization(),
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const invoice = result.data;
  const canManage = canManageSales(session);
  const money = (value: number) => `${formatAmount(value)} ${invoice.currency}`;
  const isDraft = invoice.status === "Draft";
  const isPosted = invoice.status === "Posted";
  const lineDiscount = invoice.discountAmount - invoice.extraDiscountAmount;
  const profit = invoice.totalAmount - invoice.taxAmount - invoice.costAmount;
  const returnable = invoice.lines.some((line) => line.quantity - line.returnedQuantity > 0.0001);
  // Finalized: its bill voucher is posted, and the sale is locked until the voucher is deleted.
  const finalized = invoice.billVoucherId !== null;
  const finalizeMessage =
    "Finalize this sale? It is completed (if still a draft) and its bill voucher is posted from the ledger mappings. " +
    "It can't be cancelled until that voucher is deleted.";

  return (
    <>
      <SalesMemo invoice={invoice} shopName={organization?.name ?? appConfig.name} />
      <div className="print:hidden">
        <PageHeader
          title={
            <span className="inline-flex items-center gap-3">
              {invoice.invoiceNo} <DocumentStatusBadge status={isPosted ? "Posted" : invoice.status} />
              {isPosted && <DocumentStatusBadge status={invoice.paymentStatus} />}
              {finalized && <Badge tone="brand">Finalized</Badge>}
            </span>
          }
          description={`${invoice.saleType} sale to ${customerLabel(invoice)} · ${formatDate(invoice.invoiceDate)}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Inventory", href: "/inventory" },
            { label: "Sales", href: "/sales/invoices" },
            { label: invoice.invoiceNo },
          ]}
          actions={
            <div className="flex flex-wrap items-start gap-2">
              {isPosted && <PrintButton label="Print memo" />}
              {canManage && isDraft && (
                <>
                  <LinkButton href={`/sales/invoices/${id}/edit`} variant="outline" size="sm">
                    <Pencil className="size-4" aria-hidden /> Edit
                  </LinkButton>
                  <DocumentActionButton
                    action={postSaleAction.bind(null, id)}
                    variant="primary"
                    confirmMessage="Complete this sale? The stock goes out and the payment or due is recorded. A completed sale can't be edited."
                  >
                    Complete sale
                  </DocumentActionButton>
                  <DocumentActionButton action={finalizeSaleAction.bind(null, id)} variant="primary" confirmMessage={finalizeMessage}>
                    Finalize
                  </DocumentActionButton>
                  <DocumentActionButton action={deleteSaleAction.bind(null, id)} variant="danger" confirmMessage="Delete this draft sale?">
                    Delete
                  </DocumentActionButton>
                </>
              )}
              {canManage && isPosted && invoice.customerId && invoice.dueAmount > 0 && (
                <LinkButton href={`/sales/receipts/new?customerId=${invoice.customerId}&invoiceId=${id}`} size="sm">
                  Collect due
                </LinkButton>
              )}
              {canManage && isPosted && returnable && (
                <LinkButton href={`/sales/returns/new?invoiceId=${id}`} variant="outline" size="sm">
                  Return goods
                </LinkButton>
              )}
              {canManage && isPosted && !finalized && (
                <DocumentActionButton action={finalizeSaleAction.bind(null, id)} variant="primary" confirmMessage={finalizeMessage}>
                  Finalize
                </DocumentActionButton>
              )}
              {canManage && isPosted && !finalized && (
                <DocumentActionButton
                  action={cancelSaleAction.bind(null, id)}
                  variant="danger"
                  confirmMessage="Cancel this sale? The stock comes back and the due is removed. Receipts and returns against it must be cancelled first."
                >
                  Cancel sale
                </DocumentActionButton>
              )}
              {canManage && (
                <LinkButton href="/sales/invoices/new" size="sm" variant={isPosted ? "primary" : "outline"}>
                  <Plus className="size-4" aria-hidden /> New sale
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
                    value: finalized ? (
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
                  { label: "Sale type", value: invoice.saleType === "Cash" ? "Cash (paid in full)" : "Credit (baki)" },
                  { label: "Date", value: formatDate(invoice.invoiceDate) },
                  { label: "Due date", value: invoice.dueDate ? formatDate(invoice.dueDate) : null },
                  { label: "Warehouse", value: invoice.warehouseName },
                  {
                    label: "Paid at the counter",
                    value:
                      invoice.paidAmount > 0
                        ? `${money(invoice.paidAmount)} · ${salesLabel(invoice.paymentMethod)}${invoice.paymentProvider ? ` (${invoice.paymentProvider})` : ""}${invoice.paymentReferenceNo ? ` · ${invoice.paymentReferenceNo}` : ""}`
                        : null,
                  },
                  { label: "Completed", value: invoice.postedAt ? formatDateTime(invoice.postedAt) : null },
                  { label: "Remarks", value: invoice.remarks },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`Items (${invoice.lines.length})`} />
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
                  {isPosted && <TH className="text-right">Cost</TH>}
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
                        {!line.batchNo && line.trackingType === "Batch" && !isPosted && " · batch: first to expire"}
                      </span>
                      {line.serialNos.length > 0 && <span className="block text-xs text-gray-500">SN {line.serialNos.join(", ")}</span>}
                    </TD>
                    <TD className="text-right whitespace-nowrap tabular-nums">
                      {formatQuantity(line.quantity)} {line.unitCode}
                      {line.conversionFactor !== 1 && (
                        <span className="block text-xs text-gray-500">
                          {formatQuantity(line.baseQuantity)} {line.baseUnitCode}
                        </span>
                      )}
                      {line.returnedQuantity > 0 && (
                        <span className="block text-xs text-amber-700 dark:text-amber-400">
                          {formatQuantity(line.returnedQuantity)} returned
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
                    {isPosted && <TD className="text-right text-gray-500 tabular-nums">{formatAmount(line.unitCost * line.baseQuantity)}</TD>}
                  </TR>
                ))}
              </TBody>
            </Table>
            <CardBody>
              <TotalsList
                rows={[
                  { label: "Items", value: money(invoice.subtotalAmount) },
                  { label: "Discount", value: `-${money(lineDiscount)}`, hidden: lineDiscount === 0 },
                  { label: "Tax", value: money(invoice.taxAmount), hidden: invoice.taxAmount === 0 },
                  { label: "Delivery / labour", value: money(invoice.chargeAmount), hidden: invoice.chargeAmount === 0 },
                  { label: "Bill discount (less)", value: `-${money(invoice.extraDiscountAmount)}`, hidden: invoice.extraDiscountAmount === 0 },
                  { label: "Round off", value: money(invoice.roundOffAmount), hidden: invoice.roundOffAmount === 0 },
                  { label: "Total", value: money(invoice.totalAmount), strong: true },
                  { label: "Received", value: money(invoice.settledAmount) },
                  { label: "Due", value: money(invoice.dueAmount), strong: true, hidden: invoice.dueAmount === 0 },
                  { label: "Cost of goods", value: money(invoice.costAmount), hidden: !isPosted },
                  { label: "Profit (before tax)", value: money(profit), hidden: !isPosted },
                ]}
              />
            </CardBody>
          </Card>

          {invoice.allocations.length > 0 && (
            <Card>
              <CardHeader title="Settled later" description="Customer receipts and returns deducted from this sale's due." />
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
                          href={allocation.sourceType === "Receipt" ? `/sales/receipts/${allocation.sourceId}` : `/sales/returns/${allocation.sourceId}`}
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
      </div>
    </>
  );
}
