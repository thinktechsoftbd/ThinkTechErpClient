import { notFound, redirect } from "next/navigation";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { PageHeader } from "@/core/ui/page-header";
import { canManageSales } from "@/modules/sales/access";
import { canManageServiceInvoices } from "../access";
import { saveServiceInvoiceAction } from "../actions/service-invoices";
import { serviceInvoiceApi } from "../service-invoice-api";
import { loadServiceInvoiceEditorInitial, loadServiceInvoiceEditorOptions } from "../service-invoice-editor-data";
import { ServiceInvoiceEditor } from "./service-invoice-editor";

/**
 * A draft service invoice's editor: on its own page (with the page header), or with `returnTo` (the list) in the
 * popup over the list, where saving returns to the list and Cancel closes the popup.
 */
export async function EditServiceInvoiceScreen({ id, notice, returnTo }: { id: number; notice?: string; returnTo?: string }) {
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
      {!returnTo && (
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
      )}
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
        returnTo={returnTo}
      />
    </>
  );
}
