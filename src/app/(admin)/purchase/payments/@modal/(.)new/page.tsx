import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewSupplierPaymentScreen } from "@/modules/purchase/components/new-document-screens";

/** New supplier payment in a popup over the list; saving returns to the list. */
export default function NewSupplierPaymentsModal({ searchParams }: PageProps<"/purchase/payments/new">) {
  return (
    <RouteModal title="New supplier payment" description="Pay a supplier and settle their open invoices with it.">
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <NewSupplierPaymentScreen searchParams={searchParams} returnTo="/purchase/payments" />
      </Suspense>
    </RouteModal>
  );
}
