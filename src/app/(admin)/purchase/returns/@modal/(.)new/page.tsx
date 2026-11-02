import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewPurchaseReturnScreen } from "@/modules/purchase/components/new-document-screens";

/** New purchase return in a popup over the list; saving returns to the list. */
export default function NewPurchaseReturnsModal({ searchParams }: PageProps<"/purchase/returns/new">) {
  return (
    <RouteModal title="New purchase return" description="Goods going back to the supplier. Posting takes the stock out and deducts from the dues, or records the refund.">
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <NewPurchaseReturnScreen searchParams={searchParams} returnTo="/purchase/returns" />
      </Suspense>
    </RouteModal>
  );
}
