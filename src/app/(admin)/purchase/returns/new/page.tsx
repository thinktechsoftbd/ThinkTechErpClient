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
import { saveReturnAction } from "@/modules/purchase/actions/returns";
import { purchaseApi } from "@/modules/purchase/api";
import {
  PurchaseDocumentEditor,
  type EditorLine,
  type PurchaseEditorInitial,
} from "@/modules/purchase/components/purchase-document-editor";
import { editorLinesFrom, loadLineProducts, loadPurchaseEditorOptions } from "@/modules/purchase/editor-data";
import { ON_THE_SPOT_METHODS, type PurchaseLine } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "New Purchase Return" };

type Props = PageProps<"/purchase/returns/new">;

export default function NewPurchaseReturnPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New purchase return"
        description="Goods going back to the supplier. Posting takes the stock out and deducts from the dues, or records the refund."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Returns", href: "/purchase/returns" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewReturn searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const openToReturn = (line: PurchaseLine) => line.quantity - line.returnedQuantity;
const returnHint = (line: PurchaseLine, open: number) =>
  line.returnedQuantity > 0
    ? `${formatQuantity(open)} of ${formatQuantity(line.quantity)} still returnable`
    : `${formatQuantity(line.quantity)} bought`;

/**
 * Nothing returned from a serial-tracked line yet: start from all its serial numbers (remove the
 * ones staying), so a full return is just a post.
 */
function withSerials(lines: EditorLine[], source: PurchaseLine[], sourceIdOf: (line: EditorLine) => number | null) {
  const byId = new Map(source.map((line) => [line.id, line]));
  return lines.map((line) => {
    const from = byId.get(sourceIdOf(line) ?? 0);
    return from && from.trackingType === "Serial" && from.returnedQuantity === 0 && from.serialNos.length > 0
      ? { ...line, serialNos: from.serialNos.join("\n") }
      : line;
  });
}

/** ?invoiceId= returns goods bought on a posted invoice; ?receiptId= returns goods from a posted receipt. */
async function NewReturn({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const invoiceId = parseIdParam(firstParam(query.invoiceId) ?? "");
  const receiptId = parseIdParam(firstParam(query.receiptId) ?? "");
  const [session, options] = await Promise.all([requireSession(), loadPurchaseEditorOptions()]);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;

  let initial: PurchaseEditorInitial = {};
  let cancelHref = "/purchase/returns";

  if (invoiceId) {
    const invoice = await tryApi(() => purchaseApi.invoices.get(invoiceId));
    if (!invoice.ok) return <Card><ApiErrorState error={invoice.error} /></Card>;
    const data = invoice.data;
    cancelHref = `/purchase/invoices/${data.id}`;
    if (data.status !== "Posted" || !data.receivesStock) {
      return (
        <Alert tone="warning" title={`Goods can't be returned against invoice ${data.invoiceNo}`}>
          <p>
            {data.status !== "Posted"
              ? "Only a posted invoice has goods to return."
              : "This bill didn't bring the stock in: return the goods against the goods receipt it billed."}
          </p>
          <LinkButton href={cancelHref} variant="outline" size="sm" className="mt-3">
            Back to the invoice
          </LinkButton>
        </Alert>
      );
    }
    const stockLines = data.lines.filter((line) => line.productType === "Stock");
    const products = await loadLineProducts(stockLines);
    if (!products.ok) return <Card><ApiErrorState error={products.error} /></Card>;
    const lines = editorLinesFrom(stockLines, products.data, {
      quantityOf: openToReturn,
      hint: returnHint,
      link: (line) => ({ purchaseInvoiceLineId: line.id }),
      keepTax: true,
    });
    if (lines.length === 0) return <NothingLeft title={`Everything on invoice ${data.invoiceNo} has been returned`} href={cancelHref} />;
    const refundMethod =
      data.paymentMethod && (ON_THE_SPOT_METHODS as readonly string[]).includes(data.paymentMethod) ? data.paymentMethod : "Cash";
    initial = {
      supplierId: data.supplierId,
      supplierName: data.supplierId ? "" : (data.supplierName ?? ""),
      warehouseId: data.warehouseId,
      purchaseInvoiceId: data.id,
      purchaseInvoiceNo: data.invoiceNo,
      currencyId: data.currencyLookupDataId,
      exchangeRate: String(data.exchangeRate),
      // A walk-in supplier has no dues to deduct from; a cash purchase is usually refunded in cash.
      settlementType: data.supplierId && data.purchaseType === "Credit" ? "AdjustDue" : "Refund",
      refundMethod,
      lines: withSerials(lines, stockLines, (line) => line.purchaseInvoiceLineId),
    };
  } else if (receiptId) {
    const receipt = await tryApi(() => purchaseApi.receipts.get(receiptId));
    if (!receipt.ok) return <Card><ApiErrorState error={receipt.error} /></Card>;
    const data = receipt.data;
    cancelHref = `/purchase/goods-receipts/${data.id}`;
    if (data.status !== "Posted") {
      return (
        <Alert tone="warning" title={`Goods can't be returned against receipt ${data.receiptNo}`}>
          <p>Only a posted goods receipt has goods to return.</p>
          <LinkButton href={cancelHref} variant="outline" size="sm" className="mt-3">
            Back to the receipt
          </LinkButton>
        </Alert>
      );
    }
    const stockLines = data.lines.filter((line) => line.productType === "Stock");
    const products = await loadLineProducts(stockLines);
    if (!products.ok) return <Card><ApiErrorState error={products.error} /></Card>;
    const lines = editorLinesFrom(stockLines, products.data, {
      quantityOf: openToReturn,
      hint: (line, open) =>
        line.returnedQuantity > 0
          ? `${formatQuantity(open)} of ${formatQuantity(line.quantity)} still returnable`
          : `${formatQuantity(line.quantity)} received`,
      link: (line) => ({ goodsReceiptLineId: line.id }),
    });
    if (lines.length === 0) return <NothingLeft title={`Everything on receipt ${data.receiptNo} has been returned`} href={cancelHref} />;
    initial = {
      supplierId: data.supplierId,
      warehouseId: data.warehouseId,
      goodsReceiptId: data.id,
      goodsReceiptNo: data.receiptNo,
      currencyId: data.currencyLookupDataId,
      exchangeRate: String(data.exchangeRate),
      settlementType: "AdjustDue",
      lines: withSerials(lines, stockLines, (line) => line.goodsReceiptLineId),
    };
  }

  return (
    <PurchaseDocumentEditor
      mode="return"
      action={saveReturnAction.bind(null, null)}
      options={options.data}
      initial={initial}
      canPost={canManagePurchase(session)}
      cancelHref={cancelHref}
    />
  );
}

function NothingLeft({ title, href }: { title: string; href: string }) {
  return (
    <Alert tone="info" title={title}>
      <LinkButton href={href} variant="outline" size="sm" className="mt-3">
        Go back
      </LinkButton>
    </Alert>
  );
}
