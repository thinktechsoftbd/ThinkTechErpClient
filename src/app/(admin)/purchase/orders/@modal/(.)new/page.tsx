import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewPurchaseOrderScreen } from "@/modules/purchase/components/new-document-screens";

/** New purchase order in a popup over the list; saving returns to the list. */
export default function NewPurchaseOrdersModal() {
  return (
    <RouteModal title="New purchase order" description="What you are ordering from the supplier. Approve it to send it; nothing moves until the goods are received.">
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <NewPurchaseOrderScreen returnTo="/purchase/orders" />
      </Suspense>
    </RouteModal>
  );
}
