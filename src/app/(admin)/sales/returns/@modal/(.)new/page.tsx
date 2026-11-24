import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewReturnScreen } from "@/modules/sales/components/new-return-screen";

/** New sales return in a popup over the list: find the sale, then the return; saving returns to the list. */
export default function NewSalesReturnModal({ searchParams }: PageProps<"/sales/returns/new">) {
  return (
    <RouteModal
      title="New sales return"
      description="Goods a customer brings back from a completed sale. Posting puts resellable goods back into stock and refunds or deducts the money."
    >
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <NewReturnScreen searchParams={searchParams} returnTo="/sales/returns" />
      </Suspense>
    </RouteModal>
  );
}
