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
import { saveReceiptAction } from "@/modules/purchase/actions/receipts";
import { purchaseApi } from "@/modules/purchase/api";
import { PurchaseDocumentEditor } from "@/modules/purchase/components/purchase-document-editor";
import { editorChargesFrom, editorLinesFrom, loadLineProducts, loadPurchaseEditorOptions } from "@/modules/purchase/editor-data";

export const metadata: Metadata = { title: "Edit Goods Receipt" };

type Props = PageProps<"/purchase/goods-receipts/[receiptId]/edit">;

export default function EditGoodsReceiptPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditReceipt params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditReceipt({ params, searchParams }: Props) {
  const id = parseIdParam((await params).receiptId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  const [session, receipt, options] = await Promise.all([
    requireSession(),
    tryApi(() => purchaseApi.receipts.get(id)),
    loadPurchaseEditorOptions(),
  ]);
  if (!receipt.ok) {
    if (receipt.error.status === 404) notFound();
    return <Card><ApiErrorState error={receipt.error} /></Card>;
  }
  if (receipt.data.status !== "Draft") redirect(`/purchase/goods-receipts/${id}`);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  const products = await loadLineProducts(receipt.data.lines);
  if (!products.ok) return <Card><ApiErrorState error={products.error} /></Card>;

  const data = receipt.data;
  return (
    <>
      <PageHeader
        title={`Edit ${data.receiptNo}`}
        description="A draft: nothing has moved yet. Post it to bring the stock in."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Goods Receipts", href: "/purchase/goods-receipts" },
          { label: data.receiptNo, href: `/purchase/goods-receipts/${id}` },
          { label: "Edit" },
        ]}
      />
      {notice && (
        <Alert tone="error" className="mb-6">
          {notice}
        </Alert>
      )}
      <PurchaseDocumentEditor
        mode="receipt"
        action={saveReceiptAction.bind(null, id)}
        options={options.data}
        canPost={canManagePurchase(session)}
        cancelHref={`/purchase/goods-receipts/${id}`}
        initial={{
          date: data.receiptDate,
          supplierId: data.supplierId,
          warehouseId: data.warehouseId,
          purchaseOrderId: data.purchaseOrderId,
          purchaseOrderNo: data.purchaseOrderNo,
          supplierChallanNo: data.supplierChallanNo ?? "",
          supplierChallanDate: data.supplierChallanDate ?? "",
          currencyId: data.currencyLookupDataId,
          exchangeRate: String(data.exchangeRate),
          remarks: data.remarks ?? "",
          lines: editorLinesFrom(data.lines, products.data),
          charges: editorChargesFrom(data.charges),
        }}
      />
    </>
  );
}
