import type { Metadata } from "next";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { formatQuantity } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManagePurchase } from "@/modules/purchase/access";
import { saveReceiptAction } from "@/modules/purchase/actions/receipts";
import { purchaseApi } from "@/modules/purchase/api";
import { PurchaseDocumentEditor, type PurchaseEditorInitial } from "@/modules/purchase/components/purchase-document-editor";
import { editorLinesFrom, loadLineProducts, loadPurchaseEditorOptions } from "@/modules/purchase/editor-data";
import { purchaseLabel } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "New Goods Receipt" };

type Props = PageProps<"/purchase/goods-receipts/new">;

export default function NewGoodsReceiptPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New goods receipt"
        description="Goods that came in before the bill. Posting brings the stock in; the dues are recorded when you bill it."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Goods Receipts", href: "/purchase/goods-receipts" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewReceipt searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** ?orderId= receives against an approved order: its open quantities, linked to the order lines. */
async function NewReceipt({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const orderId = parseIdParam(firstParam(query.orderId) ?? "");
  const [session, options] = await Promise.all([requireSession(), loadPurchaseEditorOptions()]);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;

  let initial: PurchaseEditorInitial = {};
  if (orderId) {
    const order = await tryApi(() => purchaseApi.orders.get(orderId));
    if (!order.ok) return <Card><ApiErrorState error={order.error} /></Card>;
    const data = order.data;
    if (data.status !== "Approved" && data.status !== "PartiallyReceived") {
      return (
        <Alert tone="warning" title={`Order ${data.orderNo} is ${purchaseLabel(data.status).toLowerCase()}`}>
          <p>Goods can only be received against an approved order that isn&apos;t fully received or closed.</p>
          <LinkButton href={`/purchase/orders/${data.id}`} variant="outline" size="sm" className="mt-3">
            Back to the order
          </LinkButton>
        </Alert>
      );
    }
    const products = await loadLineProducts(data.lines);
    if (!products.ok) return <Card><ApiErrorState error={products.error} /></Card>;
    initial = {
      supplierId: data.supplierId,
      warehouseId: data.warehouseId,
      purchaseOrderId: data.id,
      purchaseOrderNo: data.orderNo,
      currencyId: data.currencyLookupDataId,
      exchangeRate: String(data.exchangeRate),
      lines: editorLinesFrom(data.lines, products.data, {
        quantityOf: (line) => line.quantity - line.receivedQuantity,
        hint: (line, open) => `${formatQuantity(open)} of ${formatQuantity(line.quantity)} ordered still to receive`,
        link: (line) => ({ purchaseOrderLineId: line.id }),
      }),
    };
    if (initial.lines?.length === 0) {
      return (
        <Alert tone="info" title={`Everything on order ${data.orderNo} has been received`}>
          <LinkButton href={`/purchase/orders/${data.id}`} variant="outline" size="sm" className="mt-3">
            Back to the order
          </LinkButton>
        </Alert>
      );
    }
  }

  return (
    <PurchaseDocumentEditor
      mode="receipt"
      action={saveReceiptAction.bind(null, null)}
      options={options.data}
      initial={initial}
      canPost={canManagePurchase(session)}
      cancelHref={orderId ? `/purchase/orders/${orderId}` : "/purchase/goods-receipts"}
    />
  );
}
