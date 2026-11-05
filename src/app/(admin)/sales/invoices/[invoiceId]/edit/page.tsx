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
import { MapLedgerHeadsButton } from "@/modules/accounting/components/map-ledger-heads-button";
import { loadUnmappedHeads } from "@/modules/accounting/voucher-mappings";
import { canManageSales } from "@/modules/sales/access";
import { saveSaleAction } from "@/modules/sales/actions/invoices";
import { salesApi } from "@/modules/sales/api";
import { SalesEditor } from "@/modules/sales/components/sales-editor";
import { loadSalesEditorInitial, loadSalesEditorOptions } from "@/modules/sales/editor-data";

export const metadata: Metadata = { title: "Edit Sale" };

type Props = PageProps<"/sales/invoices/[invoiceId]/edit">;

export default function EditSalePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditSale params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditSale({ params, searchParams }: Props) {
  const id = parseIdParam((await params).invoiceId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  const [session, invoice, options] = await Promise.all([requireSession(), tryApi(() => salesApi.invoices.get(id)), loadSalesEditorOptions()]);
  if (!invoice.ok) {
    if (invoice.error.status === 404) notFound();
    return <Card><ApiErrorState error={invoice.error} /></Card>;
  }
  if (invoice.data.status !== "Draft") redirect(`/sales/invoices/${id}`);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  // A failed finalize: the categories (and the customer of an unpaid part) still without a ledger head get a
  // Map button beside the reason.
  const owedByCustomer = invoice.data.customerId !== null && invoice.data.totalAmount > invoice.data.paidAmount;
  const [initial, unmapped] = await Promise.all([
    loadSalesEditorInitial(invoice.data),
    notice
      ? loadUnmappedHeads(
          invoice.data.lines.map((line) => line.productId),
          owedByCustomer ? { kind: "customer", id: invoice.data.customerId! } : null,
        )
      : Promise.resolve([]),
  ]);
  if (!initial.ok) return <Card><ApiErrorState error={initial.error} /></Card>;

  const canManage = canManageSales(session);
  return (
    <>
      <PageHeader
        title={`Edit ${invoice.data.invoiceNo}`}
        description="A draft: no stock has moved yet. Complete it to take the stock out and record the payment or due."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inventory", href: "/inventory" },
          { label: "Sales", href: "/sales/invoices" },
          { label: invoice.data.invoiceNo, href: `/sales/invoices/${id}` },
          { label: "Edit" },
        ]}
      />
      {notice && (
        <Alert tone="error" className="mb-6">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>{notice}</span>
            {unmapped.length > 0 && <MapLedgerHeadsButton items={unmapped} />}
          </span>
        </Alert>
      )}
      <SalesEditor
        action={saveSaleAction.bind(null, id)}
        options={options.data}
        initial={initial.data}
        canPost={canManage}
        canAddCustomer={canManage}
        cancelHref={`/sales/invoices/${id}`}
      />
    </>
  );
}
