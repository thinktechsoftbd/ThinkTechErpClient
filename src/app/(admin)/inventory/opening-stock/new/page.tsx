import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewAdjustment, inventoryCrumbs } from "@/modules/inventory/components/documents/stock-document-screens";

export const metadata: Metadata = { title: "New Opening Stock" };

export default function NewOpeningStockPage() {
  return (
    <>
      <PageHeader
        title="New opening stock"
        description="Enter what is in the warehouse today, in bags, boxes, kg or pieces, with what it cost you."
        breadcrumbs={inventoryCrumbs({ label: "Opening Stock", href: "/inventory/opening-stock" }, { label: "New" })}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewAdjustment kind="opening" />
      </Suspense>
    </>
  );
}
