import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewSaleScreen } from "@/modules/sales/components/new-sale-screen";

export const metadata: Metadata = { title: "New Sale" };

/** The full page, for a refresh or a link; from the list it opens in a popup (@modal/(.)new). */
export default function NewSalePage() {
  return (
    <>
      <PageHeader
        title="New sale"
        description="Scan or search the items, choose cash or credit, and complete the sale."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inventory", href: "/inventory" },
          { label: "Sales", href: "/sales/invoices" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewSaleScreen />
      </Suspense>
    </>
  );
}
