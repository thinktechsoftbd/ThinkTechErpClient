import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { firstParam } from "@/core/ui/pagination";
import { formatQuantity } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManagePurchase } from "../access";
import { saveInvoiceAction } from "../actions/invoices";
import { saveOrderAction } from "../actions/orders";
import { createPaymentAction } from "../actions/payments";
import { saveReceiptAction } from "../actions/receipts";
import { saveReturnAction } from "../actions/returns";
import { purchaseApi } from "../api";
import { editorLinesFrom, loadLineProducts, loadPurchaseEditorOptions } from "../editor-data";
import { ON_THE_SPOT_METHODS, purchaseLabel, type OpenPurchaseInvoice, type PurchaseLine } from "../types";
import { PaymentForm } from "./payment-form";
import { PurchaseDocumentEditor, type EditorLine, type PurchaseEditorInitial } from "./purchase-document-editor";

// The New screens of the purchase documents, shared by their full pages (/purchase/<list>/new) and the
// popups that open over the lists (@modal/(.)new). In a popup, `returnTo` (the list) is where saving lands.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type ScreenProps = { searchParams: SearchParams; returnTo?: string };

// ---- Purchase invoice

/** ?orderId= buys against an approved order (stock comes in now); ?receiptId= bills a goods receipt. */
export async function NewPurchaseInvoiceScreen({ searchParams, returnTo }: ScreenProps) {
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
      returnTo={returnTo}
    />
  );
}

// ---- Purchase order

export async function NewPurchaseOrderScreen({ returnTo }: { returnTo?: string }) {
  const [session, options] = await Promise.all([requireSession(), loadPurchaseEditorOptions()]);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;

  return (
    <PurchaseDocumentEditor
      mode="order"
      action={saveOrderAction.bind(null, null)}
      options={options.data}
      canPost={canManagePurchase(session)}
      postLabel="Save & approve"
      cancelHref="/purchase/orders"
      returnTo={returnTo}
    />
  );
}

// ---- Goods receipt

/** ?orderId= receives against an approved order: its open quantities, linked to the order lines. */
export async function NewGoodsReceiptScreen({ searchParams, returnTo }: ScreenProps) {
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
      returnTo={returnTo}
    />
  );
}

// ---- Purchase return

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
export async function NewPurchaseReturnScreen({ searchParams, returnTo }: ScreenProps) {
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
      returnTo={returnTo}
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

// ---- Supplier payment

/** ?supplierId= preselects the supplier (and loads their open invoices); ?invoiceId= settles that invoice. */
export async function NewSupplierPaymentScreen({ searchParams, returnTo }: ScreenProps) {
  const query = await searchParams;
  const supplierId = parseIdParam(firstParam(query.supplierId) ?? "");
  const invoiceId = parseIdParam(firstParam(query.invoiceId) ?? "");
  const [session, options, openInvoices] = await Promise.all([
    requireSession(),
    loadPurchaseEditorOptions(),
    supplierId ? tryApi(() => purchaseApi.suppliers.openInvoices(supplierId)) : Promise.resolve(null),
  ]);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  if (!canManagePurchase(session)) {
    return (
      <Alert tone="warning" title="You can't record payments">
        <p>Recording supplier payments needs the purchase manage permission.</p>
        <LinkButton href="/purchase/payments" variant="outline" size="sm" className="mt-3">
          Back to payments
        </LinkButton>
      </Alert>
    );
  }

  const known = supplierId !== null && options.data.suppliers.some((s) => s.id === supplierId);
  const invoices: OpenPurchaseInvoice[] = known && openInvoices?.ok ? openInvoices.data : [];

  return (
    <PaymentForm
      action={createPaymentAction}
      suppliers={options.data.suppliers}
      currencies={options.data.currencies}
      baseCurrencyId={options.data.baseCurrencyId}
      initial={{
        supplierId: known ? supplierId : null,
        invoices,
        invoicesError: known && openInvoices && !openInvoices.ok ? openInvoices.error.message : undefined,
        invoiceId: invoiceId && invoices.some((i) => i.id === invoiceId) ? invoiceId : null,
      }}
      cancelHref={invoiceId ? `/purchase/invoices/${invoiceId}` : "/purchase/payments"}
      returnTo={returnTo}
    />
  );
}
