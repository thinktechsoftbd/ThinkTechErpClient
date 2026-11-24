import { ShieldAlert } from "lucide-react";
import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { canManageSales } from "@/modules/sales/access";
import { canManageServiceInvoices } from "../access";
import { saveServiceInvoiceAction } from "../actions/service-invoices";
import { loadServiceInvoiceEditorOptions } from "../service-invoice-editor-data";
import { SERVICE_INVOICE_MANAGE_PERMISSION } from "../service-invoice-types";
import { ServiceInvoiceEditor } from "./service-invoice-editor";

/** A new service invoice, on its page or (with `returnTo`, the list) in the popup over the list. */
export async function NewServiceInvoiceScreen({ returnTo }: { returnTo?: string }) {
  const session = await requireSession();
  if (!canManageServiceInvoices(session))
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="You can view service invoices, but not add them"
          description={`Adding one needs the ${SERVICE_INVOICE_MANAGE_PERMISSION} permission.`}
          action={<LinkButton href="/warranty/service-invoices" variant="outline">Back to the list</LinkButton>}
        />
      </Card>
    );

  const options = await loadServiceInvoiceEditorOptions();
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  return (
    <ServiceInvoiceEditor
      action={saveServiceInvoiceAction.bind(null, null)}
      options={options.data}
      // Adding a customer on the spot goes through the Sales API (SALES.M).
      canAddCustomer={canManageSales(session)}
      cancelHref="/warranty/service-invoices"
      returnTo={returnTo}
    />
  );
}
