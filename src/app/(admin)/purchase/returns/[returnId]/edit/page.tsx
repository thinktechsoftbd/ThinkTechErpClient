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
import { saveReturnAction } from "@/modules/purchase/actions/returns";
import { purchaseApi } from "@/modules/purchase/api";
import { PurchaseDocumentEditor } from "@/modules/purchase/components/purchase-document-editor";
import { editorLinesFrom, loadLineProducts, loadPurchaseEditorOptions } from "@/modules/purchase/editor-data";

export const metadata: Metadata = { title: "Edit Purchase Return" };

type Props = PageProps<"/purchase/returns/[returnId]/edit">;

export default function EditPurchaseReturnPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditReturn params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditReturn({ params, searchParams }: Props) {
  const id = parseIdParam((await params).returnId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  const [session, result, options] = await Promise.all([
    requireSession(),
    tryApi(() => purchaseApi.returns.get(id)),
    loadPurchaseEditorOptions(),
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }
  if (result.data.status !== "Draft") redirect(`/purchase/returns/${id}`);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  const products = await loadLineProducts(result.data.lines);
  if (!products.ok) return <Card><ApiErrorState error={products.error} /></Card>;

  const data = result.data;
  return (
    <>
      <PageHeader
        title={`Edit ${data.returnNo}`}
        description="A draft: nothing has moved yet. Post it to take the stock out and settle with the supplier."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Returns", href: "/purchase/returns" },
          { label: data.returnNo, href: `/purchase/returns/${id}` },
          { label: "Edit" },
        ]}
      />
      {notice && (
        <Alert tone="error" className="mb-6">
          {notice}
        </Alert>
      )}
      <PurchaseDocumentEditor
        mode="return"
        action={saveReturnAction.bind(null, id)}
        options={options.data}
        canPost={canManagePurchase(session)}
        cancelHref={`/purchase/returns/${id}`}
        initial={{
          date: data.returnDate,
          supplierId: data.supplierId,
          supplierName: data.supplierId ? "" : (data.supplierName ?? ""),
          warehouseId: data.warehouseId,
          goodsReceiptId: data.goodsReceiptId,
          goodsReceiptNo: data.goodsReceiptNo,
          purchaseInvoiceId: data.purchaseInvoiceId,
          purchaseInvoiceNo: data.purchaseInvoiceNo,
          reason: data.reason,
          settlementType: data.settlementType,
          refundMethod: data.refundMethod ?? "Cash",
          refundProvider: data.refundProvider ?? "",
          refundReferenceNo: data.refundReferenceNo ?? "",
          currencyId: data.currencyLookupDataId,
          exchangeRate: String(data.exchangeRate),
          remarks: data.remarks ?? "",
          lines: editorLinesFrom(data.lines, products.data),
        }}
      />
    </>
  );
}
