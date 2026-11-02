import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewTransfer } from "@/modules/inventory/components/documents/stock-document-screens";

/** New stock transfer in a popup over the transfers list; saving returns to the list. */
export default function NewTransferModal() {
  return (
    <RouteModal title="New transfer" description="Send stock from one warehouse to another, e.g. from the godown to the shop.">
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <NewTransfer returnTo="/inventory/transfers" />
      </Suspense>
    </RouteModal>
  );
}
