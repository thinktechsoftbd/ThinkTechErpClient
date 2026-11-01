import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { canManagePurchase } from "@/modules/purchase/access";
import { saveOrderAction } from "@/modules/purchase/actions/orders";
import { purchaseApi } from "@/modules/purchase/api";
import { PurchaseDocumentEditor } from "@/modules/purchase/components/purchase-document-editor";
import { editorLinesFrom, loadLineProducts, loadPurchaseEditorOptions } from "@/modules/purchase/editor-data";

export const metadata: Metadata = { title: "Edit Purchase Order" };

type Props = PageProps<"/purchase/orders/[orderId]/edit">;

export default function EditPurchaseOrderPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditOrder params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditOrder({ params, searchParams }: Props) {
  const id = parseIdParam((await params).orderId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  const [session, order, options] = await Promise.all([
    requireSession(),
    tryApi(() => purchaseApi.orders.get(id)),
    loadPurchaseEditorOptions(),
  ]);
  if (!order.ok) {
    if (order.error.status === 404) notFound();
    return <Card><ApiErrorState error={order.error} /></Card>;
  }
  if (order.data.status !== "Draft") redirect(`/purchase/orders/${id}`);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  const products = await loadLineProducts(order.data.lines);
  if (!products.ok) return <Card><ApiErrorState error={products.error} /></Card>;

  const data = order.data;
  return (
    <>
      <PageHeader
        title={`Edit ${data.orderNo}`}
        description="A draft order. Approve it once the supplier has agreed; it can't be edited afterwards."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Orders", href: "/purchase/orders" },
          { label: data.orderNo, href: `/purchase/orders/${id}` },
          { label: "Edit" },
        ]}
      />
      {notice && (
        <Alert tone="error" className="mb-6">
          {notice}
        </Alert>
      )}
      <PurchaseDocumentEditor
        mode="order"
        action={saveOrderAction.bind(null, id)}
        options={options.data}
        canPost={canManagePurchase(session)}
        postLabel="Save & approve"
        cancelHref={`/purchase/orders/${id}`}
        initial={{
          date: data.orderDate,
          supplierId: data.supplierId,
          warehouseId: data.warehouseId,
          expectedDate: data.expectedDate ?? "",
          supplierReference: data.supplierReference ?? "",
          paymentTermsDays: String(data.paymentTermsDays),
          chargeAmount: String(data.chargeAmount),
          termsAndConditions: data.termsAndConditions ?? "",
          currencyId: data.currencyLookupDataId,
          exchangeRate: String(data.exchangeRate),
          remarks: data.remarks ?? "",
          lines: editorLinesFrom(data.lines, products.data),
        }}
      />
    </>
  );
}
