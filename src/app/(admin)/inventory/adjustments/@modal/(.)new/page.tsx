import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewAdjustment } from "@/modules/inventory/components/documents/stock-document-screens";

/** New stock adjustment in a popup over the adjustments list; saving returns to the list. */
export default function NewAdjustmentModal() {
  return (
    <RouteModal
      title="New stock adjustment"
      description="Remove stock that is damaged, expired or lost, or add stock that was found."
    >
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <NewAdjustment kind="adjustment" returnTo="/inventory/adjustments" />
      </Suspense>
    </RouteModal>
  );
}
