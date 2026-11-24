import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewServiceInvoiceScreen } from "@/modules/warranty/components/new-service-invoice-screen";

/** New service invoice in a popup over the list; saving returns to the list. */
export default function NewServiceInvoiceModal() {
  return (
    <RouteModal title="New service invoice" description="Note the work, enter the service amount and any parts used, and choose cash or credit.">
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <NewServiceInvoiceScreen returnTo="/warranty/service-invoices" />
      </Suspense>
    </RouteModal>
  );
}
