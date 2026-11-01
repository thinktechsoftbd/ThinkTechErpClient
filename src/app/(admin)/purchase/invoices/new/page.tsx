import type { Metadata } from "next";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { formatQuantity } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManagePurchase } from "@/modules/purchase/access";
import { saveInvoiceAction } from "@/modules/purchase/actions/invoices";
import { purchaseApi } from "@/modules/purchase/api";
import { PurchaseDocumentEditor, type PurchaseEditorInitial } from "@/modules/purchase/components/purchase-document-editor";
import { editorLinesFrom, loadLineProducts, loadPurchaseEditorOptions } from "@/modules/purchase/editor-data";

export const metadata: Metadata = { title: "New Purchase" };

type Props = PageProps<"/purchase/invoices/new">;

export default function NewPurchaseInvoicePage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New purchase"
        description="Enter the supplier's bill: cash or credit. Posting brings the stock in."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Invoices", href: "/purchase/invoices" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewInvoice searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** ?orderId= buys against an approved order (stock comes in now); ?receiptId= bills a goods receipt. */
async function NewInvoice({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const orderId = parseIdParam(firstParam(query.orderId) ?? "");
  const receiptId = parseIdParam(firstParam(query.receiptId) ?? "");
  const [session, options] = await Promise.all([requireSession(), loadPurchaseEditorOptions()]);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;

  let initial: PurchaseEditorInitial = {};
  if (receiptId) {
    const receipt = await tryApi(() => purchaseApi.receipts.get(receiptId));
    if (!receipt.ok) return <Card><ApiErrorState error={receipt.error} /></Card>;
    const products = await loadLineProducts(receipt.data.lines);
    if (!products.ok) return <Card><ApiErrorState error={products.error} /></Card>;
    initial = {
      purchaseType: "Credit",
      receivesStock: false,
      supplierId: receipt.data.supplierId,
      purchaseOrderId: receipt.data.purchaseOrderId,
      purchaseOrderNo: receipt.data.purchaseOrderNo,
      goodsReceiptId: receipt.data.id,
      goodsReceiptNo: receipt.data.receiptNo,
      currencyId: receipt.data.currencyLookupDataId,
      exchangeRate: String(receipt.data.exchangeRate),
      lines: editorLinesFrom(receipt.data.lines, products.data, {
        quantityOf: (line) => line.quantity - line.invoicedQuantity,
        hint: (line, open) => `${formatQuantity(open)} of ${formatQuantity(line.quantity)} received still to bill`,
        link: (line) => ({ goodsReceiptLineId: line.id, purchaseOrderLineId: line.purchaseOrderLineId }),
      }),
    };
  } else if (orderId) {
    const order = await tryApi(() => purchaseApi.orders.get(orderId));
    if (!order.ok) return <Card><ApiErrorState error={order.error} /></Card>;
    const products = await loadLineProducts(order.data.lines);
    if (!products.ok) return <Card><ApiErrorState error={products.error} /></Card>;
    initial = {
      purchaseType: "Credit",
      supplierId: order.data.supplierId,
      warehouseId: order.data.warehouseId,
      purchaseOrderId: order.data.id,
      purchaseOrderNo: order.data.orderNo,
      currencyId: order.data.currencyLookupDataId,
      exchangeRate: String(order.data.exchangeRate),
      lines: editorLinesFrom(order.data.lines, products.data, {
        quantityOf: (line) => line.quantity - line.receivedQuantity,
        hint: (line, open) => `${formatQuantity(open)} of ${formatQuantity(line.quantity)} ordered still to receive`,
        link: (line) => ({ purchaseOrderLineId: line.id }),
        keepTax: true,
      }),
    };
  }

  return (
    <PurchaseDocumentEditor
      mode="invoice"
      action={saveInvoiceAction.bind(null, null)}
      options={options.data}
      initial={initial}
      canPost={canManagePurchase(session)}
      cancelHref="/purchase/invoices"
    />
  );
}
