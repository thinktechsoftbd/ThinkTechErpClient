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
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManageSales } from "@/modules/sales/access";
import { cancelReturnAction, deleteReturnAction, postReturnAction } from "@/modules/sales/actions/returns";
import { salesApi } from "@/modules/sales/api";
import { customerLabel, salesLabel } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Sales Return" };

type Props = PageProps<"/sales/returns/[returnId]">;

export default function SalesReturnPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReturnDetail params={params} />
    </Suspense>
  );
}

async function ReturnDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).returnId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => salesApi.returns.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const item = result.data;
  const canManage = canManageSales(session);
  const money = (value: number) => `${formatAmount(value)} ${item.currency}`;
  const isDraft = item.status === "Draft";
  const isPosted = item.status === "Posted";
  const refund = item.settlementType === "Refund";
  const refundDetails = [
    salesLabel(item.refundMethod),
    item.refundProvider && `(${item.refundProvider})`,
    item.refundReferenceNo && `· ${item.refundReferenceNo}`,
  ]
    .filter(Boolean)
    .join(" ");
  const advance = Math.max(0, item.totalAmount - item.adjustedAmount);

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {item.returnNo} <DocumentStatusBadge status={item.status} />
          </span>
        }
        description={`Return from ${customerLabel(item)} · ${formatDate(item.returnDate)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inventory", href: "/inventory" },
          { label: "Sales Returns", href: "/sales/returns" },
          { label: item.returnNo },
        ]}
        actions={
          canManage && (
            <div className="flex flex-wrap items-start gap-2">
              {isDraft && (
                <>
                  <LinkButton href={`/sales/returns/${id}/edit`} variant="outline" size="sm">
                    <Pencil className="size-4" aria-hidden /> Edit
                  </LinkButton>
                  <DocumentActionButton
                    action={postReturnAction.bind(null, id)}
                    variant="primary"
                    confirmMessage={
                      refund
                        ? "Post this return? Resellable goods go back into stock and the refund is recorded. A posted return can't be edited."
                        : "Post this return? Resellable goods go back into stock and the amount is deducted from the customer's dues on the sale (anything more becomes their advance). A posted return can't be edited."
                    }
                  >
                    Post
                  </DocumentActionButton>
                  <DocumentActionButton action={deleteReturnAction.bind(null, id)} variant="danger" confirmMessage="Delete this draft return?">
                    Delete
                  </DocumentActionButton>
                </>
              )}
              {isPosted && (
                <DocumentActionButton
                  action={cancelReturnAction.bind(null, id)}
                  variant="danger"
                  confirmMessage="Cancel this return? Takes the goods back out of stock and undoes the refund or deduction."
                >
                  Cancel return
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
                {
                  label: "Sale",
                  value: item.salesInvoiceId ? (
                    <Link href={`/sales/invoices/${item.salesInvoiceId}`} className="text-brand-500 hover:underline">
                      {item.salesInvoiceNo}
                    </Link>
                  ) : null,
                },
                {
                  label: "Customer",
                  value: item.customerId ? (
                    <span>
                      {item.customerName} <span className="text-gray-500">({item.customerCode})</span>
                    </span>
                  ) : (
                    `${customerLabel(item)} (walk-in)`
                  ),
                },
                { label: "Mobile", value: item.customerMobile },
                { label: "Return date", value: formatDate(item.returnDate) },
                { label: "Back to warehouse", value: item.warehouseName },
                { label: "Reason", value: salesLabel(item.reason) },
                { label: "Settled by", value: refund ? `Refund: ${refundDetails}` : "Deducted from the customer's dues" },
                { label: "Currency", value: item.exchangeRate !== 1 ? `${item.currency} at ${item.exchangeRate}` : null },
                { label: "Posted", value: item.postedAt ? formatDateTime(item.postedAt) : null },
                { label: "Remarks", value: item.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Items (${item.lines.length})`} description="Priced as they were sold: the price, discount and tax come from the sale." />
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
                <TH>Can be resold</TH>
              </tr>
            </THead>
            <TBody>
              {item.lines.map((line) => (
                <TR key={line.id}>
                  <TD>{line.lineNo}</TD>
                  <TD>
                    <span className="font-medium text-gray-800 dark:text-white/90">{line.productName}</span>
                    <span className="block text-xs text-gray-500">
                      {line.productCode}
                      {line.batchNo && ` · batch ${line.batchNo}${line.expiryDate ? ` (exp ${formatDate(line.expiryDate)})` : ""}`}
                    </span>
                    {line.serialNos.length > 0 && <span className="block text-xs text-gray-500">SN {line.serialNos.join(", ")}</span>}
                    {line.remarks && <span className="block text-xs text-gray-500">{line.remarks}</span>}
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
                  <TD className="whitespace-nowrap">
                    {line.productType !== "Stock" ? (
                      <span className="text-gray-500">—</span>
                    ) : line.isRestockable ? (
                      "Yes"
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">Damaged (not restocked)</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <CardBody>
            <TotalsList
              rows={[
                { label: "Items", value: money(item.subtotalAmount) },
                { label: "Discount (incl. bill discount share)", value: `-${money(item.discountAmount)}`, hidden: item.discountAmount === 0 },
                { label: "Tax", value: money(item.taxAmount), hidden: item.taxAmount === 0 },
                { label: refund ? (isPosted ? "Refunded" : "To refund") : "Return total", value: money(item.totalAmount), strong: true },
                { label: "Deducted from dues", value: money(item.adjustedAmount), hidden: refund || !isPosted },
                { label: "To the customer's advance", value: money(advance), hidden: refund || !isPosted || advance === 0 },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
