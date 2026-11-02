import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewSaleScreen } from "@/modules/sales/components/new-sale-screen";

/** New sale in a popup over the sales list; completing or saving returns to the list. */
export default function NewSaleModal() {
  return (
    <RouteModal title="New sale" description="Scan or search the items, choose cash or credit, and complete the sale.">
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <NewSaleScreen returnTo="/sales/invoices" />
      </Suspense>
    </RouteModal>
  );
}
