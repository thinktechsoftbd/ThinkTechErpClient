import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewAdjustment } from "@/modules/inventory/components/documents/stock-document-screens";

/** New opening stock in a popup over the opening stock list; saving returns to the list. */
export default function NewOpeningStockModal() {
  return (
    <RouteModal
      title="New opening stock"
      description="Enter what is in the warehouse today, in bags, boxes, kg or pieces, with what it cost you."
    >
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <NewAdjustment kind="opening" returnTo="/inventory/opening-stock" />
      </Suspense>
    </RouteModal>
  );
}
