import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { canManageSales } from "@/modules/sales/access";
import { deleteReturnAction, saveReturnAction } from "@/modules/sales/actions/returns";
import { salesApi } from "@/modules/sales/api";
import { ReturnEditor } from "@/modules/sales/components/return-editor";
import { loadReturnEditorData } from "@/modules/sales/return-data";

export const metadata: Metadata = { title: "Edit Sales Return" };

type Props = PageProps<"/sales/returns/[returnId]/edit">;

export default function EditSalesReturnPage({ params, searchParams }: Props) {
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
  const [session, result] = await Promise.all([requireSession(), tryApi(() => salesApi.returns.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }
  const item = result.data;
  const viewHref = `/sales/returns/${id}`;
  if (item.status !== "Draft") redirect(viewHref);

  const header = (
    <PageHeader
      title={`Edit ${item.returnNo}`}
      description="A draft: nothing has moved yet. Post it to put resellable goods back into stock and refund or deduct the amount."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Inventory", href: "/inventory" },
        { label: "Sales Returns", href: "/sales/returns" },
        { label: item.returnNo, href: viewHref },
        { label: "Edit" },
      ]}
    />
  );

  const saleId = item.salesInvoiceId;
  const sale = saleId ? await tryApi(() => salesApi.invoices.get(saleId)) : null;
  if (sale && !sale.ok) {
    return (
      <>
        {header}
        <Card>
          <ApiErrorState error={sale.error} notFoundHint="The sale this return was made against doesn't exist any more." />
        </Card>
      </>
    );
  }
  if (!sale || sale.data.status !== "Posted") {
    return (
      <>
        {header}
        <Alert tone="error" title="This draft can't be edited">
          <p>
            {sale
              ? `Sale ${sale.data.invoiceNo} isn't completed any more, so nothing can be returned against it. Delete this draft.`
              : "The draft isn't linked to a sale. Delete it and start the return from the sale."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <LinkButton href={viewHref} variant="outline" size="sm">
              Back to the return
            </LinkButton>
            {canManageSales(session) && (
              <DocumentActionButton action={deleteReturnAction.bind(null, id)} variant="danger" confirmMessage="Delete this draft return?">
                Delete draft
              </DocumentActionButton>
            )}
          </div>
        </Alert>
      </>
    );
  }

  const data = await loadReturnEditorData(sale.data);
  if (!data.ok) {
    return (
      <>
        {header}
        <Card>
          <ApiErrorState error={data.error} />
        </Card>
      </>
    );
  }

  return (
    <>
      {header}
      {notice && (
        <Alert tone="error" className="mb-6">
          {notice}
        </Alert>
      )}
      <ReturnEditor
        sale={sale.data}
        warehouses={data.data.warehouses}
        history={data.data.history}
        canPost={canManageSales(session)}
        action={saveReturnAction.bind(null, id)}
        cancelHref={viewHref}
        initial={{
          date: item.returnDate,
          warehouseId: item.warehouseId,
          reason: item.reason,
          settlementType: item.settlementType,
          refundMethod: item.refundMethod,
          refundProvider: item.refundProvider,
          refundReferenceNo: item.refundReferenceNo,
          remarks: item.remarks,
          lines: item.lines
            .filter((line) => line.salesInvoiceLineId !== null)
            .map((line) => ({
              salesInvoiceLineId: line.salesInvoiceLineId ?? 0,
              quantity: line.quantity,
              isRestockable: line.isRestockable,
              serialNos: line.serialNos,
              remarks: line.remarks,
            })),
        }}
      />
    </>
  );
}
