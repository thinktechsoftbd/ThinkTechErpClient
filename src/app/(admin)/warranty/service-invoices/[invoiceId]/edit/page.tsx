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
import { canManageSales } from "@/modules/sales/access";
import { canManageServiceInvoices } from "@/modules/warranty/access";
import { saveServiceInvoiceAction } from "@/modules/warranty/actions/service-invoices";
import { ServiceInvoiceEditor } from "@/modules/warranty/components/service-invoice-editor";
import { serviceInvoiceApi } from "@/modules/warranty/service-invoice-api";
import { loadServiceInvoiceEditorInitial, loadServiceInvoiceEditorOptions } from "@/modules/warranty/service-invoice-editor-data";

export const metadata: Metadata = { title: "Edit Service Invoice" };

type Props = PageProps<"/warranty/service-invoices/[invoiceId]/edit">;

export default function EditServiceInvoicePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditServiceInvoice params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditServiceInvoice({ params, searchParams }: Props) {
  const id = parseIdParam((await params).invoiceId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  const [session, invoice, options] = await Promise.all([
    requireSession(),
    tryApi(() => serviceInvoiceApi.get(id)),
    loadServiceInvoiceEditorOptions(),
  ]);
  if (!invoice.ok) {
    if (invoice.error.status === 404) notFound();
    return <Card><ApiErrorState error={invoice.error} /></Card>;
  }
  // Only a draft can be changed, and only with SERVICE_INVOICE.M.
  if (invoice.data.status !== "Draft" || !canManageServiceInvoices(session)) redirect(`/warranty/service-invoices/${id}`);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  const initial = await loadServiceInvoiceEditorInitial(invoice.data);
  if (!initial.ok) return <Card><ApiErrorState error={initial.error} /></Card>;

  return (
    <>
      <PageHeader
        title={`Edit ${invoice.data.invoiceNo}`}
        description="A draft service invoice: change the work, the parts used or the payment."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Warranty", href: "/warranty" },
          { label: "Service Invoices", href: "/warranty/service-invoices" },
          { label: invoice.data.invoiceNo, href: `/warranty/service-invoices/${id}` },
          { label: "Edit" },
        ]}
      />
      {notice && (
        <Alert tone="error" className="mb-6">
          {notice}
        </Alert>
      )}
      <ServiceInvoiceEditor
        action={saveServiceInvoiceAction.bind(null, id)}
        options={options.data}
        initial={initial.data}
        canAddCustomer={canManageSales(session)}
        cancelHref={`/warranty/service-invoices/${id}`}
      />
    </>
  );
}
