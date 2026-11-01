import type { Metadata } from "next";
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
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount, round } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManagePurchase } from "@/modules/purchase/access";
import { approveOrderAction, cancelOrderAction, closeOrderAction, deleteOrderAction } from "@/modules/purchase/actions/orders";
import { purchaseApi } from "@/modules/purchase/api";
import { PurchaseLinesTable } from "@/modules/purchase/components/purchase-lines-table";

export const metadata: Metadata = { title: "Purchase Order" };

type Props = PageProps<"/purchase/orders/[orderId]">;

export default function PurchaseOrderPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).orderId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => purchaseApi.orders.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const order = result.data;
  const canManage = canManagePurchase(session);
  const money = (value: number) => `${formatAmount(value)} ${order.currency}`;
  const isDraft = order.status === "Draft";
  const isOpen = order.status === "Approved" || order.status === "PartiallyReceived";
  const canClose = isOpen || order.status === "Received";
  // Cancel only works while nothing has come in (or been billed) against the order.
  const untouched = order.lines.every((line) => line.receivedQuantity === 0 && line.invoicedQuantity === 0);
  const canCancel = order.status === "Approved" && untouched;

  // Lines done so far (the per-line quantities are in the table).
  const fullyReceived = order.lines.filter((l) => round(l.receivedQuantity) >= round(l.quantity)).length;
  const fullyBilled = order.lines.filter((l) => round(l.invoicedQuantity) >= round(l.quantity)).length;

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {order.orderNo} <DocumentStatusBadge status={order.status} />
          </span>
        }
        description={`Order to ${order.supplierName} · ${formatDate(order.orderDate)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Orders", href: "/purchase/orders" },
          { label: order.orderNo },
        ]}
        actions={
          canManage && (
            <div className="flex flex-wrap items-start gap-2">
              {isDraft && (
                <>
                  <LinkButton href={`/purchase/orders/${id}/edit`} variant="outline" size="sm">
                    <Pencil className="size-4" aria-hidden /> Edit
                  </LinkButton>
                  <DocumentActionButton
                    action={approveOrderAction.bind(null, id)}
                    variant="primary"
                    confirmMessage="Approve this order? It can't be edited afterwards; the goods can then be received or bought against it."
                  >
                    Approve
                  </DocumentActionButton>
                  <DocumentActionButton action={deleteOrderAction.bind(null, id)} variant="danger" confirmMessage="Delete this draft order?">
                    Delete
                  </DocumentActionButton>
                </>
              )}
              {isOpen && (
                <>
                  <LinkButton href={`/purchase/goods-receipts/new?orderId=${id}`} size="sm">
                    Receive goods
                  </LinkButton>
                  <LinkButton href={`/purchase/invoices/new?orderId=${id}`} variant="outline" size="sm">
                    Buy now (invoice)
                  </LinkButton>
                </>
              )}
              {canClose && (
                <DocumentActionButton
                  action={closeOrderAction.bind(null, id)}
                  confirmMessage="Close this order? Nothing more can be received against it."
                >
                  Close
                </DocumentActionButton>
              )}
              {canCancel && (
                <DocumentActionButton
                  action={cancelOrderAction.bind(null, id)}
                  variant="danger"
                  confirmMessage="Cancel this order? Nothing has been received against it yet."
                >
                  Cancel
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
                { label: "Supplier", value: order.supplierName },
                { label: "Order date", value: formatDate(order.orderDate) },
                { label: "Expected delivery", value: order.expectedDate ? formatDate(order.expectedDate) : null },
                { label: "Deliver to", value: order.warehouseName },
                { label: "Supplier's reference", value: order.supplierReference },
                { label: "Payment terms", value: order.paymentTermsDays > 0 ? `${order.paymentTermsDays} day(s)` : "On delivery" },
                { label: "Currency", value: order.exchangeRate !== 1 ? `${order.currency} at ${order.exchangeRate}` : order.currency },
                {
                  label: "Progress",
                  value: order.status === "Draft" || order.status === "Cancelled"
                    ? null
                    : `${fullyReceived} of ${order.lines.length} line(s) fully received · ${fullyBilled} fully billed`,
                },
                { label: "Approved", value: order.approvedAt ? formatDateTime(order.approvedAt) : null },
                { label: "Remarks", value: order.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Items (${order.lines.length})`} description="Ordered, received so far and billed so far, per line." />
          <PurchaseLinesTable lines={order.lines} mode="order" />
          <CardBody>
            <TotalsList
              rows={[
                { label: "Items", value: money(order.subtotalAmount) },
                { label: "Discount", value: `-${money(order.discountAmount)}`, hidden: order.discountAmount === 0 },
                { label: "Tax", value: money(order.taxAmount), hidden: order.taxAmount === 0 },
                { label: "Expected charges", value: money(order.chargeAmount), hidden: order.chargeAmount === 0 },
                { label: "Total", value: money(order.totalAmount), strong: true },
              ]}
            />
          </CardBody>
        </Card>

        {order.termsAndConditions && (
          <Card>
            <CardHeader title="Terms and conditions" />
            <CardBody>
              <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{order.termsAndConditions}</p>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
