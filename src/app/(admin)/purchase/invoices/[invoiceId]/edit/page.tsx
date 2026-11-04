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
import { saveInvoiceAction } from "@/modules/purchase/actions/invoices";
import { purchaseApi } from "@/modules/purchase/api";
import { PurchaseDocumentEditor } from "@/modules/purchase/components/purchase-document-editor";
import { editorChargesFrom, editorLinesFrom, loadLineProducts, loadPurchaseEditorOptions } from "@/modules/purchase/editor-data";

export const metadata: Metadata = { title: "Edit Purchase" };

type Props = PageProps<"/purchase/invoices/[invoiceId]/edit">;

export default function EditPurchaseInvoicePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditInvoice params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditInvoice({ params, searchParams }: Props) {
  const id = parseIdParam((await params).invoiceId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  const [session, invoice, options] = await Promise.all([
    requireSession(),
    tryApi(() => purchaseApi.invoices.get(id)),
    loadPurchaseEditorOptions(),
  ]);
  if (!invoice.ok) {
    if (invoice.error.status === 404) notFound();
    return <Card><ApiErrorState error={invoice.error} /></Card>;
  }
  if (invoice.data.status !== "Draft") redirect(`/purchase/invoices/${id}`);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  const products = await loadLineProducts(invoice.data.lines);
  if (!products.ok) return <Card><ApiErrorState error={products.error} /></Card>;

  const data = invoice.data;
  return (
    <>
      <PageHeader
        title={`Edit ${data.invoiceNo}`}
        description="A draft: nothing has moved yet. Post it to bring the stock in and record the dues."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Invoices", href: "/purchase/invoices" },
          { label: data.invoiceNo, href: `/purchase/invoices/${id}` },
          { label: "Edit" },
        ]}
      />
      {notice && (
        <Alert tone="error" className="mb-6">
          {notice}
        </Alert>
      )}
      <PurchaseDocumentEditor
        mode="invoice"
        action={saveInvoiceAction.bind(null, id)}
        options={options.data}
        canPost={canManagePurchase(session)}
        cancelHref={`/purchase/invoices/${id}`}
        initial={{
          date: data.invoiceDate,
          purchaseType: data.purchaseType,
          supplierId: data.supplierId,
          // A supplier not on file shows by name; the placeholder the API saves for no name shows an empty box.
          supplierName: data.supplierId || data.supplierName === "Walk-in supplier" ? "" : (data.supplierName ?? ""),
          supplierMobile: data.supplierMobile ?? "",
          receivesStock: data.receivesStock,
          warehouseId: data.warehouseId,
          purchaseOrderId: data.purchaseOrderId,
          purchaseOrderNo: data.purchaseOrderNo,
          dueDate: data.dueDate ?? "",
          supplierInvoiceNo: data.supplierInvoiceNo ?? "",
          supplierInvoiceDate: data.supplierInvoiceDate ?? "",
          taxInvoiceNo: data.taxInvoiceNo ?? "",
          currencyId: data.currencyLookupDataId,
          exchangeRate: String(data.exchangeRate),
          roundOff: String(data.roundOffAmount),
          paidAmount: String(data.purchaseType === "Credit" ? data.paidAmount : 0),
          paymentMethod: data.paymentMethod ?? "Cash",
          paymentProvider: data.paymentProvider ?? "",
          paymentReferenceNo: data.paymentReferenceNo ?? "",
          paymentSourceDId: data.invPaymentSourceDId,
          paymentSourceId: data.paymentSourceId,
          paymentSourceName: data.paymentSourceName ?? "",
          remarks: data.remarks ?? "",
          lines: editorLinesFrom(data.lines, products.data),
          charges: editorChargesFrom(data.charges),
        }}
      />
    </>
  );
}
