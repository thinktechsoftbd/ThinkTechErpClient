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
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManagePurchase } from "@/modules/purchase/access";
import { cancelReturnAction, deleteReturnAction, postReturnAction } from "@/modules/purchase/actions/returns";
import { purchaseApi } from "@/modules/purchase/api";
import { PurchaseLinesTable } from "@/modules/purchase/components/purchase-lines-table";
import { purchaseLabel } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Purchase Return" };

type Props = PageProps<"/purchase/returns/[returnId]">;

export default function PurchaseReturnPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReturnDetail params={params} />
    </Suspense>
  );
}

async function ReturnDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).returnId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => purchaseApi.returns.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const item = result.data;
  const canManage = canManagePurchase(session);
  const money = (value: number) => `${formatAmount(value)} ${item.currency}`;
  const isDraft = item.status === "Draft";
  const isPosted = item.status === "Posted";
  const refund = item.settlementType === "Refund";
  const refundDetails = [
    purchaseLabel(item.refundMethod),
    item.refundProvider && `(${item.refundProvider})`,
    item.refundReferenceNo && `· ${item.refundReferenceNo}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {item.returnNo} <DocumentStatusBadge status={item.status} />
          </span>
        }
        description={`Return to ${item.supplierName ?? "a walk-in supplier"} · ${formatDate(item.returnDate)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Returns", href: "/purchase/returns" },
          { label: item.returnNo },
        ]}
        actions={
          canManage && (
            <div className="flex flex-wrap items-start gap-2">
              {isDraft && (
                <>
                  <LinkButton href={`/purchase/returns/${id}/edit`} variant="outline" size="sm">
                    <Pencil className="size-4" aria-hidden /> Edit
                  </LinkButton>
                  <DocumentActionButton
                    action={postReturnAction.bind(null, id)}
                    variant="primary"
                    confirmMessage={
                      refund
                        ? "Post this return? The stock goes out and the refund is recorded. Posted returns can't be edited."
                        : "Post this return? The stock goes out and the amount is deducted from the supplier's dues. Posted returns can't be edited."
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
                  confirmMessage="Cancel this posted return? The stock comes back in and the deduction or refund is reversed."
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
                { label: "Supplier", value: item.supplierName ?? "Walk-in supplier" },
                { label: "Return date", value: formatDate(item.returnDate) },
                { label: "From warehouse", value: item.warehouseName },
                {
                  label: "Against invoice",
                  value: item.purchaseInvoiceId ? (
                    <Link href={`/purchase/invoices/${item.purchaseInvoiceId}`} className="text-brand-500 hover:underline">
                      {item.purchaseInvoiceNo}
                    </Link>
                  ) : null,
                },
                {
                  label: "Against goods receipt",
                  value: item.goodsReceiptId ? (
                    <Link href={`/purchase/goods-receipts/${item.goodsReceiptId}`} className="text-brand-500 hover:underline">
                      {item.goodsReceiptNo}
                    </Link>
                  ) : null,
                },
                { label: "Reason", value: purchaseLabel(item.reason) },
                { label: "Settled by", value: refund ? `Refund: ${refundDetails}` : "Deducted from the supplier's dues" },
                { label: "Currency", value: item.exchangeRate !== 1 ? `${item.currency} at ${item.exchangeRate}` : item.currency },
                { label: "Posted", value: item.postedAt ? formatDateTime(item.postedAt) : null },
                { label: "Remarks", value: item.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Items (${item.lines.length})`} />
          <PurchaseLinesTable lines={item.lines} mode="return" />
          <CardBody>
            <TotalsList
              rows={[
                { label: "Items", value: money(item.subtotalAmount) },
                { label: "Discount", value: `-${money(item.discountAmount)}`, hidden: item.discountAmount === 0 },
                { label: "Tax", value: money(item.taxAmount), hidden: item.taxAmount === 0 },
                { label: refund ? "Refund" : "Deducted from dues", value: money(item.totalAmount), strong: true },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
