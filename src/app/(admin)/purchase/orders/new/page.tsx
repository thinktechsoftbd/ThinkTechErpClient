import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewPurchaseOrderScreen } from "@/modules/purchase/components/new-document-screens";

export const metadata: Metadata = { title: "New Purchase Order" };

/** The full page, for a refresh or a link; from the list it opens in a popup (@modal/(.)new). */
export default function NewPurchaseOrderPage() {
  return (
    <>
      <PageHeader
        title="New purchase order"
        description="What you are ordering from the supplier. Approve it to send it; nothing moves until the goods are received."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Orders", href: "/purchase/orders" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewPurchaseOrderScreen />
      </Suspense>
    </>
  );
}
