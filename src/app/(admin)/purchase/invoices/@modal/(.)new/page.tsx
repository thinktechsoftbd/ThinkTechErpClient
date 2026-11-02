import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewPurchaseInvoiceScreen } from "@/modules/purchase/components/new-document-screens";

/** New purchase in a popup over the list; saving returns to the list. */
export default function NewPurchaseInvoicesModal({ searchParams }: PageProps<"/purchase/invoices/new">) {
  return (
    <RouteModal title="New purchase" description="Enter the supplier's bill: cash or credit. Posting brings the stock in.">
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <NewPurchaseInvoiceScreen searchParams={searchParams} returnTo="/purchase/invoices" />
      </Suspense>
    </RouteModal>
  );
}
