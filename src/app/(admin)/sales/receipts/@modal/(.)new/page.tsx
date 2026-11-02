import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewReceiptScreen } from "@/modules/sales/components/receipts/new-receipt-screen";

/** New money receipt in a popup over the receipts list; saving returns to the list. */
export default function NewReceiptModal({ searchParams }: PageProps<"/sales/receipts/new">) {
  return (
    <RouteModal title="New money receipt" description="Collect a customer's dues and settle their open invoices with it.">
      <Suspense fallback={<TableSkeleton rows={6} columns={4} />}>
        <NewReceiptScreen searchParams={searchParams} returnTo="/sales/receipts" />
      </Suspense>
    </RouteModal>
  );
}
